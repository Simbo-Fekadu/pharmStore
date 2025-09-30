import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import errorHandler from "../utils/error.js";
import Medicine from "../models/medicine.model.js";
import Supplier from "../models/supplier.model.js";
import Branch from "../models/branch.model.js";
import Request from "../models/request.model.js";
import { StockBalance, StockLedger } from "../models/inventory.model.js";

// Audit log is a stub for now; later you can persist to a collection
function logAudit(action, actorId, meta = {}) {
  // Replace with DB persistence later
  console.log(
    `[Audit] action=${action} actor=${actorId} meta=${JSON.stringify(meta)}`
  );
}

export const listAllUsers = async (_req, res) => {
  const users = await User.find().populate("branch").select("-password");
  res.json({ success: true, users });
};

export const createUserAnyRole = async (req, res, next) => {
  try {
    const { username, email, password, role, branch } = req.body;
    if (!username || !email || !password) {
      return next(errorHandler(400, "Missing fields"));
    }
    if (role === "super_admin") {
      return next(errorHandler(403, "Cannot create super_admin via API"));
    }
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return next(errorHandler(409, "User with email or username exists"));
    }
    const hashed = bcrypt.hashSync(password, 10);
    const user = new User({
      username,
      email,
      password: hashed,
      role: role || "employee",
      branch,
    });
    await user.save();
    logAudit("create_user", req.user.id, { target: user._id, role: user.role });
    const { password: _p, ...safe } = user._doc;
    res.status(201).json({ success: true, user: safe });
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

export const updateUserAnyRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };
    if (body.role === "super_admin") {
      return next(errorHandler(403, "Cannot assign super_admin"));
    }
    if (body.password) {
      body.password = bcrypt.hashSync(body.password, 10);
    }
    const user = await User.findByIdAndUpdate(id, body, { new: true }).select(
      "-password"
    );
    if (!user) return next(errorHandler(404, "User not found"));
    logAudit("update_user", req.user.id, { target: user._id });
    res.json({ success: true, user });
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

export const elevateToAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return next(errorHandler(404, "User not found"));
    if (user.role === "super_admin")
      return next(errorHandler(400, "Already super"));
    user.role = "admin";
    await user.save();
    logAudit("elevate_admin", req.user.id, { target: user._id });
    const { password: _p, ...safe } = user._doc;
    res.json({ success: true, user: safe });
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

export const deleteUserAny = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return next(errorHandler(404, "User not found"));
    if (user.role === "super_admin")
      return next(errorHandler(403, "Cannot delete super_admin"));
    await User.deleteOne({ _id: id });
    logAudit("delete_user", req.user.id, { target: id });
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

export const statsSummary = async (_req, res) => {
  const counts = await User.aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);
  res.json({ success: true, counts });
};

// Comprehensive system overview for super admin dashboard
export const systemOverview = async (_req, res, next) => {
  try {
    const now = new Date();
    const nearCut = new Date(Date.now() + 90 * 86400000); // 90 days

    // Parallel basic counts
    const [
      userRoleCountsRaw,
      branchesCount,
      suppliersCount,
      totalActiveMedicines,
      expiredMedicines,
      nearExpiryMedicines,
      deletedMedicines,
      pendingRequestsCount,
      topCategoriesRaw,
      stockAgg,
      recentRequestsRaw,
      recentLedgerRaw,
    ] = await Promise.all([
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Branch.countDocuments(),
      Supplier.countDocuments(),
      Medicine.countDocuments({ isDeleted: false }),
      Medicine.countDocuments({ isDeleted: false, expiryDate: { $lt: now } }),
      Medicine.countDocuments({
        isDeleted: false,
        expiryDate: { $gte: now, $lte: nearCut },
      }),
      Medicine.countDocuments({ isDeleted: true }),
      Request.countDocuments({ status: "Pending" }),
      Medicine.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: "$category",
            totalQty: { $sum: { $ifNull: ["$quantity", 0] } },
          },
        },
        { $sort: { totalQty: -1 } },
        { $limit: 8 },
      ]),
      StockBalance.aggregate([
        {
          $group: {
            _id: null,
            totalOnHand: { $sum: { $ifNull: ["$onHandQty", 0] } },
            distinctMedicines: { $addToSet: "$medicineId" },
          },
        },
      ]),
      Request.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("medicine", "medicineName")
        .populate("branch", "name")
        .lean(),
      StockLedger.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .select(
          "medicineId locationId quantity transactionType createdAt status"
        )
        .populate("medicineId", "medicineName")
        .populate("locationId", "name")
        .lean(),
    ]);

    const userRoleCounts = userRoleCountsRaw.reduce(
      (acc, r) => ({ ...acc, [r._id]: r.count }),
      {}
    );
    const stockInfo = stockAgg[0] || {
      totalOnHand: 0,
      distinctMedicines: [],
    };

    const overview = {
      users: {
        total: Object.values(userRoleCounts).reduce((a, b) => a + b, 0),
        byRole: userRoleCounts,
      },
      branches: { total: branchesCount },
      suppliers: { total: suppliersCount },
      medicines: {
        totalActive: totalActiveMedicines,
        nearExpiry: nearExpiryMedicines,
        expired: expiredMedicines,
        deleted: deletedMedicines,
      },
      inventory: {
        totalOnHand: stockInfo.totalOnHand || 0,
        distinctMedicines: (stockInfo.distinctMedicines || []).length,
      },
      requests: {
        pending: pendingRequestsCount,
        recent: recentRequestsRaw.map((r) => ({
          id: r._id,
            medicine: r.medicine?.medicineName,
            branch: r.branch?.name,
            qty: r.quantity,
            status: r.status,
            createdAt: r.createdAt,
          })),
      },
      recentTransactions: recentLedgerRaw.map((l) => ({
        id: l._id,
        medicine: l.medicineId?.medicineName,
        location: l.locationId?.name,
        qty: l.quantity,
        type: l.transactionType,
        status: l.status,
        createdAt: l.createdAt,
      })),
      topCategories: topCategoriesRaw.map((c) => ({
        category: c._id,
        totalQty: c.totalQty,
      })),
      generatedAt: new Date(),
    };

    res.json({ success: true, overview });
  } catch (e) {
    next(errorHandler(500, e.message));
  }
};
