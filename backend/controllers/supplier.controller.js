import Supplier from "../models/supplier.model.js";

// Create supplier
export const createSupplier = async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    res
      .status(201)
      .json({
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
    const suppliers = await Supplier.find();
    res.status(200).json({ success: true, suppliers });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get supplier by ID
export const getSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
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
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!supplier)
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    res
      .status(200)
      .json({
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
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
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
