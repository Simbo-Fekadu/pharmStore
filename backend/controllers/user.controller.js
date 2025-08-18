import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import errorHandler from "../utils/error.js";

// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().populate("branches");
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get user by ID
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("branches");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update user
export const updateUser = async (req, res, next) => {
  try {
    // Prevent role escalation by non-admin (should be enforced by middleware too)
    if (req.body.role && req.user.role !== "admin") {
      return next(errorHandler(403, "Cannot change role"));
    }
    // If password provided, hash it
    if (req.body.password) {
      req.body.password = bcrypt.hashSync(req.body.password, 10);
    }
    // If branches provided ensure it's an array of ids
    if (req.body.branches && !Array.isArray(req.body.branches)) {
      return res
        .status(400)
        .json({ success: false, message: "branches must be an array" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate("branches");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res
      .status(200)
      .json({ success: true, message: "User updated successfully", user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    if (user.role === "admin" && req.user.role !== "admin") {
      return next(errorHandler(403, "Cannot delete admin"));
    }
    await User.deleteOne({ _id: user._id });
    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const { username, email, password, branches } = req.body;
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    }
    const hashed = bcrypt.hashSync(password, 10);
    const user = new User({
      username,
      email,
      password: hashed,
      role: "employee",
      branches: Array.isArray(branches) ? branches : [],
    });
    await user.save();
    const { password: _p, ...safe } = user._doc;
    res
      .status(201)
      .json({ success: true, message: "Employee created", user: safe });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
