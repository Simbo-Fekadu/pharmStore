import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Medicine from "../models/medicine.model.js";
import User from "../models/user.model.js";
import Supplier from "../models/supplier.model.js";
import Store from "../models/store.model.js";
import Branch from "../models/branch.model.js"; // added for branch direct stock
import { StockLedger, StockBalance } from "../models/inventory.model.js";
import Papa from "papaparse";
import xlsx from "xlsx";

// List medicines with optional stock & lifecycle metrics
export const getMedicines = async (req, res) => {
  try {
    const { includeDeleted, withStock, storeOnly, centralNet } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const filter = includeDeleted === "true" ? {} : { isDeleted: false };
    // Scope by pharmacy if provided/attached
    if (req.pharmacyId) filter.pharmacy = req.pharmacyId;
    const [medicines, totalCount] = await Promise.all([
      Medicine.find(filter).populate("supplier").skip(skip).limit(limit),
      Medicine.countDocuments(filter),
    ]);
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
        // Include all locations (stores + branches) for total central net calculation
        const allLocations = await Promise.all([
          Store.find({}, "_id").lean(),
          Branch.find({}, "_id").lean(),
        ]);
        const locationIdList = [...allLocations[0], ...allLocations[1]].map(
          (loc) => loc._id
        );
        if (locationIdList.length) {
          const netAgg = await StockLedger.aggregate([
            {
              $match: {
                medicineId: { $in: ids },
                locationId: { $in: locationIdList },
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
        // Include all locations (stores + branches) for total remaining calculation
        const allLocations = await Promise.all([
          Store.find({}, "_id").lean(),
          Branch.find({}, "_id").lean(),
        ]);
        const locationIdList = [...allLocations[0], ...allLocations[1]].map(
          (loc) => loc._id
        );
        if (locationIdList.length) {
          const lifeAgg = await StockLedger.aggregate([
            {
              $match: {
                medicineId: { $in: ids },
                locationId: { $in: locationIdList },
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
    res.status(200).json({ success: true, page, limit, totalCount, medicines });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// Create or reuse medicine and optionally record initial GRN
export const createMedicine = async (req, res) => {
  try {
    // Track where initial stock was added (for response)
    let addedToLocationId = null;
    let addedToLocationIsBranch = false;
    let createdBy = req.body.createdBy;
    const headerToken =
      req.cookies?.access_token || req.headers.authorization?.split(" ")[1];
    if (headerToken) {
      try {
        const decoded = jwt.verify(headerToken, process.env.SECRET);
        const user = await User.findById(decoded.id);
        if (user) createdBy = user.username;
        // Attach decoded user to request-local variable for later branch logic
        req._authUser = user;
      } catch {
        /* ignore */
      }
    }
    const allowedFields = [
      "medicineName",
      "brand",
      "category",
      "unit",
      "baseUnit",
      "packUnit",
      "packSize",
      "batchNumber",
      "expiryDate",
      "purchasePrice",
      "sellingPriceBase",
      "sellingPricePack",
      "sellingPrice",
      "quantity",
      "supplier",
      "createdBy",
    ];
    const body = { createdBy };
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) body[field] = req.body[field];
    }
    if (req.pharmacyId) body.pharmacy = req.pharmacyId;
    // Basic required field validation before hitting Mongoose so we can return clearer messages
    const problems = [];
    if (
      !body.medicineName ||
      typeof body.medicineName !== "string" ||
      !body.medicineName.trim()
    ) {
      problems.push("medicineName is required");
    }
    if (body.purchasePrice == null || isNaN(Number(body.purchasePrice))) {
      problems.push("purchasePrice must be a number");
    }
    if (!body.expiryDate) {
      problems.push("expiryDate is required");
    } else if (isNaN(new Date(body.expiryDate).getTime())) {
      problems.push("expiryDate is invalid");
    }
    if (problems.length) {
      return res
        .status(400)
        .json({ success: false, message: problems.join(", ") });
    }
    // If a client provided a non-ObjectId _id (e.g. ULID from offline cache) drop it so Mongo can generate one
    if (body._id && !mongoose.Types.ObjectId.isValid(body._id)) {
      delete body._id;
    }
    if (typeof body.supplier === "string") {
      const trimmed = body.supplier.trim();
      if (!trimmed) delete body.supplier;
    }
    // Let model pre-save compute sellingPrice from category (COSMETICS 1.35 else 1.25)
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
          supplierName: {
            $regex: `^${raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            $options: "i",
          },
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
    // Match should also consider pharmacy if scoped
    if (req.pharmacyId) match.pharmacy = req.pharmacyId;
    let medicine = await Medicine.findOne(match);
    if (!medicine) {
      medicine = new Medicine(body);
      await medicine.save();
    }
    if (body.quantity && Number(body.quantity) > 0) {
      // Determine target location: employee/inventory_manager -> their branch, else central store (optionally explicit branchId / storeId)
      let locationDoc = null;
      let isBranch = false;
      const desiredBranchId = req.body.branchId; // allow admin to force branch add
      if (desiredBranchId && mongoose.Types.ObjectId.isValid(desiredBranchId)) {
        locationDoc = await Branch.findById(desiredBranchId);
        if (locationDoc) isBranch = true;
      }
      if (!locationDoc && req._authUser && req._authUser.branch) {
        locationDoc = await Branch.findById(req._authUser.branch);
        if (locationDoc) isBranch = true;
      }
      // If user is an employee (not admin/inventory_manager) and no branch resolved, abort instead of falling back to central
      if (!locationDoc && req._authUser && req._authUser.role === "employee") {
        return res
          .status(400)
          .json({ success: false, message: "Employee has no branch assigned" });
      }
      // fallback to store
      if (!locationDoc) {
        if (
          req.body.storeId &&
          mongoose.Types.ObjectId.isValid(req.body.storeId)
        ) {
          locationDoc = await Store.findById(req.body.storeId);
        }
        if (!locationDoc) locationDoc = await Store.findOne();
      }
      if (locationDoc) {
        // Convert to base units if quantity was provided in packs
        let qty = Number(body.quantity);
        try {
          const isPack =
            req.body.initialQuantityUnit === "pack" &&
            (body.packSize || req.body.packSize) > 1;
          const pz = Number(body.packSize || req.body.packSize) || 0;
          if (isPack && pz > 1) qty = qty * pz;
        } catch {
          /* ignore */
        }
        const ledger = await StockLedger.create({
          medicineId: medicine._id,
          locationId: locationDoc._id,
          quantity: qty,
          transactionType: "GRN", // treat as goods receipt
          sourceDocType: isBranch ? "DIRECT_BRANCH_STOCK" : "GRN",
          sourceDocId: req.body.sourceDocId || undefined,
          unitCost: body.purchasePrice,
          expiryDate: body.expiryDate,
          createdByUserId: req._authUser?._id,
          notes: isBranch ? "Direct branch stock addition" : undefined,
        });
        await StockBalance.updateOne(
          { medicineId: medicine._id, locationId: locationDoc._id },
          {
            $inc: { onHandQty: qty },
            $set: { lastTxnAt: new Date(), lastTxnId: ledger._id },
          },
          { upsert: true }
        );
        // record for response
        addedToLocationId = locationDoc._id;
        addedToLocationIsBranch = isBranch === true;
      }
    }
    res.status(201).json({
      success: true,
      message: "Medicine upserted",
      medicine,
      stockLocation: addedToLocationId
        ? {
            type: addedToLocationIsBranch ? "Branch" : "Store",
            id: addedToLocationId,
          }
        : null,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMedicine = async (req, res) => {
  try {
    const q = { _id: req.params.id };
    if (req.pharmacyId) q.pharmacy = req.pharmacyId;
    const medicine = await Medicine.findOne(q);
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
    const allowedFields = [
      "medicineName",
      "brand",
      "category",
      "unit",
      "baseUnit",
      "packUnit",
      "packSize",
      "batchNumber",
      "expiryDate",
      "purchasePrice",
      "sellingPriceBase",
      "sellingPricePack",
      "sellingPrice",
      "supplier",
    ];
    const update = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }
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
            supplierName: {
              $regex: `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              $options: "i",
            },
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
    if (typeof update.batchNumber === "string") {
      update.batchNumber = update.batchNumber.trim();
    }
    if (update.batchNumber === "") {
      return res
        .status(400)
        .json({ success: false, message: "batchNumber cannot be empty" });
    }
    const q = { _id: req.params.id };
    if (req.pharmacyId) q.pharmacy = req.pharmacyId;
    const medicine = await Medicine.findOneAndUpdate(q, update, {
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
    const q = { _id: req.params.id };
    if (req.pharmacyId) q.pharmacy = req.pharmacyId;
    const medicine = await Medicine.findOne(q);
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
    const q = { _id: req.params.id };
    if (req.pharmacyId) q.pharmacy = req.pharmacyId;
    const medicine = await Medicine.findOne(q);
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
    const q = { _id: req.params.id };
    if (req.pharmacyId) q.pharmacy = req.pharmacyId;
    const medicine = await Medicine.findOne(q);
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
export const getActiveMedicines = async (req, res) => {
  try {
    const today = new Date();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const q = { isDeleted: false, expiryDate: { $gte: today } };
    if (req.pharmacyId) q.pharmacy = req.pharmacyId;
    const [medicines, totalCount] = await Promise.all([
      Medicine.find(q).populate("supplier").skip(skip).limit(limit),
      Medicine.countDocuments(q),
    ]);
    res.json({ success: true, page, limit, totalCount, medicines });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Near-expiry medicines (expiring within N days, default 90)
export const getNearExpiryMedicines = async (req, res) => {
  try {
    const days = Math.max(1, Number(req.query.days) || 90);
    const now = new Date();
    const cutoff = new Date(Date.now() + days * 86400000);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const q = { isDeleted: false, expiryDate: { $gte: now, $lte: cutoff } };
    if (req.pharmacyId) q.pharmacy = req.pharmacyId;
    const [medicines, totalCount] = await Promise.all([
      Medicine.find(q).populate("supplier").skip(skip).limit(limit),
      Medicine.countDocuments(q),
    ]);
    res.json({ success: true, page, limit, totalCount, medicines });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Expired medicines
export const getExpiredMedicines = async (req, res) => {
  try {
    const now = new Date();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const q = { expiryDate: { $lt: now } };
    if (req.pharmacyId) q.pharmacy = req.pharmacyId;
    const [medicines, totalCount] = await Promise.all([
      Medicine.find(q).populate("supplier").skip(skip).limit(limit),
      Medicine.countDocuments(q),
    ]);
    res.json({ success: true, page, limit, totalCount, medicines });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Helper to normalize category values from import files
const normalizeCategory = (raw) => {
  if (!raw) return "MISCELLANEOUS";
  const v = String(raw).trim().toUpperCase();
  const allowed = new Set([
    "ANTIBIOTICS",
    "CNS DRUGS",
    "VITAMINS & MINERALS",
    "RESPIRATORY DRUGS",
    "ENT DRUGS",
    "GI DRUGS",
    "ANALGESICS/ANTIHISTAMINS",
    "HORMONES",
    "DERMATOLOGICALS",
    "CVS DRUGS",
    "MISCELLANEOUS",
    "COSMETICS",
  ]);
  if (allowed.has(v)) return v;
  if (["COSMETIC", "COSMETICS"].includes(v)) return "COSMETICS";
  return "MISCELLANEOUS";
};

// Utility: robust date parsing supporting Excel serials & common formats
function parseExpiry(raw) {
  if (raw == null || raw === "") return null;
  // Excel serial number (days since 1899-12-30)
  if (typeof raw === "number" && raw > 20000 && raw < 80000) {
    const base = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(base.getTime() + raw * 86400000);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(raw).trim();
  if (!s) return null;
  // Normalize separators
  const norm = s.replace(/_/g, "-").replace(/\//g, "-");
  // YYYY-MM-DD direct
  let m = norm.match(/^([0-9]{4})-([0-1][0-9])-([0-3][0-9])$/);
  if (m) {
    const d = new Date(norm + "T00:00:00Z");
    return isNaN(d.getTime()) ? null : d;
  }
  // DD-MM-YYYY or D-M-YYYY
  m = norm.match(/^([0-3]?\d)-([0-1]?\d)-([0-9]{4})$/);
  if (m) {
    const [_, dd, mm, yyyy] = m;
    const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    const d = new Date(iso + "T00:00:00Z");
    return isNaN(d.getTime()) ? null : d;
  }
  // MM-DD-YYYY
  m = norm.match(/^([0-1]?\d)-([0-3]?\d)-([0-9]{4})$/);
  if (m) {
    const [_, mm, dd, yyyy] = m;
    const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    const d = new Date(iso + "T00:00:00Z");
    return isNaN(d.getTime()) ? null : d;
  }
  const direct = new Date(s);
  if (!isNaN(direct.getTime())) return direct;
  return null;
}

// Bulk import medicines from CSV or Excel with improved validation
export const importMedicines = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    const buf = req.file.buffer;
    const name = req.file.originalname || "upload";
    let rows = [];
    if (name.toLowerCase().endsWith(".csv")) {
      const parsed = Papa.parse(buf.toString("utf8"), {
        header: true,
        skipEmptyLines: true,
      });
      if (parsed.errors?.length) {
        return res
          .status(400)
          .json({ success: false, message: parsed.errors[0].message });
      }
      rows = parsed.data;
    } else if (name.toLowerCase().match(/\.(xlsx|xlsm|xls)$/)) {
      const wb = xlsx.read(buf, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = xlsx.utils.sheet_to_json(ws, { defval: "" });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Unsupported file type" });
    }

    // Normalize header keys: trim & collapse spaces, lower-case map
    const normalizeKey = (k) =>
      String(k || "")
        .trim()
        .replace(/\s+/g, "")
        .replace(/_/g, "")
        .toLowerCase();
    const keyAliases = new Map([
      ["medicinename", "medicineName"],
      ["name", "medicineName"],
      ["brand", "brand"],
      ["category", "category"],
      ["unit", "unit"],
      ["baseunit", "baseUnit"],
      ["packunit", "packUnit"],
      ["packsize", "packSize"],
      ["batchnumber", "batchNumber"],
      ["batch", "batchNumber"],
      ["expirydate", "expiryDate"],
      ["expiry", "expiryDate"],
      ["exp", "expiryDate"],
      ["purchaseprice", "purchasePrice"],
      ["purchase", "purchasePrice"],
      ["quantity", "quantity"],
      ["qty", "quantity"],
      ["sellingpricebase", "sellingPriceBase"],
      ["sellingpricepack", "sellingPricePack"],
      ["supplier", "supplier"],
      ["sup", "supplier"],
      ["suppliername", "supplier"],
    ]);

    const remapRow = (row) => {
      if (!row || typeof row !== "object") return row;
      const out = {};
      for (const [k, v] of Object.entries(row)) {
        const norm = normalizeKey(k);
        const target = keyAliases.get(norm) || k;
        if (v !== undefined && v !== null && v !== "") out[target] = v;
      }
      return out;
    };
    rows = rows.map(remapRow);

    // Optional default store for initial stock
    let central = null;
    const stores = await Store.find({}, "_id").lean();
    if (stores.length) central = stores[0];

    const results = [];
    // Cache suppliers we lookup/create to minimize DB round-trips
    const supplierCache = new Map(); // key: lowercase name -> _id
    const idCache = new Set(); // track valid objectIds we already confirmed

    const resolveSupplier = async (raw) => {
      if (!raw) return undefined;
      const str = String(raw).trim();
      if (!str) return undefined;
      // If it looks like an ObjectId and exists, accept directly
      if (mongoose.Types.ObjectId.isValid(str)) {
        if (idCache.has(str)) return str; // already validated
        const existing = await Supplier.findById(str).lean();
        if (existing) {
          idCache.add(str);
          return existing._id;
        }
        // fall through to treat as name if no supplier with that id
      }
      const key = str.toLowerCase();
      if (supplierCache.has(key)) return supplierCache.get(key);
      // Try exact (case-insensitive) name match
      const existingByName = await Supplier.findOne({
        supplierName: {
          $regex: `^${str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          $options: "i",
        },
      }).lean();
      if (existingByName) {
        supplierCache.set(key, existingByName._id);
        return existingByName._id;
      }
      // Create new supplier on the fly
      const created = await Supplier.create({
        supplierName: str,
        phoneNumber: "unknown",
        address: "",
      });
      supplierCache.set(key, created._id);
      return created._id;
    };
    for (const r of rows) {
      try {
        // Expected headers (case-insensitive): name, brand, category, unit, baseUnit, packUnit, packSize, batchNumber, expiryDate, purchasePrice, quantity, sellingPriceBase, sellingPricePack, supplier
        const pick = (k) => r[k];
        const body = {
          medicineName:
            pick("medicineName") || pick("name") || pick("Medicine Name"),
          brand: pick("brand"),
          category: normalizeCategory(pick("category")),
          unit: pick("unit") || undefined,
          baseUnit: pick("baseUnit") || undefined,
          packUnit: pick("packUnit") || undefined,
          packSize: Number(pick("packSize")) || undefined,
          batchNumber: String(pick("batchNumber") || "").trim(),
          expiryDate: parseExpiry(
            pick("expiryDate") || pick("expiry") || pick("exp")
          ),
          purchasePrice: Number(pick("purchasePrice") || pick("purchase")),
          quantity: Number(pick("quantity") || 0),
          sellingPriceBase: Number(pick("sellingPriceBase") || 0) || undefined,
          sellingPricePack: Number(pick("sellingPricePack") || 0) || undefined,
          supplier: pick("supplier") || pick("sup") || undefined,
        };
        // Resolve supplier (string name or id) to ObjectId, else remove it
        try {
          body.supplier = await resolveSupplier(body.supplier);
          if (!body.supplier) delete body.supplier;
        } catch {
          delete body.supplier; // ignore supplier resolution failures
        }
        // Final defensive guard: if still a non-ObjectId string, drop or resolve
        if (
          body.supplier &&
          !mongoose.Types.ObjectId.isValid(String(body.supplier))
        ) {
          try {
            const again = await resolveSupplier(body.supplier);
            if (again) body.supplier = again;
            else delete body.supplier;
          } catch {
            delete body.supplier;
          }
        }
        const errs = [];
        if (!body.medicineName) errs.push("medicineName missing");
        if (!body.batchNumber) errs.push("batchNumber missing");
        if (!body.expiryDate) errs.push("expiryDate invalid");
        if (!Number.isFinite(body.purchasePrice) || body.purchasePrice <= 0)
          errs.push("purchasePrice invalid");
        if (body.packSize && body.packSize < 1) errs.push("packSize < 1");
        if (errs.length) {
          results.push({ ok: false, error: errs.join(", "), row: r });
          continue;
        }
        // Create via model to trigger pre-save logic
        const med = new Medicine(body);
        await med.save();
        // Initial stock to central store if quantity provided
        if (central && body.quantity && Number(body.quantity) > 0) {
          const qty = Number(body.quantity);
          await StockLedger.create({
            medicineId: med._id,
            locationId: central._id,
            quantity: qty,
            transactionType: "GRN",
            sourceDocType: "IMPORT",
            unitCost: body.purchasePrice,
            expiryDate: body.expiryDate,
          });
          await StockBalance.updateOne(
            { medicineId: med._id, locationId: central._id },
            { $inc: { onHandQty: qty }, $set: { lastTxnAt: new Date() } },
            { upsert: true }
          );
        }
        results.push({ ok: true, id: med._id });
      } catch (e) {
        results.push({ ok: false, error: e.message, row: r });
      }
    }
    const imported = results.filter((r) => r.ok).length;
    res.status(200).json({
      success: true,
      results,
      total: rows.length,
      imported,
      failed: results.length - imported,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Provide an Excel template for bulk medicine import
export const importTemplate = async (_req, res) => {
  try {
    const headers = [
      "medicineName",
      "brand",
      "category",
      "unit",
      "baseUnit",
      "packUnit",
      "packSize",
      "batchNumber",
      "expiryDate",
      "purchasePrice",
      "quantity",
      "sellingPriceBase",
      "sellingPricePack",
      "supplier",
    ];
    const sampleRows = [
      {
        medicineName: "Amoxicillin 500mg",
        brand: "Generic",
        category: "ANTIBIOTICS",
        unit: "Packet",
        baseUnit: "Strip",
        packUnit: "Packet",
        packSize: 10,
        batchNumber: "AMX-001",
        expiryDate: "2026-12-31",
        purchasePrice: 250,
        quantity: 5,
        sellingPriceBase: 0, // optional; leave 0 to auto-calc
        sellingPricePack: 0,
        supplier: "Default Supplier",
      },
      {
        medicineName: "Vitamin C 100mg",
        brand: "NutriPlus",
        category: "VITAMINS & MINERALS",
        unit: "Bottle",
        baseUnit: "Bottle",
        packUnit: "",
        packSize: "",
        batchNumber: "VTC-010",
        expiryDate: "2027-03-31",
        purchasePrice: 75,
        quantity: 20,
        sellingPriceBase: 0,
        sellingPricePack: "",
        supplier: "HealthCorp",
      },
      {
        medicineName: "Hydrocortisone Cream 1%",
        brand: "DermaCare",
        category: "DERMATOLOGICALS",
        unit: "Tube",
        baseUnit: "Tube",
        packUnit: "",
        packSize: "",
        batchNumber: "HDR-777",
        expiryDate: "2026-08-15",
        purchasePrice: 40,
        quantity: 50,
        sellingPriceBase: 0,
        sellingPricePack: "",
        supplier: "SkinMed",
      },
      {
        medicineName: "Face Wash 200ml",
        brand: "Glow",
        category: "COSMETICS",
        unit: "Bottle",
        baseUnit: "Bottle",
        packUnit: "",
        packSize: "",
        batchNumber: "COS-555",
        expiryDate: "2027-01-30",
        purchasePrice: 90,
        quantity: 30,
        sellingPriceBase: 0,
        sellingPricePack: "",
        supplier: "CosmoLab",
      },
    ];

    // Build worksheet ensuring header order
    const wsData = [
      headers,
      ...sampleRows.map((r) => headers.map((h) => r[h] ?? "")),
    ];
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, "ImportTemplate");
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="medicine_import_template.xlsx"'
    );
    res.status(200).send(buf);
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: "Failed to generate template" });
  }
};

// Export medicines into a multi-sheet Excel (Active, NearExpiry, Expired)
export const exportMedicinesExcel = async (req, res) => {
  try {
    const nearDays = Number(process.env.NEAR_EXPIRY_DAYS || 30);
    const today = new Date();
    const startToday = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );
    const nearCutoff = new Date(startToday.getTime() + nearDays * 86400000);

    const q = { isDeleted: false };
    if (req.pharmacyId) q.pharmacy = req.pharmacyId;
    const all = await Medicine.find(q).populate("supplier").lean();
    const expired = [];
    const near = [];
    const active = [];
    for (const m of all) {
      const exp = new Date(m.expiryDate);
      if (exp < startToday) expired.push(m);
      else if (exp <= nearCutoff) near.push(m);
      else active.push(m);
    }

    const headers = [
      "medicineName",
      "brand",
      "category",
      "unit",
      "baseUnit",
      "packUnit",
      "packSize",
      "batchNumber",
      "expiryDate",
      "purchasePrice",
      "sellingPriceBase",
      "sellingPricePack",
      "supplierName",
      "createdAt",
    ];
    function mapRow(m) {
      return headers.map((h) => {
        switch (h) {
          case "supplierName":
            return m.supplier?.supplierName || "";
          case "expiryDate":
            return m.expiryDate
              ? new Date(m.expiryDate).toISOString().slice(0, 10)
              : "";
          case "createdAt":
            return m.createdAt ? new Date(m.createdAt).toISOString() : "";
          default:
            return m[h] == null ? "" : m[h];
        }
      });
    }
    const wb = xlsx.utils.book_new();
    const sheets = [
      ["Active", active],
      ["NearExpiry", near],
      ["Expired", expired],
    ];
    sheets.forEach(([name, list]) => {
      const data = [headers, ...list.map(mapRow)];
      const ws = xlsx.utils.aoa_to_sheet(data);
      xlsx.utils.book_append_sheet(wb, ws, name.substring(0, 31));
    });
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="medicines_export_${Date.now()}.xlsx"`
    );
    res.status(200).send(buf);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
