import mongoose from "mongoose";
import { StockLedger, StockBalance } from "../models/inventory.model.js";
import Request from "../models/request.model.js";
import Medicine from "../models/medicine.model.js";
import Branch from "../models/branch.model.js";
import Store from "../models/store.model.js";
import errorHandler from "../utils/error.js";
import { postLedgerEntry, safeDecrement } from "../services/stock.service.js";
import { transferStock } from "../services/transfer.service.js";

export const postLedger = async (req, res, next) => {
  const payload = Array.isArray(req.body) ? req.body : [req.body];
  if (!payload.length) {
    return next(errorHandler(400, "Empty payload"));
  }
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const results = [];
    for (const line of payload) {
      if (
        !line.medicineId ||
        !line.batchId ||
        !line.locationId ||
        !line.quantity ||
        !line.transactionType
      ) {
        throw Object.assign(new Error("Missing required fields"), { statusCode: 400 });
      }
      const [med, loc] = await Promise.all([
        Medicine.findById(line.medicineId).session(session),
        Branch.findById(line.locationId).session(session),
      ]);
      if (!med || !loc) {
        throw Object.assign(new Error("Invalid medicine or location"), { statusCode: 400 });
      }
      if (!line.allowNegative) {
        const bal = await StockBalance.findOne({
          medicineId: line.medicineId,
          batchId: line.batchId,
          locationId: line.locationId,
        }).session(session);
        const current = bal?.onHandQty || 0;
        if (current + line.quantity < 0) {
          throw Object.assign(new Error("Insufficient stock"), { statusCode: 409 });
        }
      }
      if (line.idempotencyKey) {
        const exists = await StockLedger.findOne({ idempotencyKey: line.idempotencyKey }).session(session);
        if (exists) {
          results.push(exists);
          continue;
        }
      }
      const saved = await postLedgerEntry(
        {
          medicineId: line.medicineId,
          batchId: line.batchId,
          locationId: line.locationId,
          quantity: line.quantity,
          transactionType: line.transactionType,
          sourceDocType: line.sourceDocType,
          sourceDocId: line.sourceDocId,
          unitCost: line.unitCost,
          unitPrice: line.unitPrice,
          correlationId: line.correlationId,
          idempotencyKey: line.idempotencyKey,
          createdByUserId: req.user?.id,
          expiryDate: line.expiryDate,
          notes: line.notes,
        },
        session
      );
      results.push(saved);
    }
    await session.commitTransaction();
    res.status(201).json({ success: true, count: results.length, entries: results });
  } catch (err) {
    await session.abortTransaction();
    next(err.statusCode ? err : errorHandler(500, err.message));
  } finally {
    session.endSession();
  }
};

export const getStock = async (req, res, next) => {
  try {
    let { locationId, medicineId, includeZero } = req.query;
    // Support friendly alias 'main' to mean the first / central store
    if (locationId === "main") {
      const store = await Store.findOne().select("_id").lean();
      if (!store) {
        return res
          .status(400)
          .json({ success: false, message: "No central store configured" });
      }
      locationId = store._id.toString();
    }
    const filter = {};
    if (locationId) filter.locationId = locationId;
    if (medicineId) filter.medicineId = medicineId;
    if (!includeZero) filter.onHandQty = { $gt: 0 };

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [rawBalances, totalCount] = await Promise.all([
      StockBalance.find(filter)
        .populate(
          "medicineId",
          "medicineName brand category purchasePrice sellingPrice supplier batchNumber"
        )
        .populate("locationId", "name")
        .skip(skip)
        .limit(limit)
        .lean(),
      StockBalance.countDocuments(filter),
    ]);
    let balances = rawBalances;

    // Fallback: if central store queried for specific medicine and no balance doc yet, derive from ledger net
    if (
      balances.length === 0 &&
      locationId &&
      medicineId &&
      mongoose.Types.ObjectId.isValid(locationId) &&
      mongoose.Types.ObjectId.isValid(medicineId)
    ) {
      const net = await StockLedger.aggregate([
        {
          $match: {
            locationId: new mongoose.Types.ObjectId(locationId),
            medicineId: new mongoose.Types.ObjectId(medicineId),
          },
        },
        { $group: { _id: "$medicineId", qty: { $sum: "$quantity" } } },
      ]);
      if (net.length && net[0].qty > 0) {
        const med = await Medicine.findById(medicineId).lean();
        const loc = await Store.findById(locationId).lean();
        if (med && loc) {
          balances.push({
            _id: `${medicineId}-${locationId}-synthetic`,
            medicineId: med,
            locationId: { _id: loc._id, name: loc.name },
            onHandQty: net[0].qty,
            synthetic: true,
          });
        }
      } else {
        // No StockBalance or StockLedger entry for this location
        const med = await Medicine.findById(medicineId).lean();
        const loc = await Store.findById(locationId).lean();
        if (med && loc) {
          balances.push({
            _id: `${medicineId}-${locationId}-empty`,
            medicineId: med,
            locationId: { _id: loc._id, name: loc.name },
            onHandQty: 0,
          });
        }
      }
    }
    res.json({ success: true, page, limit, totalCount, count: balances.length, balances });
  } catch (err) {
    next(err);
  }
};

