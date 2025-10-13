import Sale from "../models/sale.model.js";
import Branch from "../models/branch.model.js";
import Medicine from "../models/medicine.model.js";
import User from "../models/user.model.js";
import { StockLedger, StockBalance } from "../models/inventory.model.js";
import errorHandler from "../utils/error.js";

// Helper: parse YYYY-MM-DD as local start/end of day
function parseYMDToRange(ymd) {
  if (!ymd || typeof ymd !== "string") return null;
  const parts = ymd.split("-").map((n) => Number(n));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { start, end };
}

// Create a new sale
export const createSale = async (req, res, next) => {
  const { medicineId, quantity, price, employeeId, date, shift, unit } =
    req.body;

  try {
    // Validate medicine exists
    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return next(errorHandler(404, "Medicine not found"));
    }

    // Validate employee exists
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== "employee") {
      return next(errorHandler(404, "Employee not found"));
    }

    // Get branch from current user (assuming employee is logged in)
    const branchId = req.user?.branch;
    if (!branchId) {
      return next(
        errorHandler(
          400,
          "No branch associated with user. Please re-login or contact admin."
        )
      );
    }

    // Resolve unit conversion: treat branch stock quantities as base units
    const q = Math.abs(Number(quantity));
    if (!q || Number.isNaN(q))
      return next(errorHandler(400, "Invalid quantity"));
    // Fetch balance and use medicine to compute base quantity if selling in pack
    const [bal] = await Promise.all([
      StockBalance.findOne({ medicineId, locationId: branchId }),
    ]);
    const packSize = Number(medicine.packSize) || 0;
    const isPack = unit && unit === (medicine.packUnit || "");
    const qtyInBase = isPack && packSize > 0 ? q * packSize : q;
    const onHand = bal?.onHandQty || 0;
    if (onHand < qtyInBase) {
      return next(errorHandler(400, "Insufficient branch stock"));
    }

    // Create sale record
    const sale = new Sale({
      medicineId,
      medicineName: medicine.medicineName,
      quantity: q,
      price,
      employeeId,
      employeeName: employee.username,
      branchId,
      date: date ? new Date(date) : new Date(),
      shift: shift || "morning",
      unit: unit || medicine.baseUnit || medicine.unit, // for audit/tracking
    });

    await sale.save();

    // Record stock movement (SALE) and update branch balance
    const ledger = await StockLedger.create({
      medicineId,
      locationId: branchId,
      quantity: -Math.abs(Number(qtyInBase)),
      transactionType: "SALE",
      sourceDocType: "SALE",
      sourceDocId: sale._id.toString(),
      unitPrice: Number(price),
      createdByUserId: req.user?.id,
    });
    await StockBalance.updateOne(
      { medicineId, locationId: branchId },
      {
        // Decrement by base-unit quantity to keep balances consistent
        $inc: { onHandQty: -Math.abs(Number(qtyInBase)) },
        $set: { lastTxnAt: new Date(), lastTxnId: ledger._id },
      },
      { upsert: true }
    );

    res.status(201).json({
      success: true,
      message: "Sale recorded successfully",
      sale,
    });
  } catch (error) {
    next(error);
  }
};

