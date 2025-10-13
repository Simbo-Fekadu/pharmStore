import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { exportData } from "../controllers/export.controller.js";
import { requireSuperAdmin } from "../middleware/authz.js";

const router = express.Router();

// Both super admin and normal admin can export; we gate preview & dataset size by role if needed later.
// Query params:
// - type=users|medicines|transactions|branch_medicines (single)
// - types=users,transactions (multi-sheet xlsx)
// - pharmacyId=<id> (super_admin only; others are scoped to their own)
// - branchId=<id> (optional filter for branch-scoped datasets)
// - format=xlsx|pdf (pdf only for single-type)
// - preview=true (return JSON preview)
router.get("/data", verifyToken, exportData);
// (Optional) could add POST in future for complex filters

export default router;