export const getLedgerHistory = async (req, res, next) => {
  try {
    const { medicineId, locationId, limit = 100 } = req.query;
    const filter = {};
    const isSuper = req.user?.role === "super_admin";
    // Base filters from query
    if (medicineId) filter.medicineId = medicineId;
    if (locationId) filter.locationId = locationId;

    // Resolve allowed scopes when a pharmacy context exists
    let allowedLocs = [];
    let allowedMeds = [];
    if (req.pharmacyId) {
      try {
        const [branches, stores, meds] = await Promise.all([
          Branch.find({ pharmacy: req.pharmacyId }).select("_id").lean(),
          Store.find({ pharmacy: req.pharmacyId }).select("_id").lean(),
          Medicine.find({ pharmacy: req.pharmacyId }).select("_id").lean(),
        ]);
        allowedLocs = [
          ...branches.map((b) => b._id),
          ...stores.map((s) => s._id),
        ];
        allowedMeds = meds.map((m) => m._id);
      } catch {}
    }

    if (!isSuper) {
      // Non-super users MUST be scoped by their pharmacy; forbid cross-tenant filters
      if (!req.pharmacyId) {
        return res
          .status(403)
          .json({ success: false, message: "Pharmacy context required" });
      }
      // If client supplied explicit ids, validate they belong to allowed sets
      if (
        locationId &&
        !allowedLocs.some((id) => id.toString() === String(locationId))
      ) {
        return res
          .status(403)
          .json({ success: false, message: "Forbidden location" });
      }
      if (
        medicineId &&
        !allowedMeds.some((id) => id.toString() === String(medicineId))
      ) {
        return res
          .status(403)
          .json({ success: false, message: "Forbidden medicine" });
      }
      // Always enforce scope for non-super
      const scopeOr = [];
      if (allowedLocs.length)
        scopeOr.push({ locationId: { $in: allowedLocs } });
      if (allowedMeds.length)
        scopeOr.push({ medicineId: { $in: allowedMeds } });
      if (!scopeOr.length) {
        return res.json({ success: true, count: 0, entries: [] });
      }
      // Combine base filters (if provided) with scope using $and
      const scopedFilter = { $and: [{ $or: scopeOr }] };
      if (filter.locationId) scopedFilter.$and.push({ locationId });
      if (filter.medicineId) scopedFilter.$and.push({ medicineId });
      // Replace filter with scopedFilter
      Object.keys(filter).forEach((k) => delete filter[k]);
      Object.assign(filter, scopedFilter);
    } else {
      // Super admin: if pharmacyId provided, apply scope; else show all
      if (req.pharmacyId) {
        const scopeOr = [];
        if (allowedLocs.length)
          scopeOr.push({ locationId: { $in: allowedLocs } });
        if (allowedMeds.length)
          scopeOr.push({ medicineId: { $in: allowedMeds } });
        if (!scopeOr.length) {
          return res.json({ success: true, count: 0, entries: [] });
        }
        // Merge with any explicit filters via $and
        const scoped = { $and: [{ $or: scopeOr }] };
        if (filter.locationId) scoped.$and.push({ locationId });
        if (filter.medicineId) scoped.$and.push({ medicineId });
        Object.keys(filter).forEach((k) => delete filter[k]);
        Object.assign(filter, scoped);
      }
    }
    let entries = await StockLedger.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("medicineId", "medicineName brand batchNumber")
      // locationId historically points to Branch OR Store; schema uses Branch ref only so populate may miss Store docs
      .populate("locationId", "name")
      .populate("createdByUserId", "username role")
      .lean();

    // Fallback resolve missing medicine docs (in case populate failed due to historical data)
    const missingMedIds = entries
      .filter((e) => !e.medicineId || !e.medicineId.medicineName)
      .map((e) => e.medicineId)
      .filter((id) => id && typeof id === "object" && id.toString);
    if (missingMedIds.length) {
      const meds = await Medicine.find({ _id: { $in: missingMedIds } })
        .select("medicineName brand batchNumber")
        .lean();
      const medMap = new Map(meds.map((m) => [m._id.toString(), m]));
      entries.forEach((e) => {
        if (!e.medicineId || !e.medicineId.medicineName) {
          const m = medMap.get(e.medicineId?.toString());
          if (m) e.medicineId = m; // normalize
        }
      });
    }

    // Resolve Store names for locationIds that failed populate (because ref points to Branch only)
    const unresolvedLocationIds = entries
      .filter((e) => !e.locationId || !e.locationId.name)
      .map((e) => e.locationId)
      .filter((id) => id && typeof id === "object" && id.toString);
    if (unresolvedLocationIds.length) {
      const stores = await Store.find({ _id: { $in: unresolvedLocationIds } })
        .select("name")
        .lean();
      const storeMap = new Map(stores.map((s) => [s._id.toString(), s.name]));
      entries = entries.map((e) => {
        if (e.locationId && !e.locationId.name) {
          const name = storeMap.get(e.locationId.toString());
          if (name) {
            // add a lightweight wrapper to align with populated object shape
            e.locationId = { _id: e.locationId, name, kind: "Store" };
          }
        } else if (e.locationId?.name) {
          e.locationId.kind = "Branch";
        }
        return e;
      });
    }

    // Convenience flattened properties for simpler frontend rendering
    entries = entries.map((e) => ({
      ...e,
      medicineName: e.medicineId?.medicineName,
      locationName: e.locationId?.name,
    }));

    res.json({ success: true, count: entries.length, entries });
  } catch (err) {
    next(err);
  }
};

