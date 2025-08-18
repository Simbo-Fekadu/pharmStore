import jwt from "jsonwebtoken";
import Medicine from "../models/medicine.model.js";
import User from "../models/user.model.js";
import Supplier from "../models/supplier.model.js";
import mongoose from "mongoose";

// Unified CRUD controller (previously split across two files)
export const createMedicine = async (req, res) => {
  try {
    // optional auth: attach createdBy if token provided
    let createdBy = req.body.createdBy;
    const headerToken =
      req.cookies?.access_token || req.headers.authorization?.split(" ")[1];
    if (headerToken) {
      try {
        const decoded = jwt.verify(headerToken, process.env.SECRET);
        const user = await User.findById(decoded.id);
        if (user) createdBy = user.username;
      } catch {
        /* ignore token errors */
      }
    }
    const body = { ...req.body, createdBy };
    if (typeof body.supplier === "string") {
      const trimmed = body.supplier.trim();
      if (!trimmed) delete body.supplier; // prevent cast error on empty string
    }
    if (body.sellingPrice == null && body.purchasePrice != null) {
      body.sellingPrice = Number(body.purchasePrice) * 1.25;
    }
    if (typeof body.batchNumber === "string") {
      body.batchNumber = body.batchNumber.trim();
    }
    if (!body.batchNumber) {
      return res
        .status(400)
        .json({ success: false, message: "batchNumber is required" });
    }
    // Map supplier: allow either ObjectId string or supplierName
    if (body.supplier) {
      const raw = body.supplier.trim();
      if (mongoose.Types.ObjectId.isValid(raw)) {
        // verify supplier exists
        const sup = await Supplier.findById(raw);
        if (sup) body.supplier = sup._id;
        else delete body.supplier; // silently drop if invalid id
      } else if (raw) {
        // treat as supplier name (case-insensitive)
        const sup = await Supplier.findOne({
          supplierName: { $regex: `^${raw}$`, $options: "i" },
        });
        if (sup) body.supplier = sup._id;
        else {
          // auto-create minimal supplier with placeholder phone (can be updated later)
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
    const medicine = new Medicine(body);
    await medicine.save();
    res.status(201).json({
      success: true,
      message: "Medicine created successfully",
      medicine,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMedicines = async (req, res) => {
  try {
    const { includeDeleted } = req.query;
    const filter = includeDeleted === "true" ? {} : { isDeleted: false };
    const medicines = await Medicine.find(filter).populate("supplier");
    res.status(200).json({ success: true, medicines });
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
