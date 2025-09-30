import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { exportData } from "../controllers/export.controller.js";
import { requireSuperAdmin } from "../middleware/authz.js";

const router = express.Router();

// Both super admin and normal admin can export; we gate preview & dataset size by role if needed later.
router.get("/data", verifyToken, exportData);
// (Optional) could add POST in future for complex filters

export default router;