export const directTransfer = async (req, res, next) => {
  try {
    const { storeId, branchId, medicineId, quantity } = req.body;
    if (!storeId || !branchId || !medicineId || !quantity) {
      return next(errorHandler(400, "storeId, branchId, medicineId, quantity required"));
    }
    const qty = Math.abs(Number(quantity));
    if (qty <= 0) {
      return next(errorHandler(400, "quantity must be > 0"));
    }
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const correlationId = await transferStock({
        fromLocationId: storeId,
        toLocationId: branchId,
        medicineId,
        quantity: qty,
        sourceDocType: "DIRECT",
        correlationId: `DIRECT-${Date.now()}`,
        userId: req.user?.id,
        session,
      });
      await session.commitTransaction();
      res.json({ success: true, message: "Transferred", correlationId });
    } catch (txnErr) {
      await session.abortTransaction();
      throw txnErr;
    } finally {
      session.endSession();
    }
  } catch (err) {
    next(err.statusCode ? err : errorHandler(500, err.message));
  }
};

// One-time backfill: move legacy Medicine.quantity into StockBalance via GRN for a store
export const backfillMedicineQuantities = async (req, res, next) => {
  try {
    const { storeId } = req.body;
    if (!storeId)
      return res
        .status(400)
        .json({ success: false, message: "storeId required" });
    const store = await Store.findById(storeId);
    if (!store)
      return res
        .status(400)
        .json({ success: false, message: "Invalid storeId" });
    const meds = await Medicine.find({ isDeleted: false });
    let created = 0;
    for (const m of meds) {
      const qty = Number(m.quantity || 0);
      if (qty <= 0) continue;
      const exists = await StockBalance.findOne({
        medicineId: m._id,
        locationId: storeId,
      });
      if (exists && (exists.onHandQty || 0) > 0) continue; // skip if already backfilled
      const ledger = await StockLedger.create({
        medicineId: m._id,
        locationId: storeId,
        quantity: qty,
        transactionType: "GRN",
        sourceDocType: "BACKFILL",
        sourceDocId: `MED-${m._id}`,
        unitCost: m.purchasePrice,
        expiryDate: m.expiryDate,
      });
      await StockBalance.updateOne(
        { medicineId: m._id, locationId: storeId },
        {
          $inc: { onHandQty: qty },
          $set: { lastTxnAt: new Date(), lastTxnId: ledger._id },
        },
        { upsert: true }
      );
      created++;
    }
    res.json({ success: true, message: "Backfill complete", created });
  } catch (err) {
    next(err);
  }
};

