import mongoose from "mongoose";
import { StockLedger, StockBalance } from "../models/inventory.model.js";
import Medicine from "../models/medicine.model.js";
import Branch from "../models/branch.model.js";
import Store from "../models/store.model.js";

// Helper to upsert balance atomically
async function applyLedgerToBalance(session, entry, ledgerId) {
  const filter = {
    medicineId: entry.medicineId,
    batchId: entry.batchId,
    locationId: entry.locationId,
  };
  const update = {
    $inc: { onHandQty: entry.quantity },
    $set: { lastTxnAt: new Date(), lastTxnId: ledgerId },
  };
  await StockBalance.updateOne(filter, update, { upsert: true, session });
}

export const postLedger = async (req, res, next) => {
  const payload = Array.isArray(req.body) ? req.body : [req.body];
  if (!payload.length)
    return res.status(400).json({ message: "Empty payload" });
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
        throw Object.assign(new Error("Missing required fields"), {
          statusCode: 400,
        });
      }
      // Basic refs check
      const [med, loc] = await Promise.all([
        Medicine.findById(line.medicineId).session(session),
        Branch.findById(line.locationId).session(session),
      ]);
      if (!med || !loc)
        throw Object.assign(new Error("Invalid medicine or location"), {
          statusCode: 400,
        });

      // Prevent negative balances unless explicit allowNegative flag
      if (!line.allowNegative) {
        const bal = await StockBalance.findOne({
          medicineId: line.medicineId,
          batchId: line.batchId,
          locationId: line.locationId,
        }).session(session);
        const current = bal?.onHandQty || 0;
        if (current + line.quantity < 0) {
          throw Object.assign(new Error("Insufficient stock"), {
            statusCode: 409,
          });
        }
      }
      // Idempotency (optional): ignore if same idempotencyKey exists
      if (line.idempotencyKey) {
        const exists = await StockLedger.findOne({
          idempotencyKey: line.idempotencyKey,
        }).session(session);
        if (exists) {
          results.push(exists);
          continue;
        }
      }
      const ledger = await StockLedger.create(
        [
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
        ],
        { session }
      );
      const saved = ledger[0];
      await applyLedgerToBalance(session, line, saved._id);
      results.push(saved);
    }
    await session.commitTransaction();
    res
      .status(201)
      .json({ success: true, count: results.length, entries: results });
  } catch (err) {
    await session.abortTransaction();
    next(err);
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

    let balances = await StockBalance.find(filter)
      .populate(
        "medicineId",
        "medicineName brand category purchasePrice sellingPrice supplier batchNumber"
      )
      .populate("locationId", "name")
      .lean();

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
        // Second fallback: legacy medicine.quantity field for central store stock (pre-ledger data)
        const med = await Medicine.findById(medicineId).lean();
        const loc = await Store.findById(locationId).lean();
        if (
          med &&
          loc &&
          typeof med.quantity === "number" &&
          med.quantity > 0
        ) {
          balances.push({
            _id: `${medicineId}-${locationId}-legacy`,
            medicineId: med,
            locationId: { _id: loc._id, name: loc.name },
            onHandQty: med.quantity,
            legacy: true,
          });
        }
      }
    }
    res.json({ success: true, count: balances.length, balances });
  } catch (err) {
    next(err);
  }
};

