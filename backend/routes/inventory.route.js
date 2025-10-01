import express from "express";
import {
  upsertInventory,
  getInventory,
  transferMedicine,
  createRequest,
  listRequests,
  getRequest,
  approveRequest,
  rejectRequest,
  cancelRequest,
  addRequestMessage,
  postLedger,
  getStock,
  getBranchMedicines,
  clearBranchMedicines,
  getCentralAvailable,
} from "../controllers/inventory.controller.js";
import {
  verifyToken,
  requireInventoryAccess,
  requireAdmin,
} from "../utils/verifyUser.js";
import {
  getLedgerHistory,
  directTransfer,
  backfillMedicineQuantities,
  employeeAddBranchMedicine,
  employeeAddBranchMedicinesBatch,
} from "../controllers/inventory.controller.js";

const router = express.Router();

// Add or update inventory for a location (requires inventory access)
router.post("/upsert", verifyToken, requireInventoryAccess, upsertInventory);

// Get inventory for a location
router.get("/", getInventory);

// Transfer medicine from store to branch (requires inventory access)
router.post("/transfer", verifyToken, requireInventoryAccess, transferMedicine);

// Branch creates a request (auth to capture user id)
router.post("/request", verifyToken, createRequest);
// List all requests
router.get("/request", listRequests);
// Get single request
router.get("/request/:id", getRequest);
// Approve (fulfill) request (requires inventory access)
router.post(
  "/request/:id/approve",
  verifyToken,
  requireInventoryAccess,
  approveRequest
);
// Reject request (requires inventory access)
router.post(
  "/request/:id/reject",
  verifyToken,
  requireInventoryAccess,
  rejectRequest
);
// Cancel (branch) its own pending request - no auth currently, could add token later
router.post("/request/:id/cancel", cancelRequest);
// Add message to request thread
router.post("/request/:id/message", verifyToken, addRequestMessage);

// Branch owned medicines (stock currently at that branch)
router.get("/branch/:branchId/medicines", getBranchMedicines);
// Admin: clear branch medicines (delete StockBalance for branch or all)
router.delete(
  "/branch/:branchId/medicines",
  verifyToken,
  requireAdmin,
  clearBranchMedicines
);

// Ledger and stock balance endpoints
router.post("/ledger", verifyToken, requireInventoryAccess, postLedger);
router.get("/stock", getStock);
router.get("/stock/central", getCentralAvailable);
router.get("/ledger", verifyToken, getLedgerHistory);
router.post(
  "/transfer/direct",
  verifyToken,
  requireInventoryAccess,
  directTransfer
);
router.post(
  "/backfill/medicine-quantities",
  verifyToken,
  requireInventoryAccess,
  backfillMedicineQuantities
);
// Employee self-service add medicine to their branch stock
router.post("/branch/add-self", verifyToken, employeeAddBranchMedicine);
router.post(
  "/branch/add-self/batch",
  verifyToken,
  employeeAddBranchMedicinesBatch
);
// One-off migration endpoint (secured): create ledger entries from legacy Inventory transfers

export default router;