// Create or update inventory for a location (via StockBalance/StockLedger)
export const upsertInventory = async (req, res, next) => {
  try {
    const { medicineId, locationType, locationId, quantity, batchNumber, expiryDate } = req.body;
    if (locationType !== "Store") {
      return next(errorHandler(400, "Direct stock entry allowed only at Store. Branches must request."));
    }
    if (!medicineId || !locationId || !quantity) {
      return next(errorHandler(400, "medicineId, locationId, quantity required"));
    }
    const qty = Math.abs(Number(quantity));
    if (qty <= 0) {
      return next(errorHandler(400, "quantity must be > 0"));
    }
    const ledger = await StockLedger.create({
      medicineId,
      locationId,
      quantity: qty,
      transactionType: "GRN",
      sourceDocType: "MANUAL",
      sourceDocId: `UPSERT-${Date.now()}`,
      createdByUserId: req.user?.id,
      expiryDate,
      notes: batchNumber ? `Batch: ${batchNumber}` : undefined,
    });
    await StockBalance.updateOne(
      { medicineId, locationId },
      { $inc: { onHandQty: qty }, $set: { lastTxnAt: new Date(), lastTxnId: ledger._id } },
      { upsert: true }
    );
    res.status(201).json({ success: true, message: "Stock recorded", ledger });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

// Get inventory for a location (via StockBalance)
export const getInventory = async (req, res, next) => {
  try {
    const { locationId } = req.query;
    let resolvedLocationId = locationId;
    if (resolvedLocationId) {
      const valid = mongoose.Types.ObjectId.isValid(resolvedLocationId);
      if (!valid) {
        if (resolvedLocationId === "main") {
          const store = await Store.findOne().select("_id").lean();
          if (!store) return next(errorHandler(400, "No store configured yet"));
          resolvedLocationId = store._id.toString();
        } else {
          return next(errorHandler(400, "Invalid locationId format"));
        }
      }
    }
    const filter = {};
    if (resolvedLocationId) filter.locationId = resolvedLocationId;
    const balances = await StockBalance.find(filter)
      .populate("medicineId", "medicineName brand category batchNumber expiryDate purchasePrice sellingPriceBase sellingPricePack")
      .lean();
    res.status(200).json({ success: true, inventory: balances });
  } catch (error) {
    next(errorHandler(500, error.message));
  }
};

// Transfer medicine from store to branch
export const transferMedicine = async (req, res, next) => {
  try {
    const { medicineId, fromLocationId, toLocationId, quantity } = req.body;
    if (!medicineId || !fromLocationId || !toLocationId || !quantity) {
      return next(errorHandler(400, "medicineId, fromLocationId, toLocationId, quantity required"));
    }
    const qty = Math.abs(Number(quantity));
    if (qty <= 0) {
      return next(errorHandler(400, "quantity must be > 0"));
    }
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const correlationId = await transferStock({
        fromLocationId,
        toLocationId,
        medicineId,
        quantity: qty,
        sourceDocType: "LEGACY_TRANSFER",
        correlationId: `LEGACY-XFER-${Date.now()}`,
        userId: req.user?.id,
        session,
      });
      await session.commitTransaction();
      res.status(200).json({ success: true, message: "Transfer successful (ledger)", correlationId });
    } catch (txnErr) {
      await session.abortTransaction();
      throw txnErr;
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error.statusCode ? error : errorHandler(500, error.message));
  }
};

// Branch requests medicine from central store
export const createRequest = async (req, res) => {
  try {
    const { medicineId, quantity, batchNumber, reason } = req.body;
    // Branch resolved from authenticated user (employee)
    let branchId = req.user?.branch || req.body.branchId; // fallback for legacy
    if (!branchId && req.user?.id) {
      // Attempt to load user and derive branch (including legacy array)
      try {
        const User = (await import("../models/user.model.js")).default;
        const uDoc = await User.findById(req.user.id).lean();
        if (uDoc) {
          if (uDoc.branch) branchId = uDoc.branch.toString();
          else if (Array.isArray(uDoc.branches) && uDoc.branches.length === 1) {
            branchId = uDoc.branches[0].toString();
          }
        }
      } catch {
        /* ignore */
      }
    }
    if (!medicineId) {
      return res
        .status(400)
        .json({ success: false, message: "medicineId required" });
    }
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message:
          "No branch associated with user session. Please re-login or contact admin to assign a branch.",
        code: "NO_BRANCH",
      });
    }
    if (!quantity) {
      return res
        .status(400)
        .json({ success: false, message: "quantity required" });
    }
    // Validate branch & medicine existence
    const [medicine, branch] = await Promise.all([
      Medicine.findById(medicineId).populate("supplier"),
      Branch.findById(branchId),
    ]);
    if (!medicine || !branch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid medicine or branch" });
    }
    // Central store stock check (prevent requesting more than available if we want strict limit)
    const centralStore = await Store.findOne();
    let available = 0;
    if (centralStore) {
      const bal = await StockBalance.findOne({
        medicineId: medicine._id,
        locationId: centralStore._id,
      });
      available = bal?.onHandQty || 0;
    }
    if (Number(quantity) > available) {
      return res.status(400).json({
        success: false,
        message: `Quantity exceeds available central stock (${available})`,
        available,
      });
    }
    const createdByUserId = req.user?.id; // may be undefined if unauthenticated
    const request = await Request.create({
      medicine: medicineId,
      branch: branchId,
      quantity,
      batchNumber,
      reason,
      createdByUserId,
    });
    res
      .status(201)
      .json({ success: true, message: "Request created", request });
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

