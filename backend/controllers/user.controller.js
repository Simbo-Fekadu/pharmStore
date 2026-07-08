import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import errorHandler from "../utils/error.js";

export const getUsers = async (req, res, next) => {
  try {
    const q = {};
    if (req.user?.role !== "super_admin") {
      if (req.user?.pharmacy) q.pharmacy = req.user.pharmacy;
    } else if (req.query?.pharmacyId) {
      q.pharmacy = req.query.pharmacyId;
    }
    const users = await User.find(q).populate("branch");
    res.status(200).json({ success: true, users });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate("branch");
    if (!user) return next(errorHandler(404, "User not found"));
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const allowedFields = ["username", "email", "password", "role", "branch"];
    const update = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }
    if (update.role && !["admin", "super_admin"].includes(req.user.role)) {
      return next(errorHandler(403, "Cannot change role"));
    }
    if (update.role === "super_admin") {
      return next(errorHandler(403, "Cannot assign super_admin role"));
    }
    if (update.password) {
      update.password = bcrypt.hashSync(update.password, 10);
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).populate("branch");
    if (!user) return next(errorHandler(404, "User not found"));
    res.status(200).json({ success: true, message: "User updated successfully", user });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(errorHandler(404, "User not found"));
    if (user.role === "super_admin") {
      return next(errorHandler(403, "Cannot delete super admin via this route"));
    }
    if (user.role === "admin" && !["admin", "super_admin"].includes(req.user.role)) {
      return next(errorHandler(403, "Cannot delete admin"));
    }
    await User.deleteOne({ _id: user._id });
    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const createEmployee = async (req, res, next) => {
  try {
    const { username, email, password, branch } = req.body;
    if (!username || !email || !password) return next(errorHandler(400, "Missing fields"));
    const hashed = bcrypt.hashSync(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashed,
      role: "employee",
      branch: branch || undefined,
      pharmacy: req.user?.pharmacy || undefined,
    });
    const { password: _p, ...safe } = user._doc;
    res.status(201).json({ success: true, message: "Employee created", user: safe });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const listMyBranchEmployees = async (req, res, next) => {
  try {
    const branchId = req.user?.branch;
    if (!branchId) return res.status(200).json({ success: true, users: [] });
    const users = await User.find({
      branch: branchId,
      role: { $in: ["employee", "inventory_manager"] },
    }).select("_id username email role branch");
    res.status(200).json({ success: true, users });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};
