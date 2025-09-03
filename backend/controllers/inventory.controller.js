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
    const { locationId, medicineId, includeZero } = req.query;
    const filter = {};
    if (locationId) filter.locationId = locationId;
    if (medicineId) filter.medicineId = medicineId;
    if (!includeZero) filter.onHandQty = { $gt: 0 };

    const balances = await StockBalance.find(filter)
      .populate("medicineId", "name strength form")
      .populate("locationId", "name")
      .lean();
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
    const inventory = await Inventory.find({
      locationType,
      locationId,
    }).populate("medicine");
    res.status(200).json({ success: true, inventory });
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
    const { medicineId, branchId, quantity, batchNumber, reason } = req.body;
    if (!medicineId || !branchId || !quantity)
      return res.status(400).json({
        success: false,
        message: "medicineId, branchId, quantity required",
      });
    const request = await Request.create({
      medicine: medicineId,
      branch: branchId,
      quantity,
      batchNumber,
      reason,
    });
    res
      .status(201)
      .json({ success: true, message: "Request created", request });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listRequests = async (_req, res) => {
  try {
    const requests = await Request.find()
      .populate("medicine")
      .populate("branch")
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
      .populate("branch");
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
    // Ledger-based transfer: out from store, in to branch
    const { storeId } = req.body;
    if (!storeId)
      return res
        .status(400)
        .json({ success: false, message: "storeId required to fulfill" });
    // Prevent negative with balance check
    const sourceBal = await StockBalance.findOne({
      medicineId: request.medicine,
      locationId: storeId,
    });
    if (!sourceBal || (sourceBal.onHandQty || 0) < request.quantity) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient central stock" });
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
    });
    const inLine = await StockLedger.create({
      medicineId: request.medicine,
      locationId: request.branch,
      quantity: Math.abs(request.quantity),
      transactionType: "TRANSFER_IN",
      sourceDocType: "REQUEST",
      sourceDocId: id,
      correlationId,
    });
    await StockBalance.updateOne(
      { medicineId: request.medicine, locationId: storeId },
      {
        $inc: { onHandQty: -Math.abs(request.quantity) },
        $set: { lastTxnAt: new Date(), lastTxnId: outLine._id },
      },
      { upsert: true }
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