// List medicines belonging to (transferred to) a branch based on StockBalance
export const getBranchMedicines = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid branchId" });
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const filter = { locationId: branchId };
    const [rawBalances, totalCount] = await Promise.all([
      StockBalance.find(filter)
        .populate("medicineId")
        .skip(skip)
        .limit(limit)
        .lean(),
      StockBalance.countDocuments(filter),
    ]);
    let balances = rawBalances;
    const items = balances.map((b) => ({
      _id: b._id,
      medicineId: b.medicineId?._id,
      name: b.medicineId?.medicineName,
      unit: b.medicineId?.unit, // legacy unit
      baseUnit: b.medicineId?.baseUnit,
      packUnit: b.medicineId?.packUnit,
      packSize: b.medicineId?.packSize,
      brand: b.medicineId?.brand,
      category: b.medicineId?.category,
      supplier: b.medicineId?.supplier,
      purchasePrice: b.medicineId?.purchasePrice,
      sellingPrice: b.medicineId?.sellingPrice,
      sellingPriceBase: b.medicineId?.sellingPriceBase,
      sellingPricePack: b.medicineId?.sellingPricePack,
      batchNumber: b.medicineId?.batchNumber,
      expiryDate: b.medicineId?.expiryDate,
      quantity: b.onHandQty || 0,
    }));
    res.json({ success: true, page, limit, totalCount, count: items.length, medicines: items });
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

export const listRequests = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const [requests, totalCount] = await Promise.all([
      Request.find(filter)
        .populate("medicine")
        .populate("branch")
        .populate("approvedByUserId", "username role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Request.countDocuments(filter),
    ]);
    res.status(200).json({ success: true, page, limit, totalCount, requests });
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

export const getRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await Request.findById(id)
      .populate("medicine")
      .populate("branch")
      .populate("approvedByUserId", "username role");
    if (!request) return next(errorHandler(404, "Request not found"));
    res.status(200).json({ success: true, request });
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

export const addRequestMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sender, text } = req.body;
    if (!sender || !text) return next(errorHandler(400, "sender and text required"));
    if (!["admin", "branch"].includes(sender)) return next(errorHandler(400, "invalid sender"));
    const request = await Request.findById(id);
    if (!request) return next(errorHandler(404, "Request not found"));
    request.messages.push({ sender, text });
    await request.save();
    res.status(201).json({ success: true, message: "Message added", request });
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

