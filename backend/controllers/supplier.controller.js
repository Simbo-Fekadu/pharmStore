import Supplier from "../models/supplier.model.js";
import errorHandler from "../utils/error.js";

export const createSupplier = async (req, res, next) => {
  try {
    const allowed = ["supplierName", "phoneNumber", "address"];
    const body = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) body[field] = req.body[field];
    }
    if (req.pharmacyId) body.pharmacy = req.pharmacyId;
    const supplier = await Supplier.create(body);
    res.status(201).json({ success: true, message: "Supplier created successfully", supplier });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const getSuppliers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.pharmacyId) filter.pharmacy = req.pharmacyId;
    const suppliers = await Supplier.find(filter);
    res.status(200).json({ success: true, suppliers });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const getSupplier = async (req, res, next) => {
  try {
    const q = { _id: req.params.id };
    if (req.pharmacyId) q.pharmacy = req.pharmacyId;
    const supplier = await Supplier.findOne(q);
    if (!supplier) return next(errorHandler(404, "Supplier not found"));
    res.status(200).json({ success: true, supplier });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const updateSupplier = async (req, res, next) => {
  try {
    const allowed = ["supplierName", "phoneNumber", "address"];
    const update = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }
    const q = { _id: req.params.id };
    if (req.pharmacyId) q.pharmacy = req.pharmacyId;
    const supplier = await Supplier.findOneAndUpdate(q, update, { new: true });
    if (!supplier) return next(errorHandler(404, "Supplier not found"));
    res.status(200).json({ success: true, message: "Supplier updated successfully", supplier });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const deleteSupplier = async (req, res, next) => {
  try {
    const q = { _id: req.params.id };
    if (req.pharmacyId) q.pharmacy = req.pharmacyId;
    const supplier = await Supplier.findOneAndDelete(q);
    if (!supplier) return next(errorHandler(404, "Supplier not found"));
    res.status(200).json({ success: true, message: "Supplier deleted successfully" });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};