export const getLedgerHistory = async (req, res, next) => {
  try {
    const { medicineId, locationId, limit = 100 } = req.query;
    const filter = {};
    if (medicineId) filter.medicineId = medicineId;
    if (locationId) filter.locationId = locationId;
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
      return res.status(400).json({
        success: false,
        message: "storeId, branchId, medicineId, quantity required",
      });
    }
    const qty = Math.abs(Number(quantity));
    if (qty <= 0)
      return res
        .status(400)
        .json({ success: false, message: "quantity must be > 0" });
    const [store, branch, med] = await Promise.all([
      Store.findById(storeId),
      Branch.findById(branchId),
      Medicine.findById(medicineId),
    ]);
    if (!store || !branch || !med)
      return res.status(400).json({ success: false, message: "Invalid refs" });
    const sourceBal = await StockBalance.findOne({
      medicineId,
      locationId: storeId,
    });
    if (!sourceBal || (sourceBal.onHandQty || 0) < qty)
      return res
        .status(409)
        .json({ success: false, message: "Insufficient central stock" });
    const correlationId = `DIRECT-${Date.now()}`;
    const outLine = await StockLedger.create({
      medicineId,
      locationId: storeId,
      quantity: -qty,
      transactionType: "TRANSFER_OUT",
      sourceDocType: "DIRECT",
      sourceDocId: correlationId,
      correlationId,
      createdByUserId: req.user?.id,
    });
    const inLine = await StockLedger.create({
      medicineId,
      locationId: branchId,
      quantity: qty,
      transactionType: "TRANSFER_IN",
      sourceDocType: "DIRECT",
      sourceDocId: correlationId,
      correlationId,
      createdByUserId: req.user?.id,
    });
    await StockBalance.updateOne(
      { medicineId, locationId: storeId },
      {
        $inc: { onHandQty: -qty },
        $set: { lastTxnAt: new Date(), lastTxnId: outLine._id },
      },
      { upsert: true }
    );
    await StockBalance.updateOne(
      { medicineId, locationId: branchId },
      {
        $inc: { onHandQty: qty },
        $set: { lastTxnAt: new Date(), lastTxnId: inLine._id },
      },
      { upsert: true }
    );
    res.json({ success: true, message: "Transferred", correlationId });
  } catch (err) {
    next(err);
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

import Inventory from "../models/inventory.model.js";
import Request from "../models/request.model.js";

// Create or update inventory for a location
export const upsertInventory = async (req, res, next) => {
  try {
    const {
      medicineId,
      locationType,
      locationId,
      quantity,
      batchNumber,
      expiryDate,
    } = req.body;
    // For initial stock entry enforce Store location type
    if (locationType !== "Store") {
      return res.status(400).json({
        success: false,
        message:
          "Direct stock entry allowed only at Store. Branches must request.",
      });
    }
    let inventory = await Inventory.findOne({
      medicine: medicineId,
      locationType: "Store",
      locationId,
      batchNumber,
    });
    if (inventory) {
      inventory.quantity += quantity;
      if (expiryDate) inventory.expiryDate = expiryDate;
      await inventory.save();
      return res.status(200).json({
        success: true,
        message: "Inventory updated successfully",
        inventory,
      });
    } else {
      inventory = new Inventory({
        medicine: medicineId,
        locationType: "Store",
        locationId,
        quantity,
        batchNumber,
        expiryDate,
      });
      await inventory.save();
      return res.status(201).json({
        success: true,
        message: "Inventory created successfully",
        inventory,
      });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get inventory for a location
export const getInventory = async (req, res, next) => {
  try {
    const { locationType, locationId } = req.query;
    let resolvedLocationId = locationId;
    // Allow a friendly alias ("main") or attempt graceful handling of a non ObjectId
    if (resolvedLocationId) {
      const valid = mongoose.Types.ObjectId.isValid(resolvedLocationId);
      if (!valid) {
        if (resolvedLocationId === "main") {
          const store = await Store.findOne().select("_id").lean();
          if (!store) {
            return res
              .status(400)
              .json({ success: false, message: "No store configured yet" });
          }
          resolvedLocationId = store._id.toString();
        } else {
          return res.status(400).json({
            success: false,
            message: "Invalid locationId format",
          });
        }
      }
    }
    const query = { locationType };
    if (resolvedLocationId) query.locationId = resolvedLocationId;
    const inventory = await Inventory.find(query).populate("medicine");
    res.status(200).json({ success: true, inventory, resolvedLocationId });
  } catch (error) {
    next(error);
  }
};

// Transfer medicine from store to branch
export const transferMedicine = async (req, res, next) => {
  try {
    // NOTE: This endpoint is now ledger-based. The previous implementation
    // modified the legacy Inventory collection only, which meant the new
    // aggregation (initial/current quantities derived from StockLedger) never
    // saw the TRANSFER_OUT movement, leaving currentQuantity equal to initial.
    // We now create proper ledger entries (out from store, in to branch) and
    // update StockBalance so real-time quantities & derived metrics adjust.
    const { medicineId, fromLocationId, toLocationId, quantity, batchNumber } =
      req.body;
    if (!medicineId || !fromLocationId || !toLocationId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "medicineId, fromLocationId, toLocationId, quantity required",
      });
    }
    const qty = Math.abs(Number(quantity));
    if (qty <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "quantity must be > 0" });
    }

    // Validate refs (store as source, branch as destination)
    const [store, branch, med] = await Promise.all([
      Store.findById(fromLocationId),
      Branch.findById(toLocationId),
      Medicine.findById(medicineId),
    ]);
    if (!store || !branch || !med) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid store/branch/medicine" });
    }

    // Check central (store) balance
    const sourceBal = await StockBalance.findOne({
      medicineId,
      locationId: fromLocationId,
    });
    if (!sourceBal || (sourceBal.onHandQty || 0) < qty) {
      return res
        .status(409)
        .json({ success: false, message: "Insufficient central stock" });
    }

    const correlationId = `LEGACY-XFER-${Date.now()}`;
    const outLine = await StockLedger.create({
      medicineId,
      locationId: fromLocationId,
      quantity: -qty,
      transactionType: "TRANSFER_OUT",
      sourceDocType: "LEGACY_TRANSFER",
      sourceDocId: correlationId,
      correlationId,
      batchId: batchNumber ? undefined : undefined, // placeholder if batch linkage added later
      createdByUserId: req.user?.id,
    });
    const inLine = await StockLedger.create({
      medicineId,
      locationId: toLocationId,
      quantity: qty,
      transactionType: "TRANSFER_IN",
      sourceDocType: "LEGACY_TRANSFER",
      sourceDocId: correlationId,
      correlationId,
      batchId: batchNumber ? undefined : undefined,
      createdByUserId: req.user?.id,
    });

    await StockBalance.updateOne(
      { medicineId, locationId: fromLocationId },
      {
        $inc: { onHandQty: -qty },
        $set: { lastTxnAt: new Date(), lastTxnId: outLine._id },
      },
      { upsert: true }
    );
    await StockBalance.updateOne(
      { medicineId, locationId: toLocationId },
      {
        $inc: { onHandQty: qty },
        $set: { lastTxnAt: new Date(), lastTxnId: inLine._id },
      },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Transfer successful (ledger)",
      correlationId,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
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
    if (Number(quantity) > available && available > 0) {
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
    res.status(400).json({ success: false, message: e.message });
  }
};

// List medicines belonging to (transferred to) a branch based on StockBalance
export const getBranchMedicines = async (req, res) => {
  try {
    const { branchId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid branchId" });
    }
    const balances = await StockBalance.find({ locationId: branchId })
      .populate("medicineId")
      .lean();
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
    res.json({ success: true, count: items.length, medicines: items });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listRequests = async (_req, res) => {
  try {
    const requests = await Request.find()
      .populate("medicine")
      .populate("branch")
      .populate("approvedByUserId", "username role")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, requests });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const getRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await Request.findById(id)
      .populate("medicine")
      .populate("branch")
      .populate("approvedByUserId", "username role");
    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    res.status(200).json({ success: true, request });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const addRequestMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { sender, text } = req.body;
    if (!sender || !text)
      return res
        .status(400)
        .json({ success: false, message: "sender and text required" });
    if (!["admin", "branch"].includes(sender))
      return res
        .status(400)
        .json({ success: false, message: "invalid sender" });
    const request = await Request.findById(id);
    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    request.messages.push({ sender, text });
    await request.save();
    res.status(201).json({ success: true, message: "Message added", request });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await Request.findById(id);
    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    if (request.status !== "Pending")
      return res
        .status(400)
        .json({ success: false, message: "Request already processed" });
    // Determine central store automatically (first store document) instead of requiring storeId from client
    const centralStore = await Store.findOne();
    if (!centralStore)
      return res
        .status(400)
        .json({ success: false, message: "No central store configured" });
    const storeId = centralStore._id;
    // Prevent negative with balance check
    let sourceBal = await StockBalance.findOne({
      medicineId: request.medicine,
      locationId: storeId,
    });
    let available = sourceBal?.onHandQty || 0;
    // Extended fallback chain:
    // 1. If no StockBalance doc, derive net from ledger history
    // 2. If ledger net zero, try legacy Inventory doc
    // 3. If still zero, try legacy Medicine.quantity (pre-migration)
    if (!sourceBal) {
      const net = await StockLedger.aggregate([
        {
          $match: {
            locationId: storeId,
            medicineId: request.medicine,
          },
        },
        { $group: { _id: "$medicineId", qty: { $sum: "$quantity" } } },
      ]);
      if (net.length) available = net[0].qty || 0;
      if (available <= 0) {
        const legacyInv = await Inventory.findOne({
          medicine: request.medicine,
          locationType: "Store",
          locationId: storeId,
        });
        if (legacyInv && legacyInv.quantity > 0) available = legacyInv.quantity;
      }
      if (available <= 0) {
        const legacyMed = await Medicine.findById(request.medicine).lean();
        if (
          legacyMed &&
          typeof legacyMed.quantity === "number" &&
          legacyMed.quantity > 0
        ) {
          available = legacyMed.quantity;
        }
      }
    }
    if (available < request.quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient central stock",
        available,
        needed: request.quantity,
      });
    }
    // Ensure a StockBalance doc exists before decrement (so it won't start negative)
    if (!sourceBal) {
      await StockBalance.updateOne(
        { medicineId: request.medicine, locationId: storeId },
        {
          $setOnInsert: { onHandQty: available },
        },
        { upsert: true }
      );
      sourceBal = await StockBalance.findOne({
        medicineId: request.medicine,
        locationId: storeId,
      });
    }
    const correlationId = `REQ-${id}`;
    const outLine = await StockLedger.create({
      medicineId: request.medicine,
      locationId: storeId,
      quantity: -Math.abs(request.quantity),
      transactionType: "TRANSFER_OUT",
      sourceDocType: "REQUEST",
      sourceDocId: id,
      correlationId,
      createdByUserId: req.user?.id,
    });
    const inLine = await StockLedger.create({
      medicineId: request.medicine,
      locationId: request.branch,
      quantity: Math.abs(request.quantity),
      transactionType: "TRANSFER_IN",
      sourceDocType: "REQUEST",
      sourceDocId: id,
      correlationId,
      createdByUserId: req.user?.id,
    });
    await StockBalance.updateOne(
      { medicineId: request.medicine, locationId: storeId },
      {
        $inc: { onHandQty: -Math.abs(request.quantity) },
        $set: { lastTxnAt: new Date(), lastTxnId: outLine._id },
      },
      { upsert: true }
    );
    // If legacy inventory exists, decrement it as well to keep it roughly in sync until fully deprecated
    await Inventory.updateOne(
      {
        medicine: request.medicine,
        locationType: "Store",
        locationId: storeId,
      },
      { $inc: { quantity: -Math.abs(request.quantity) } }
    );
    await StockBalance.updateOne(
      { medicineId: request.medicine, locationId: request.branch },
      {
        $inc: { onHandQty: Math.abs(request.quantity) },
        $set: { lastTxnAt: new Date(), lastTxnId: inLine._id },
      },
      { upsert: true }
    );

    request.status = "Fulfilled";
    request.fulfilledAt = new Date();
    if (req.user?.id) request.approvedByUserId = req.user.id;
    await request.save();

    res
      .status(200)
      .json({ success: true, message: "Request fulfilled", request });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const request = await Request.findById(id);
    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    if (request.status !== "Pending")
      return res
        .status(400)
        .json({ success: false, message: "Request already processed" });
    request.status = "Rejected";
    request.rejectionNote = note;
    await request.save();
    res
      .status(200)
      .json({ success: true, message: "Request rejected", request });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// Cancel a pending request (branch/employee initiated). Simply marks as Rejected with note "Cancelled by branch" if not already processed.
export const cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await Request.findById(id);
    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    if (request.status !== "Pending")
      return res
        .status(400)
        .json({ success: false, message: "Cannot cancel processed request" });
    request.status = "Rejected";
    request.rejectionNote = "Cancelled by branch";
    await request.save();
    res
      .status(200)
      .json({ success: true, message: "Request cancelled", request });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// Central store availability for a single medicine (sums across all central stores if multiple)
export const getCentralAvailable = async (req, res, next) => {
  try {
    const { medicineId } = req.query;
    if (!medicineId || !mongoose.Types.ObjectId.isValid(medicineId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid medicineId required" });
    }
    const stores = await Store.find({}, "_id").lean();
    const storeIds = stores.map((s) => s._id);
    if (!storeIds.length) {
      return res.json({ success: true, available: 0, source: "none" });
    }
    // 1) Sum StockBalance across all stores
    const balAgg = await StockBalance.aggregate([
      {
        $match: {
          medicineId: new mongoose.Types.ObjectId(medicineId),
          locationId: { $in: storeIds },
        },
      },
      { $group: { _id: null, total: { $sum: "$onHandQty" } } },
    ]);
    const balTotal = balAgg[0]?.total || 0;
    if (balTotal > 0) {
      return res.json({
        success: true,
        available: balTotal,
        source: "balance",
      });
    }
    // 2) Fallback to ledger net
    const netAgg = await StockLedger.aggregate([
      {
        $match: {
          medicineId: new mongoose.Types.ObjectId(medicineId),
          locationId: { $in: storeIds },
        },
      },
      { $group: { _id: null, net: { $sum: "$quantity" } } },
    ]);
    const net = netAgg[0]?.net || 0;
    if (net > 0) {
      return res.json({ success: true, available: net, source: "ledger" });
    }
    // 3) Legacy Inventory fallback (store type)
    const invAgg = await Inventory.aggregate([
      {
        $match: {
          medicine: new mongoose.Types.ObjectId(medicineId),
          locationType: "Store",
          locationId: { $in: storeIds },
        },
      },
      { $group: { _id: null, total: { $sum: "$quantity" } } },
    ]);
    const invTotal = invAgg[0]?.total || 0;
    if (invTotal > 0) {
      return res.json({
        success: true,
        available: invTotal,
        source: "legacyInv",
      });
    }
    // 4) Legacy medicine.quantity (very old data)
    const med = await Medicine.findById(medicineId).lean();
    const legacyQty = typeof med?.quantity === "number" ? med.quantity : 0;
    if (legacyQty > 0) {
      return res.json({
        success: true,
        available: legacyQty,
        source: "legacyMed",
      });
    }
    return res.json({ success: true, available: 0, source: "none" });
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
export const employeeAddBranchMedicine = async (req, res) => {
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
    const { medicineId, quantity, reason } = req.body;
    if (!medicineId || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        message: "medicineId and positive quantity required",
      });
    }
    const med = await Medicine.findById(medicineId);
    if (!med || med.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "Medicine not found" });
    }
    const central = await Store.findOne();
    if (!central) {
      return res
        .status(500)
        .json({ success: false, message: "Central store missing" });
    }
    const qty = Math.abs(Number(quantity));
    // Strict central stock enforcement
    const centralBal = await StockBalance.findOne({
      medicineId,
      locationId: central._id,
    });
    if (!centralBal || centralBal.onHandQty < qty) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient central store stock" });
    }
    // Create transfer out (store)
    const outLedger = await StockLedger.create({
      medicineId,
      locationId: central._id,
      quantity: -qty,
      transactionType: "TRANSFER_OUT",
      createdByUserId: user.id,
      notes: reason || undefined,
    });
    await StockBalance.updateOne(
      { medicineId, locationId: central._id },
      {
        $inc: { onHandQty: -qty },
        $set: { lastTxnAt: new Date(), lastTxnId: outLedger._id },
      },
      { upsert: true }
    );
    // Create transfer in (branch)
    const inLedger = await StockLedger.create({
      medicineId,
      locationId: user.branch,
      quantity: qty,
      transactionType: "TRANSFER_IN",
      createdByUserId: user.id,
      notes: reason || undefined,
    });
    await StockBalance.updateOne(
      { medicineId, locationId: user.branch },
      {
        $inc: { onHandQty: qty },
        $set: { lastTxnAt: new Date(), lastTxnId: inLedger._id },
      },
      { upsert: true }
    );
    logSyntheticTransfer("single_transfer", user.id, {
      medicineId,
      qty,
      branch: user.branch,
      out: outLedger._id,
      in: inLedger._id,
    });
    return res.status(201).json({
      success: true,
      message: "Branch medicine added",
      transferOut: outLedger._id,
      transferIn: inLedger._id,
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// Batch variant: body.items = [{ medicineId, quantity, reason? }, ...]
export const employeeAddBranchMedicinesBatch = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.branch) {
      return res
        .status(403)
        .json({ success: false, message: "Branch context required" });
    }
    if (!["employee", "inventory_manager"].includes(user.role)) {
      return res
        .status(403)
        .json({
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
      try {
        const { medicineId, quantity, reason } = entry || {};
        if (!medicineId || !quantity || Number(quantity) <= 0) {
          results.push({
            medicineId,
            success: false,
            error: "Invalid medicineId/quantity",
          });
          continue;
        }
        const med = await Medicine.findById(medicineId);
        if (!med || med.isDeleted) {
          results.push({
            medicineId,
            success: false,
            error: "Medicine not found",
          });
          continue;
        }
        const qty = Math.abs(Number(quantity));
        const centralBal = await StockBalance.findOne({
          medicineId,
          locationId: central._id,
        });
        if (!centralBal || centralBal.onHandQty < qty) {
          results.push({
            medicineId,
            success: false,
            error: "Insufficient central stock",
          });
          continue;
        }
        const outLedger = await StockLedger.create({
          medicineId,
          locationId: central._id,
          quantity: -qty,
          transactionType: "TRANSFER_OUT",
          createdByUserId: user.id,
          notes: reason || undefined,
        });
        await StockBalance.updateOne(
          { medicineId, locationId: central._id },
          {
            $inc: { onHandQty: -qty },
            $set: { lastTxnAt: new Date(), lastTxnId: outLedger._id },
          },
          { upsert: true }
        );
        const inLedger = await StockLedger.create({
          medicineId,
          locationId: user.branch,
          quantity: qty,
          transactionType: "TRANSFER_IN",
          createdByUserId: user.id,
          notes: reason || undefined,
        });
        await StockBalance.updateOne(
          { medicineId, locationId: user.branch },
          {
            $inc: { onHandQty: qty },
            $set: { lastTxnAt: new Date(), lastTxnId: inLedger._id },
          },
          { upsert: true }
        );
        results.push({
          medicineId,
          success: true,
          transferOut: outLedger._id,
          transferIn: inLedger._id,
        });
        logSyntheticTransfer("batch_transfer_item", user.id, {
          medicineId,
          qty,
          out: outLedger._id,
          in: inLedger._id,
        });
      } catch (innerErr) {
        results.push({
          medicineId: entry?.medicineId,
          success: false,
          error: innerErr.message,
        });
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