export const approveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await Request.findById(id);
    if (!request) return next(errorHandler(404, "Request not found"));
    if (request.status !== "Pending") return next(errorHandler(400, "Request already processed"));
    const centralStore = await Store.findOne();
    if (!centralStore) return next(errorHandler(400, "No central store configured"));
    const storeId = centralStore._id;

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const txnRequest = await Request.findById(id).session(session);
      if (!txnRequest || txnRequest.status !== "Pending") {
        await session.abortTransaction();
        return next(errorHandler(400, "Request already processed"));
      }

      const qty = Math.abs(txnRequest.quantity);
      const correlationId = `REQ-${id}`;
      const outLine = await StockLedger.create(
        [{ medicineId: txnRequest.medicine, locationId: storeId, quantity: -qty, transactionType: "TRANSFER_OUT", sourceDocType: "REQUEST", sourceDocId: id, correlationId, createdByUserId: req.user?.id }],
        { session }
      );
      const inLine = await StockLedger.create(
        [{ medicineId: txnRequest.medicine, locationId: txnRequest.branch, quantity: qty, transactionType: "TRANSFER_IN", sourceDocType: "REQUEST", sourceDocId: id, correlationId, createdByUserId: req.user?.id }],
        { session }
      );

      // Atomically decrement central stock (sufficiency check + update in one op)
      await safeDecrement({
        medicineId: txnRequest.medicine,
        locationId: storeId,
        quantity: qty,
        ledgerId: outLine[0]._id,
        session,
      });
      // Branch stock goes to reservedQty (in-transit) until receipt confirmed
      await StockBalance.updateOne(
        { medicineId: txnRequest.medicine, locationId: txnRequest.branch },
        { $inc: { reservedQty: qty }, $set: { lastTxnAt: new Date(), lastTxnId: inLine[0]._id } },
        { upsert: true, session }
      );

      txnRequest.status = "Shipped";
      if (req.user?.id) txnRequest.approvedByUserId = req.user.id;
      await txnRequest.save({ session });

      await session.commitTransaction();

      res.status(200).json({ success: true, message: "Request shipped", request: txnRequest });
    } catch (txnErr) {
      await session.abortTransaction();
      throw txnErr;
    } finally {
      session.endSession();
    }
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

export const rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const request = await Request.findById(id);
    if (!request) return next(errorHandler(404, "Request not found"));
    if (request.status !== "Pending") return next(errorHandler(400, "Request already processed"));
    request.status = "Rejected";
    request.rejectionNote = note;
    await request.save();
    res.status(200).json({ success: true, message: "Request rejected", request });
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

export const cancelRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await Request.findById(id);
    if (!request) return next(errorHandler(404, "Request not found"));
    if (request.status !== "Pending") return next(errorHandler(400, "Cannot cancel processed request"));
    request.status = "Rejected";
    request.rejectionNote = "Cancelled by branch";
    await request.save();
    res.status(200).json({ success: true, message: "Request cancelled", request });
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

export const confirmReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await Request.findById(id);
    if (!request) return next(errorHandler(404, "Request not found"));
    if (request.status !== "Shipped") return next(errorHandler(400, "Only shipped requests can be confirmed"));

    const qty = Math.abs(request.quantity);
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const txnRequest = await Request.findById(id).session(session);
      if (!txnRequest || txnRequest.status !== "Shipped") {
        await session.abortTransaction();
        return next(errorHandler(400, "Request is no longer in shipped state"));
      }

      // Move from reservedQty (in-transit) to onHandQty (available)
      await StockBalance.updateOne(
        { medicineId: txnRequest.medicine, locationId: txnRequest.branch },
        { $inc: { reservedQty: -qty, onHandQty: qty }, $set: { lastTxnAt: new Date() } },
        { upsert: true, session }
      );

      txnRequest.status = "Received";
      txnRequest.receivedAt = new Date();
      txnRequest.fulfilledAt = new Date();
      if (req.user?.id) txnRequest.receivedByUserId = req.user.id;
      await txnRequest.save({ session });

      await session.commitTransaction();
      res.status(200).json({ success: true, message: "Receipt confirmed", request: txnRequest });
    } catch (txnErr) {
      await session.abortTransaction();
      throw txnErr;
    } finally {
      session.endSession();
    }
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

