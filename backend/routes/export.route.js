import express from "express";
import { verifyToken, requireAdmin } from "../utils/verifyUser.js";
import { exportData } from "../controllers/export.controller.js";

const router = express.Router();

router.get("/data", verifyToken, requireAdmin, exportData);
// (Optional) could add POST in future for complex filters

export default router;
