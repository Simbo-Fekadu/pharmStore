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
  confirmReceipt,
  reverseShipment,
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
import { attachPharmacyContext } from "../middleware/pharmacyScope.js";
import {
  getLedgerHistory,
  directTransfer,
  backfillMedicineQuantities,
  employeeAddBranchMedicine,
  employeeAddBranchMedicinesBatch,
} from "../controllers/inventory.controller.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Add or update inventory for a location (requires inventory access)
router.post("/upsert", requireInventoryAccess, upsertInventory);

// Get inventory for a location
router.get("/", getInventory);

// Transfer medicine from store to branch (requires inventory access)
router.post("/transfer", requireInventoryAccess, transferMedicine);

// Branch creates a request (auth to capture user id)
router.post("/request", createRequest);
// List all requests
router.get("/request", listRequests);
// Get single request
router.get("/request/:id", getRequest);
// Approve (fulfill) request (requires inventory access)
router.post(
  "/request/:id/approve",
  requireInventoryAccess,
  approveRequest
);
// Reject request (requires inventory access)
router.post(
  "/request/:id/reject",
  requireInventoryAccess,
  rejectRequest
);
// Cancel (branch) its own pending request
router.post("/request/:id/cancel", cancelRequest);
// Confirm receipt of shipped request (branch)
router.post("/request/:id/confirm-receipt", confirmReceipt);
// Reverse a shipped request (admin, when goods are lost/damaged)
router.post("/request/:id/reverse", requireInventoryAccess, reverseShipment);
// Add message to request thread
router.post("/request/:id/message", addRequestMessage);

// Branch owned medicines (stock currently at that branch)
router.get("/branch/:branchId/medicines", getBranchMedicines);
// Admin: clear branch medicines (delete StockBalance for branch or all)
router.delete(
  "/branch/:branchId/medicines",
  requireAdmin,
  clearBranchMedicines
);

// Ledger and stock balance endpoints
router.post("/ledger", requireInventoryAccess, postLedger);
router.get("/stock", getStock);
router.get("/stock/central", getCentralAvailable);
router.get("/ledger", attachPharmacyContext, getLedgerHistory);
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