export const reverseShipment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await Request.findById(id);
    if (!request) return next(errorHandler(404, "Request not found"));
    if (request.status !== "Shipped") return next(errorHandler(400, "Only shipped requests can be reversed"));

    const qty = Math.abs(request.quantity);
    const centralStore = await Store.findOne();
    if (!centralStore) return next(errorHandler(400, "No central store configured"));

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const txnRequest = await Request.findById(id).session(session);
      if (!txnRequest || txnRequest.status !== "Shipped") {
        await session.abortTransaction();
        return next(errorHandler(400, "Request is no longer in shipped state"));
      }

      // Reverse ledger entries (mark as REVERSED)
      await StockLedger.updateMany(
        { correlationId: `REQ-${id}`, status: "ACTIVE" },
        { $set: { status: "REVERSED" } },
        { session }
      );

      // Restore central store stock
      await StockBalance.updateOne(
        { medicineId: txnRequest.medicine, locationId: centralStore._id },
        { $inc: { onHandQty: qty }, $set: { lastTxnAt: new Date() } },
        { upsert: true, session }
      );

      // Clear branch reserved stock
      await StockBalance.updateOne(
        { medicineId: txnRequest.medicine, locationId: txnRequest.branch },
        { $inc: { reservedQty: -qty }, $set: { lastTxnAt: new Date() } },
        { upsert: true, session }
      );

      txnRequest.status = "Reversed";
      txnRequest.reversedAt = new Date();
      txnRequest.reversalNote = req.body?.note || "Reversed by admin";
      await txnRequest.save({ session });

      await session.commitTransaction();
      res.status(200).json({ success: true, message: "Shipment reversed", request: txnRequest });
    } catch (txnErr) {
      await session.abortTransaction();
      throw txnErr;
    } finally {
      session.endSession();
    }
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

// Central store availability for a single medicine (sums across all central stores)
export const getCentralAvailable = async (req, res, next) => {
  try {
    const { medicineId } = req.query;
    if (!medicineId || !mongoose.Types.ObjectId.isValid(medicineId)) {
      return res.status(400).json({ success: false, message: "Valid medicineId required" });
    }
    const stores = await Store.find({}, "_id").lean();
    const storeIds = stores.map((s) => s._id);
    if (!storeIds.length) {
      return res.json({ success: true, available: 0 });
    }
    // StockBalance is the single source of truth for current stock
    const balAgg = await StockBalance.aggregate([
      {
        $match: {
          medicineId: new mongoose.Types.ObjectId(medicineId),
          locationId: { $in: storeIds },
        },
      },
      { $group: { _id: null, total: { $sum: "$onHandQty" } } },
    ]);
    const available = balAgg[0]?.total || 0;
    return res.json({ success: true, available });
  } catch (e) {
    next(e);
  }
};
// Admin maintenance: remove all medicines from a branch (or all branches)
export const clearBranchMedicines = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    if (branchId === "all") {
      const branches = await Branch.find().select("_id").lean();
      const ids = branches.map((b) => b._id);
      const result = await StockBalance.deleteMany({
        locationId: { $in: ids },
      });
      return res.json({
        success: true,
        scope: "all",
        deleted: result.deletedCount || 0,
      });
    }
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid branchId" });
    }
    const result = await StockBalance.deleteMany({ locationId: branchId });
    return res.json({
      success: true,
      scope: "single",
      branchId,
      deleted: result.deletedCount || 0,
    });
  } catch (e) {
    next(e);
  }
};

// Employee self-service add medicine to their branch (creates synthetic transfer)

function logSyntheticTransfer(action, userId, meta = {}) {
  try {
    console.log(
      `[BranchTransfer] action=${action} user=${userId} meta=${JSON.stringify(
        meta
      )}`
    );
  } catch {}
}
export const employeeAddBranchMedicine = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || !user.branch) return next(errorHandler(403, "Branch context required"));
    if (!["employee", "inventory_manager"].includes(user.role)) return next(errorHandler(403, "Only employees can add branch medicines"));
    const { medicineId, quantity, reason } = req.body;
    if (!medicineId || !quantity || Number(quantity) <= 0) return next(errorHandler(400, "medicineId and positive quantity required"));
    const med = await Medicine.findById(medicineId);
    if (!med || med.isDeleted) return next(errorHandler(404, "Medicine not found"));
    const central = await Store.findOne();
    if (!central) return next(errorHandler(500, "Central store missing"));
    const qty = Math.abs(Number(quantity));

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const outLedger = await StockLedger.create(
        [{ medicineId, locationId: central._id, quantity: -qty, transactionType: "TRANSFER_OUT", createdByUserId: user.id, notes: reason || undefined }],
        { session }
      );
      // Atomically decrement central stock
      await safeDecrement({
        medicineId,
        locationId: central._id,
        quantity: qty,
        ledgerId: outLedger[0]._id,
        session,
      });

      const inLedger = await StockLedger.create(
        [{ medicineId, locationId: user.branch, quantity: qty,
            transactionType: "TRANSFER_IN",
            createdByUserId: user.id,
            notes: reason || undefined,
          },
        ],
        { session }
      );
      await StockBalance.updateOne(
        { medicineId, locationId: user.branch },
        {
          $inc: { onHandQty: qty },
          $set: { lastTxnAt: new Date(), lastTxnId: inLedger[0]._id },
        },
        { upsert: true, session }
      );

      await session.commitTransaction();

      logSyntheticTransfer("single_transfer", user.id, {
        medicineId,
        qty,
        branch: user.branch,
        out: outLedger[0]._id,
        in: inLedger[0]._id,
      });
      return res.status(201).json({
        success: true,
        message: "Branch medicine added",
        transferOut: outLedger[0]._id,
        transferIn: inLedger[0]._id,
      });
    } catch (txnErr) {
      await session.abortTransaction();
      throw txnErr;
    } finally {
      session.endSession();
    }
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

