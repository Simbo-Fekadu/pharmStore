import Medicine from "../models/medicine.model.js";

// Create medicine
export const createMedicine = async (req, res) => {
  try {
    const medicine = new Medicine(req.body);
    await medicine.save();
    res
      .status(201)
      .json({
        success: true,
        message: "Medicine created successfully",
        medicine,
      });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all medicines
export const getMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find();
    res.status(200).json({ success: true, medicines });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get medicine by ID
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

// Update medicine
export const updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!medicine)
      return res
        .status(404)
        .json({ success: false, message: "Medicine not found" });
    res
      .status(200)
      .json({
        success: true,
        message: "Medicine updated successfully",
        medicine,
      });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete medicine
export const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine)
      return res
        .status(404)
        .json({ success: false, message: "Medicine not found" });
    res
      .status(200)
      .json({ success: true, message: "Medicine deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
