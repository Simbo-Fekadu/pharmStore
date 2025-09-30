import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import errorHandler from "../utils/error.js";
import Medicine from "../models/medicine.model.js";
import Supplier from "../models/supplier.model.js";
import Branch from "../models/branch.model.js";
import Request from "../models/request.model.js";
import { StockBalance, StockLedger } from "../models/inventory.model.js";
import Inventory from "../models/inventory.model.js";
import Pharmacy from "../models/pharmacy.model.js";

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

// List summary metrics per branch for super admin grid view
export const branchesOverview = async (_req, res, next) => {
  try {
    const branches = await Branch.find({}).lean();
    if (branches.length === 0) {
      return res.json({ success: true, branches: [] });
    }
    const branchIds = branches.map((b) => b._id);
    const now = new Date();
    const nearCut = new Date(Date.now() + 90 * 86400000);

    // Aggregate inventory by branch
    const invAgg = await Inventory.aggregate([
      { $match: { locationType: "Branch", locationId: { $in: branchIds } } },
      {
        $group: {
          _id: "$locationId",
          totalUnits: { $sum: { $ifNull: ["$quantity", 0] } },
          itemCount: { $sum: 1 },
          expired: {
            $sum: {
              $cond: [{ $lt: ["$expiryDate", now] }, 1, 0],
            },
          },
          nearExpiry: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$expiryDate", now] },
                    { $lte: ["$expiryDate", nearCut] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          latestInventoryUpdate: { $max: "$updatedAt" },
        },
      },
    ]);
    const invMap = invAgg.reduce((acc, r) => {
      acc[r._id.toString()] = r;
      return acc;
    }, {});

    // Pending requests per branch
    const reqAgg = await Request.aggregate([
      { $match: { branch: { $in: branchIds }, status: "Pending" } },
      { $group: { _id: "$branch", pending: { $sum: 1 } } },
    ]);
    const reqMap = reqAgg.reduce((acc, r) => {
      acc[r._id.toString()] = r.pending;
      return acc;
    }, {});

    const branchesOut = branches.map((b) => {
      const inv = invMap[b._id.toString()] || {};
      return {
        id: b._id,
        name: b.name,
        address: b.address,
        totalUnits: inv.totalUnits || 0,
        itemCount: inv.itemCount || 0,
        expired: inv.expired || 0,
        nearExpiry: inv.nearExpiry || 0,
        pendingRequests: reqMap[b._id.toString()] || 0,
        latestInventoryUpdate: inv.latestInventoryUpdate || null,
      };
    });
    res.json({ success: true, branches: branchesOut });
  } catch (e) {
    next(errorHandler(500, e.message));
  }
};

// Detail metrics for a single branch
export const branchDetailOverview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id).lean();
    if (!branch) return next(errorHandler(404, "Branch not found"));
    const now = new Date();
    const nearCut = new Date(Date.now() + 90 * 86400000);
    const invDocs = await Inventory.find({
      locationType: "Branch",
      locationId: id,
    })
      .populate("medicine", "medicineName category expiryDate")
      .lean();

    let totalUnits = 0;
    let expired = 0;
    let nearExpiry = 0;
    const items = [];
    for (const d of invDocs) {
      const qty = d.quantity || 0;
      totalUnits += qty;
      const exp = d.expiryDate || d.medicine?.expiryDate;
      if (exp) {
        const t = new Date(exp).getTime();
        if (t < now.getTime()) expired++;
        else if (t <= nearCut.getTime()) nearExpiry++;
      }
      items.push({
        id: d._id,
        medicine: d.medicine?.medicineName || "Unknown",
        category: d.medicine?.category,
        quantity: qty,
        expiryDate: exp,
      });
    }
    // Sort items by quantity desc and take top 15 for summary
    const topItems = items
      .slice()
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 15);

    const pendingRequests = await Request.countDocuments({
      branch: id,
      status: "Pending",
    });
    const recentRequests = await Request.find({ branch: id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("medicine", "medicineName")
      .lean();

    const recentTransactions = await StockLedger.find({ locationId: id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("medicineId quantity transactionType createdAt status")
      .populate("medicineId", "medicineName")
      .lean();

    const detail = {
      branch: { id: branch._id, name: branch.name, address: branch.address },
      inventory: {
        totalUnits,
        itemCount: invDocs.length,
        expired,
        nearExpiry,
        topItems,
      },
      requests: {
        pending: pendingRequests,
        recent: recentRequests.map((r) => ({
          id: r._id,
          medicine: r.medicine?.medicineName,
          qty: r.quantity,
          status: r.status,
          createdAt: r.createdAt,
        })),
      },
      recentTransactions: recentTransactions.map((t) => ({
        id: t._id,
        medicine: t.medicineId?.medicineName,
        qty: t.quantity,
        type: t.transactionType,
        status: t.status,
        createdAt: t.createdAt,
      })),
      generatedAt: new Date(),
    };
    res.json({ success: true, detail });
  } catch (e) {
    next(errorHandler(500, e.message));
  }
};

// ---- Pharmacy (tenant) management ----
export const listPharmacies = async (_req, res, next) => {
  try {
    let pharmacies = await Pharmacy.find()
      .select("name code status address createdAt updatedAt")
      .lean();
    if (!pharmacies.length) {
      // Auto-create default pharmacy if legacy data has none
      let defaultPh = await Pharmacy.findOne({ code: "ZELALEM" });
      if (!defaultPh) {
        defaultPh = await Pharmacy.create({
          name: "Zelalem Pharmacy",
          code: "ZELALEM",
          address: "",
        });
        console.log("[superadmin] Bootstrapped Zelalem Pharmacy (empty state)");
      }
      pharmacies = [defaultPh.toObject()];
    }
    res.json({ success: true, pharmacies });
  } catch (e) {
    next(errorHandler(500, e.message));
  }
};

export const createPharmacy = async (req, res, next) => {
  try {
    const { name, code, address, primaryAdminEmail } = req.body;
    if (!name || !code) return next(errorHandler(400, "name & code required"));
    const exists = await Pharmacy.findOne({
      $or: [{ name }, { code: code.toUpperCase() }],
    });
    if (exists) return next(errorHandler(409, "Pharmacy name or code exists"));
    const pharmacy = await Pharmacy.create({
      name,
      code: code.toUpperCase(),
      address,
    });
    // Optionally attach an existing user as admin if email provided
    if (primaryAdminEmail) {
      const user = await User.findOne({ email: primaryAdminEmail });
      if (user && user.role !== "super_admin") {
        user.pharmacy = pharmacy._id;
        if (user.role !== "admin") user.role = "admin";
        await user.save();
        pharmacy.primaryAdmin = user._id;
        await pharmacy.save();
      }
    }
    res.status(201).json({ success: true, pharmacy });
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

export const updatePharmacy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, address, status } = req.body;
    const pharmacy = await Pharmacy.findById(id);
    if (!pharmacy) return next(errorHandler(404, "Not found"));
    if (name) pharmacy.name = name;
    if (code) pharmacy.code = code.toUpperCase();
    if (address !== undefined) pharmacy.address = address;
    if (status && ["ACTIVE", "SUSPENDED"].includes(status))
      pharmacy.status = status;
    await pharmacy.save();
    res.json({ success: true, pharmacy });
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

export const pharmacySummary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pharmacy = await Pharmacy.findById(id).lean();
    if (!pharmacy) return next(errorHandler(404, "Not found"));
    // Auto-backfill any legacy documents missing pharmacy reference into this pharmacy.
    // This is safe because prior to multi-tenant rollout there was only one implicit tenant.
    try {
      await Promise.all([
        User.updateMany(
          {
            role: { $ne: "super_admin" },
            $or: [
              { pharmacy: { $exists: false } },
              { pharmacy: null },
              { pharmacy: { $eq: undefined } },
            ],
          },
          { $set: { pharmacy: pharmacy._id } }
        ),
        Branch.updateMany(
          {
            $or: [
              { pharmacy: { $exists: false } },
              { pharmacy: null },
              { pharmacy: { $eq: undefined } },
            ],
          },
          { $set: { pharmacy: pharmacy._id } }
        ),
        Medicine.updateMany(
          {
            $or: [
              { pharmacy: { $exists: false } },
              { pharmacy: null },
              { pharmacy: { $eq: undefined } },
            ],
          },
          { $set: { pharmacy: pharmacy._id } }
        ),
        Supplier.updateMany(
          {
            $or: [
              { pharmacy: { $exists: false } },
              { pharmacy: null },
              { pharmacy: { $eq: undefined } },
            ],
          },
          { $set: { pharmacy: pharmacy._id } }
        ),
        Request.updateMany(
          {
            $or: [
              { pharmacy: { $exists: false } },
              { pharmacy: null },
              { pharmacy: { $eq: undefined } },
            ],
          },
          { $set: { pharmacy: pharmacy._id } }
        ).catch(() => null),
      ]);
    } catch (backfillErr) {
      console.warn("[pharmacySummary] backfill warning:", backfillErr.message);
    }
    const [userCounts, branchCount, medCounts, requestCounts] =
      await Promise.all([
        User.aggregate([
          { $match: { pharmacy: pharmacy._id } },
          { $group: { _id: "$role", count: { $sum: 1 } } },
        ]),
        Branch.countDocuments({ pharmacy: pharmacy._id }),
        Medicine.aggregate([
          { $match: { pharmacy: pharmacy._id } },
          {
            $group: {
              _id: "lifecycle",
              total: { $sum: 1 },
              expired: {
                $sum: { $cond: [{ $lt: ["$expiryDate", new Date()] }, 1, 0] },
              },
            },
          },
        ]).catch(() => []),
        Request.aggregate([
          { $match: { pharmacy: pharmacy._id } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]).catch(() => []),
      ]);
    const roleMap = userCounts.reduce((a, r) => {
      a[r._id] = r.count;
      return a;
    }, {});
    const reqMap = requestCounts.reduce((a, r) => {
      a[r._id] = r.count;
      return a;
    }, {});
    const medMeta = medCounts[0] || { total: 0, expired: 0 };
    res.json({
      success: true,
      pharmacy,
      summary: {
        users: roleMap,
        branches: branchCount,
        medicines: { total: medMeta.total || 0, expired: medMeta.expired || 0 },
        requests: reqMap,
      },
    });
  } catch (e) {
    next(errorHandler(500, e.message));
  }
};

export const deletePharmacy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pharmacy = await Pharmacy.findById(id);
    if (!pharmacy) return next(errorHandler(404, "Not found"));
    const dependentUser = await User.findOne({ pharmacy: pharmacy._id });
    if (dependentUser) return next(errorHandler(409, "Pharmacy not empty"));
    await Pharmacy.deleteOne({ _id: id });
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    next(errorHandler(500, e.message));
  }
};