// Batch variant: body.items = [{ medicineId, quantity, reason? }, ...]
export const employeeAddBranchMedicinesBatch = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || !user.branch) {
      return res
        .status(403)
        .json({ success: false, message: "Branch context required" });
    }
    if (!["employee", "inventory_manager"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only employees can add branch medicines",
      });
    }
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res
        .status(400)
        .json({ success: false, message: "items array required" });
    }
    const central = await Store.findOne();
    if (!central)
      return res
        .status(500)
        .json({ success: false, message: "Central store missing" });
    const results = [];
      for (const entry of items) {
        const itemSession = await mongoose.startSession();
        try {
          itemSession.startTransaction();
          const { medicineId, quantity, reason } = entry || {};
          if (!medicineId || !quantity || Number(quantity) <= 0) {
            results.push({
              medicineId,
              success: false,
              error: "Invalid medicineId/quantity",
            });
            await itemSession.abortTransaction();
            continue;
          }
          const med = await Medicine.findById(medicineId).session(itemSession);
          if (!med || med.isDeleted) {
            results.push({
              medicineId,
              success: false,
              error: "Medicine not found",
            });
            await itemSession.abortTransaction();
            continue;
          }
          const qty = Math.abs(Number(quantity));
          const outLedger = await StockLedger.create(
            [
              {
                medicineId,
                locationId: central._id,
                quantity: -qty,
                transactionType: "TRANSFER_OUT",
                createdByUserId: user.id,
                notes: reason || undefined,
              },
            ],
            { session: itemSession }
          );
          try {
            await safeDecrement({
              medicineId,
              locationId: central._id,
              quantity: qty,
              ledgerId: outLedger[0]._id,
              session: itemSession,
            });
          } catch (decrErr) {
            await itemSession.abortTransaction();
            results.push({
              medicineId,
              success: false,
              error: "Insufficient central stock",
            });
            continue;
          }
          const inLedger = await StockLedger.create(
            [
              {
                medicineId,
                locationId: user.branch,
                quantity: qty,
                transactionType: "TRANSFER_IN",
                createdByUserId: user.id,
                notes: reason || undefined,
              },
            ],
            { session: itemSession }
          );
          await StockBalance.updateOne(
            { medicineId, locationId: user.branch },
            {
              $inc: { onHandQty: qty },
              $set: { lastTxnAt: new Date(), lastTxnId: inLedger[0]._id },
            },
            { upsert: true, session: itemSession }
          );
          await itemSession.commitTransaction();
          results.push({
            medicineId,
            success: true,
            transferOut: outLedger[0]._id,
            transferIn: inLedger[0]._id,
          });
          logSyntheticTransfer("batch_transfer_item", user.id, {
            medicineId,
            qty,
            out: outLedger[0]._id,
            in: inLedger[0]._id,
          });
        } catch (innerErr) {
          await itemSession.abortTransaction();
          results.push({
            medicineId: entry?.medicineId,
            success: false,
            error: innerErr.message,
          });
        } finally {
          itemSession.endSession();
        }
      }
    logSyntheticTransfer("batch_transfer_complete", user.id, {
      count: results.length,
    });
    return res.status(207).json({ success: true, results });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};
