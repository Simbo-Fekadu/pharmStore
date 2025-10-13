import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { requireSuperAdmin } from "../middleware/authz.js";
import {
  listAllUsers,
  createUserAnyRole,
  updateUserAnyRole,
  elevateToAdmin,
  deleteUserAny,
  statsSummary,
  systemOverview,
  branchesOverview,
  branchDetailOverview,
  listPharmacies,
  createPharmacy,
  updatePharmacy,
  pharmacySummary,
  deletePharmacy,
  pharmacyUsers,
  pharmacyBranches,
  pharmacyMedicines,
  pharmacyRequests,
  pharmacyTransactions,
  pharmacyBranchMedicines,
  pharmacyBranchSales,
  createPharmacyUser,
  createPharmacyBranch,
  updatePharmacyBranch,
  deletePharmacyBranch,
} from "../controllers/superadmin.controller.js";

const router = express.Router();

router.use(verifyToken, requireSuperAdmin);
router.get("/users", listAllUsers);
router.post("/users", createUserAnyRole);
router.patch("/users/:id", updateUserAnyRole);
router.post("/users/:id/elevate-admin", elevateToAdmin);
router.delete("/users/:id", deleteUserAny);
router.get("/stats", statsSummary);
router.get("/overview", systemOverview);
router.get("/branches", branchesOverview);
router.get("/branches/:id", branchDetailOverview);
// Pharmacies (tenants)
router.get("/pharmacies", listPharmacies);
router.post("/pharmacies", createPharmacy);
router.get("/pharmacies/:id", pharmacySummary);
router.patch("/pharmacies/:id", updatePharmacy);
router.delete("/pharmacies/:id", deletePharmacy);
router.get("/pharmacies/:id/users", pharmacyUsers);
router.post("/pharmacies/:id/users", createPharmacyUser);
// User update/delete can use global routes, but for convenience expose pharmacy-scoped URLs as well
router.patch("/pharmacies/:id/users/:userId", updateUserAnyRole);
router.delete("/pharmacies/:id/users/:userId", deleteUserAny);
router.get("/pharmacies/:id/branches", pharmacyBranches);
router.post("/pharmacies/:id/branches", createPharmacyBranch);
router.patch("/pharmacies/:id/branches/:branchId", updatePharmacyBranch);
router.delete("/pharmacies/:id/branches/:branchId", deletePharmacyBranch);
router.get("/pharmacies/:id/medicines", pharmacyMedicines);
router.get("/pharmacies/:id/requests", pharmacyRequests);
router.get("/pharmacies/:id/transactions", pharmacyTransactions);
router.get(
  "/pharmacies/:id/branches/:branchId/medicines",
  pharmacyBranchMedicines
);
router.get("/pharmacies/:id/branches/:branchId/sales", pharmacyBranchSales);

export default router;
