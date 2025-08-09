import jwt from "jsonwebtoken";
import Medicine from "../models/medicine.model.js";
import User from "../models/user.model.js";

export const createMedicine = async (req, res, next) => {
  try {
    // Get token from cookie or header
    const token =
      req.cookies.access_token || req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    // Verify token and decode payload
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Find the user by decoded ID
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Create medicine with `createdBy` = username
    const medicineData = {
      ...req.body,
      createdBy: user.username,
    };

    const medicine = new Medicine(medicineData);
    const savedMedicine = await medicine.save();

    res
      .status(201)
      .json({
        success: true,
        message: "Medicine registered successfully",
        medicine: savedMedicine,
      });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
