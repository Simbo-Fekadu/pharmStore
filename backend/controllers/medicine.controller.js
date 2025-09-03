import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Medicine from "../models/medicine.model.js";
import User from "../models/user.model.js";
import Supplier from "../models/supplier.model.js";
import Store from "../models/store.model.js";
import { StockLedger, StockBalance } from "../models/inventory.model.js";

// List medicines with optional stock & lifecycle metrics
export const getMedicines = async (req, res) => {
  try {
    const { includeDeleted, withStock, storeOnly, centralNet } = req.query;
    const filter = includeDeleted === "true" ? {} : { isDeleted: false };
    const medicines = await Medicine.find(filter).populate("supplier");
    if (withStock === "true" && medicines.length) {
      const ids = medicines.map((m) => m._id);
      // store-only filter
      let storeIds = null;
      if (storeOnly === "true") {
        const stores = await Store.find({}, "_id").lean();
        storeIds = stores.map((s) => s._id);
      }
      const balMatch = { medicineId: { $in: ids } };
      if (storeIds) balMatch.locationId = { $in: storeIds };
      const balAgg = await StockBalance.aggregate([
        { $match: balMatch },
        { $group: { _id: "$medicineId", total: { $sum: "$onHandQty" } } },
      ]);
      const balMap = new Map(balAgg.map((a) => [a._id.toString(), a.total]));
      medicines.forEach((m) =>
        m.set("liveQuantity", balMap.get(m._id.toString()) || 0, {
          strict: false,
        })
      );

      if (centralNet === "true") {
        const stores = await Store.find({}, "_id").lean();
        const storeIdList = stores.map((s) => s._id);
        if (storeIdList.length) {
          const netAgg = await StockLedger.aggregate([
            {
              $match: {
                medicineId: { $in: ids },
                locationId: { $in: storeIdList },
              },
            },
            { $group: { _id: "$medicineId", net: { $sum: "$quantity" } } },
          ]);
          const netMap = new Map(netAgg.map((a) => [a._id.toString(), a.net]));
          medicines.forEach((m) =>
            m.set("centralNetQuantity", netMap.get(m._id.toString()) || 0, {
              strict: false,
            })
          );
        }
      }

      if (req.query.initialCurrent === "true") {
        const stores = await Store.find({}, "_id").lean();
        const storeIdList = stores.map((s) => s._id);
        if (storeIdList.length) {
          const lifeAgg = await StockLedger.aggregate([
            {
              $match: {
                medicineId: { $in: ids },
                locationId: { $in: storeIdList },
              },
            },
            {
              $group: {
                _id: "$medicineId",
                originalInitialQuantity: {
                  $sum: {
                    $cond: [
                      { $eq: ["$transactionType", "GRN"] },
                      "$quantity",
                      0,
                    ],
                  },
                },
                sentOut: {
                  $sum: {
                    $cond: [
                      { $eq: ["$transactionType", "TRANSFER_OUT"] },
                      { $multiply: ["$quantity", -1] },
                      0,
                    ],
                  },
                },
              },
            },
            {
              $project: {
                originalInitialQuantity: 1,
                sentOut: 1,
                remainingQuantity: {
                  $subtract: ["$originalInitialQuantity", "$sentOut"],
                },
                remainingPct: {
                  $cond: [
                    { $gt: ["$originalInitialQuantity", 0] },
                    {
                      $multiply: [
                        {
                          $divide: [
                            {
                              $subtract: [
                                "$originalInitialQuantity",
                                "$sentOut",
                              ],
                            },
                            "$originalInitialQuantity",
                          ],
                        },
                        100,
                      ],
                    },
                    0,
                  ],
                },
              },
            },
          ]);
          const lifeMap = new Map(lifeAgg.map((r) => [r._id.toString(), r]));
          medicines.forEach((m) => {
            const rec = lifeMap.get(m._id.toString());
            if (rec) {
              m.set(
                "originalInitialQuantity",
                rec.originalInitialQuantity || 0,
                { strict: false }
              );
              m.set("remainingQuantity", rec.remainingQuantity || 0, {
                strict: false,
              });
              // initialQuantity alias to remaining per requirement
              m.set("initialQuantity", rec.remainingQuantity || 0, {
                strict: false,
              });
              m.set("sentOut", rec.sentOut || 0, { strict: false });
              m.set(
                "remainingPct",
                typeof rec.remainingPct === "number"
                  ? Math.round(rec.remainingPct * 100) / 100
                  : 0,
                { strict: false }
              );
            } else {
              m.set("originalInitialQuantity", 0, { strict: false });
              m.set("remainingQuantity", 0, { strict: false });
              m.set("initialQuantity", 0, { strict: false });
              m.set("sentOut", 0, { strict: false });
              m.set("remainingPct", 0, { strict: false });
            }
          });
        }
      }
    }
    res.status(200).json({ success: true, medicines });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// Create or reuse medicine and optionally record initial GRN
export const createMedicine = async (req, res) => {
  try {
    let createdBy = req.body.createdBy;
    const headerToken =
      req.cookies?.access_token || req.headers.authorization?.split(" ")[1];
    if (headerToken) {
      try {
        const decoded = jwt.verify(headerToken, process.env.SECRET);
        const user = await User.findById(decoded.id);
        if (user) createdBy = user.username;
      } catch {
        /* ignore */
      }
    }
    const body = { ...req.body, createdBy };
    if (typeof body.supplier === "string") {
      const trimmed = body.supplier.trim();
      if (!trimmed) delete body.supplier;
    }
    if (body.sellingPrice == null && body.purchasePrice != null) {
      body.sellingPrice = Number(body.purchasePrice) * 1.25;
    }
    if (typeof body.batchNumber === "string")
      body.batchNumber = body.batchNumber.trim();
    if (!body.batchNumber)
      return res
        .status(400)
        .json({ success: false, message: "batchNumber is required" });
    if (body.supplier) {
      const raw = body.supplier.trim();
      if (mongoose.Types.ObjectId.isValid(raw)) {
        const sup = await Supplier.findById(raw);
        if (sup) body.supplier = sup._id;
        else delete body.supplier;
      } else {
        const sup = await Supplier.findOne({
          supplierName: { $regex: `^${raw}$`, $options: "i" },
        });
        if (sup) body.supplier = sup._id;
        else {
          const newSup = new Supplier({
            supplierName: raw,
            phoneNumber: "unknown",
            address: "",
          });
          await newSup.save();
          body.supplier = newSup._id;
        }
      }
    }
    const match = {
      medicineName: body.medicineName,
      brand: body.brand || null,
      batchNumber: body.batchNumber,
      expiryDate: body.expiryDate,
      purchasePrice: body.purchasePrice,
      supplier: body.supplier || null,
      isDeleted: false,
    };
    Object.keys(match).forEach((k) => match[k] === null && delete match[k]);
    let medicine = await Medicine.findOne(match);
    if (!medicine) {
      medicine = new Medicine(body);
      await medicine.save();
    }
    if (body.quantity && Number(body.quantity) > 0) {
      let central = null;
      if (req.body.storeId) central = await Store.findById(req.body.storeId);
      if (!central) central = await Store.findOne();
      if (central) {
        const qty = Number(body.quantity);
        const ledger = await StockLedger.create({
          medicineId: medicine._id,
          locationId: central._id,
          quantity: qty,
          transactionType: "GRN",
          sourceDocType: "GRN",
          sourceDocId: req.body.sourceDocId || undefined,
          unitCost: body.purchasePrice,
          expiryDate: body.expiryDate,
        });
        await StockBalance.updateOne(
          { medicineId: medicine._id, locationId: central._id },
          {
            $inc: { onHandQty: qty },
            $set: { lastTxnAt: new Date(), lastTxnId: ledger._id },
          },
          { upsert: true }
        );
      }
    }
    res
      .status(201)
      .json({ success: true, message: "Medicine upserted", medicine });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine)
      return res
        .status(404)
        .json({ success: false, message: "Medicine not found" });
    res.status(200).json({ success: true, medicine });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateMedicine = async (req, res) => {
  try {
    const update = { ...req.body };
    if (typeof update.supplier === "string") {
      const trimmed = update.supplier.trim();
      if (!trimmed) delete update.supplier;
      else {
        if (mongoose.Types.ObjectId.isValid(trimmed)) {
          const sup = await Supplier.findById(trimmed);
          if (sup) update.supplier = sup._id;
          else delete update.supplier;
        } else {
          const sup = await Supplier.findOne({
            supplierName: { $regex: `^${trimmed}$`, $options: "i" },
          });
          if (sup) update.supplier = sup._id;
          else {
            const newSup = new Supplier({
              supplierName: trimmed,
              phoneNumber: "unknown",
              address: "",
            });
            await newSup.save();
            update.supplier = newSup._id;
          }
        }
      }
    }
    if (update.sellingPrice == null && update.purchasePrice != null) {
      update.sellingPrice = Number(update.purchasePrice) * 1.25;
    }
    if (typeof update.batchNumber === "string") {
      update.batchNumber = update.batchNumber.trim();
    }
    if (update.batchNumber === "") {
      return res
        .status(400)
        .json({ success: false, message: "batchNumber cannot be empty" });
    }
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, update, {
      new: true,
    }).populate("supplier");
    if (!medicine)
      return res
        .status(404)
        .json({ success: false, message: "Medicine not found" });
    res.status(200).json({
      success: true,
      message: "Medicine updated successfully",
      medicine,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine)
      return res
        .status(404)
        .json({ success: false, message: "Medicine not found" });
    if (medicine.isDeleted) {
      return res
        .status(400)
        .json({ success: false, message: "Already deleted" });
    }
    medicine.isDeleted = true;
    medicine.deletedAt = new Date();
    // deletedBy could be set from auth user (placeholder)
    medicine.deletedBy = "admin";
    await medicine.save();
    res.status(200).json({ success: true, message: "Medicine moved to trash" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const restoreMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine)
      return res
        .status(404)
        .json({ success: false, message: "Medicine not found" });
    if (!medicine.isDeleted)
      return res
        .status(400)
        .json({ success: false, message: "Medicine is not deleted" });
    medicine.isDeleted = false;
    medicine.deletedAt = undefined;
    medicine.deletedBy = undefined;
    await medicine.save();
    res
      .status(200)
      .json({ success: true, message: "Medicine restored", medicine });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const purgeMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine)
      return res
        .status(404)
        .json({ success: false, message: "Medicine not found" });
    if (!medicine.isDeleted)
      return res
        .status(400)
        .json({ success: false, message: "Not in trash; delete first" });
    await Medicine.deleteOne({ _id: medicine._id });
    res
      .status(200)
      .json({ success: true, message: "Medicine permanently removed" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Active medicines (not deleted & not expired as of today)
export const getActiveMedicines = async (_req, res) => {
  try {
    const today = new Date();
    const medicines = await Medicine.find({
      isDeleted: false,
      expiryDate: { $gte: today },
    }).populate("supplier");
    res.json({ success: true, medicines });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
