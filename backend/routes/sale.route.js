import express from "express";
import {
  createSale,
  getDailySales,
  getEmployeeSales,
  getSalesSummary,
  listAllSales,
  getAdminSalesSummary,
  getAdminTodayTotal,
} from "../controllers/sale.controller.js";
import {
  verifyToken,
  requireInventoryAccess,
  requireAdmin,
} from "../utils/verifyUser.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Create a new sale (employees can create sales)
router.post("/", createSale);

// Get daily sales for the branch
router.get("/daily", getDailySales);

// Get sales for a specific employee on a date
router.get("/employee", getEmployeeSales);

// Get sales summary for a date range
router.get("/summary", getSalesSummary);

// Admin-only: list all sales across branches (paginated)
router.get("/admin/list", requireAdmin, listAllSales);

// Admin-only: summary by branch for a date range
router.get("/admin/summary", requireAdmin, getAdminSalesSummary);

// Admin-only: today's total across all branches
router.get("/admin/today-total", requireAdmin, getAdminTodayTotal);

export default router;