// Get daily sales for a branch
export const getDailySales = async (req, res, next) => {
  const { date } = req.query;
  const branchId = req.user.branch;

  try {
    let startDate, endDate;
    if (date) {
      const r = parseYMDToRange(date);
      if (!r) return next(errorHandler(400, "Invalid date format"));
      ({ start: startDate, end: endDate } = r);
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    const sales = await Sale.find({
      branchId,
      date: { $gte: startDate, $lte: endDate },
    })
      .populate("medicineId", "name")
      .populate("employeeId", "username")
      .sort({ createdAt: -1 });

    const totalAmount = sales.reduce(
      (sum, sale) => sum + sale.quantity * sale.price,
      0
    );
    const totalTransactions = sales.length;

    res.json({
      success: true,
      sales,
      summary: {
        totalAmount,
        totalTransactions,
        date: startDate.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get sales by employee for a specific date
export const getEmployeeSales = async (req, res, next) => {
  const { employeeId, date } = req.query;
  const branchId = req.user.branch;

  try {
    let startDate, endDate;
    if (date) {
      const r = parseYMDToRange(date);
      if (!r) return next(errorHandler(400, "Invalid date format"));
      ({ start: startDate, end: endDate } = r);
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    const sales = await Sale.find({
      branchId,
      employeeId,
      date: { $gte: startDate, $lte: endDate },
    })
      .populate("medicineId", "name")
      .sort({ createdAt: -1 });

    const totalAmount = sales.reduce(
      (sum, sale) => sum + sale.quantity * sale.price,
      0
    );

    res.json({
      success: true,
      sales,
      summary: {
        totalAmount,
        totalTransactions: sales.length,
        employeeId,
        date: startDate.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get sales summary for a date range
export const getSalesSummary = async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const branchId = req.user.branch;

  try {
    let start, end;
    if (startDate) {
      const r = parseYMDToRange(startDate);
      if (!r) return next(errorHandler(400, "Invalid startDate"));
      ({ start } = r);
    } else {
      start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      const r2 = parseYMDToRange(endDate);
      if (!r2) return next(errorHandler(400, "Invalid endDate"));
      ({ end } = r2);
    } else {
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    const sales = await Sale.find({
      branchId,
      date: { $gte: start, $lte: end },
    })
      .populate("employeeId", "username")
      .sort({ date: -1 });

    const summary = sales.reduce((acc, sale) => {
      const employeeName = sale.employeeName;
      if (!acc[employeeName]) {
        acc[employeeName] = {
          totalAmount: 0,
          totalTransactions: 0,
          sales: [],
        };
      }
      acc[employeeName].totalAmount += sale.quantity * sale.price;
      acc[employeeName].totalTransactions += 1;
      acc[employeeName].sales.push(sale);
      return acc;
    }, {});

    res.json({
      success: true,
      summary,
      period: {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: List sales across all branches with pagination and filters
export const listAllSales = async (req, res, next) => {
  try {
    const { startDate, endDate, branchId, employeeId } = req.query;
    let start, end;
    if (startDate) {
      const r = parseYMDToRange(startDate);
      if (!r) return next(errorHandler(400, "Invalid startDate"));
      ({ start } = r);
    }
    if (endDate) {
      const r = parseYMDToRange(endDate);
      if (!r) return next(errorHandler(400, "Invalid endDate"));
      ({ end } = r);
    }
    if (!start || !end) {
      const today = new Date();
      const r = parseYMDToRange(
        today.toISOString().slice(0, 10) // YYYY-MM-DD
      );
      ({ start, end } = r);
    }

    // restrict to branches of current pharmacy
    let branchScopeIds = [];
    if (req.pharmacyId) {
      const branches = await Branch.find(
        { pharmacy: req.pharmacyId },
        { _id: 1 }
      ).lean();
      branchScopeIds = branches.map((b) => b._id);
      if (branchScopeIds.length === 0) {
        return res.json({
          success: true,
          page: 1,
          pageSize: 0,
          totalCount: 0,
          totals: { totalAmount: 0, totalTransactions: 0 },
          sales: [],
          period: {
            start: start.toISOString().split("T")[0],
            end: end.toISOString().split("T")[0],
          },
        });
      }
    }

    const filter = { date: { $gte: start, $lte: end } };
    if (branchId) filter.branchId = branchId;
    else if (branchScopeIds.length) filter.branchId = { $in: branchScopeIds };
    if (employeeId) filter.employeeId = employeeId;

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(req.query.pageSize) || 15)
    );
    const skip = (page - 1) * pageSize;

    const [items, totalCount, agg] = await Promise.all([
      Sale.find(filter)
        .populate("branchId", "name")
        .populate("employeeId", "username")
        .populate("medicineId", "medicineName name")
        .sort({ date: -1 })
        .skip(skip)
        .limit(pageSize),
      Sale.countDocuments(filter),
      Sale.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $multiply: ["$quantity", "$price"] } },
            totalTransactions: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totals =
      agg && agg[0] ? agg[0] : { totalAmount: 0, totalTransactions: 0 };
    res.json({
      success: true,
      page,
      pageSize,
      totalCount,
      totals: {
        totalAmount: totals.totalAmount || 0,
        totalTransactions: totals.totalTransactions || 0,
      },
      sales: items,
      period: {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: Summary totals by branch across all branches
export const getAdminSalesSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    let start, end;
    if (startDate) {
      const r = parseYMDToRange(startDate);
      if (!r) return next(errorHandler(400, "Invalid startDate"));
      ({ start } = r);
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      const r2 = parseYMDToRange(endDate);
      if (!r2) return next(errorHandler(400, "Invalid endDate"));
      ({ end } = r2);
    } else {
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }
    const match = { date: { $gte: start, $lte: end } };
    if (req.pharmacyId) {
      const branches = await Branch.find(
        { pharmacy: req.pharmacyId },
        { _id: 1 }
      ).lean();
      const ids = branches.map((b) => b._id);
      if (ids.length === 0) {
        return res.json({
          success: true,
          byBranch: [],
          period: {
            start: start.toISOString().split("T")[0],
            end: end.toISOString().split("T")[0],
          },
        });
      }
      match.branchId = { $in: ids };
    }
    const agg = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$branchId",
          totalAmount: { $sum: { $multiply: ["$quantity", "$price"] } },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);
    res.json({
      success: true,
      byBranch: agg.map((r) => ({
        branchId: r._id,
        totalAmount: r.totalAmount || 0,
        totalTransactions: r.totalTransactions || 0,
      })),
      period: {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN: Today's total sales across all branches
export const getAdminTodayTotal = async (req, res, next) => {
  try {
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );
    const match = { date: { $gte: start, $lte: end } };
    if (req.pharmacyId) {
      const branches = await Branch.find(
        { pharmacy: req.pharmacyId },
        { _id: 1 }
      ).lean();
      const ids = branches.map((b) => b._id);
      match.branchId = { $in: ids };
    }

    const agg = await Sale.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "medicines",
          localField: "medicineId",
          foreignField: "_id",
          as: "med",
        },
      },
      { $unwind: { path: "$med", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: { $multiply: ["$quantity", "$price"] } },
          totalPurchaseAmount: {
            $sum: {
              $multiply: ["$quantity", { $ifNull: ["$med.purchasePrice", 0] }],
            },
          },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);
    const r = agg[0] || {
      totalAmount: 0,
      totalPurchaseAmount: 0,
      totalTransactions: 0,
    };
    res.json({
      success: true,
      totalAmount: r.totalAmount || 0,
      totalPurchaseAmount: r.totalPurchaseAmount || 0,
      totalTransactions: r.totalTransactions || 0,
    });
  } catch (error) {
    next(error);
  }
};
