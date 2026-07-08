import Supplier from "../models/supplier.model.js";

// Create supplier
export const createSupplier = async (req, res) => {
  try {
    const allowed = ["supplierName", "phoneNumber", "address"];
    const body = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) body[field] = req.body[field];
    }
    if (req.pharmacyId) body.pharmacy = req.pharmacyId;
    const supplier = new Supplier(body);
    await supplier.save();
    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      supplier,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all suppliers
export const getSuppliers = async (req, res) => {
  try {
    const filter = {};
    if (req.pharmacyId) filter.pharmacy = req.pharmacyId;
    const suppliers = await Supplier.find(filter);
    res.status(200).json({ success: true, suppliers });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get supplier by ID
export const getSupplier = async (req, res) => {
  try {
    const q = { _id: req.params.id };
    if (req.pharmacyId) q.pharmacy = req.pharmacyId;
    const supplier = await Supplier.findOne(q);
    if (!supplier)
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    res.status(200).json({ success: true, supplier });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update supplier
export const updateSupplier = async (req, res) => {
  try {
    const allowed = ["supplierName", "phoneNumber", "address"];
    const update = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }
    const q = { _id: req.params.id };
    if (req.pharmacyId) q.pharmacy = req.pharmacyId;
    const supplier = await Supplier.findOneAndUpdate(q, update, {
      new: true,
    });
    if (!supplier)
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    res.status(200).json({
      success: true,
      message: "Supplier updated successfully",
      supplier,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete supplier
export const deleteSupplier = async (req, res) => {
  try {
    const q = { _id: req.params.id };
    if (req.pharmacyId) q.pharmacy = req.pharmacyId;
    const supplier = await Supplier.findOneAndDelete(q);
    if (!supplier)
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    res
      .status(200)
      .json({ success: true, message: "Supplier deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
