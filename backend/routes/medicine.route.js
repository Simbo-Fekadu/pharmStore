import express from "express";
import multer from "multer";
import {
  createMedicine,
  getMedicines,
  getMedicine,
  updateMedicine,
  deleteMedicine,
  restoreMedicine,
  purgeMedicine,
  getActiveMedicines,
  importMedicines,
  importTemplate,
  exportMedicinesExcel,
} from "../controllers/medicine.controller.js";
import {
  verifyToken,
  requireInventoryAccess,
  requireAdmin,
} from "../utils/verifyUser.js";
import { attachPharmacyContext } from "../middleware/pharmacyScope.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// CRUD endpoints (merged from previous duplicate route file)
// Create requires auth and inventory access
router.post(
  "/",
  verifyToken,
  requireInventoryAccess,
  attachPharmacyContext,
  createMedicine
);
// List requires auth to properly scope by pharmacy
router.get("/", verifyToken, attachPharmacyContext, getMedicines);
router.get("/active/list", getActiveMedicines);
router.post(
  "/import",
  verifyToken,
  requireInventoryAccess,
  upload.single("file"),
  importMedicines
);
router.get(
  "/import/template",
  verifyToken,
  requireInventoryAccess,
  importTemplate
);
router.get(
  "/export/xlsx",
  verifyToken,
  requireInventoryAccess,
  exportMedicinesExcel
);
router.get("/:id", verifyToken, attachPharmacyContext, getMedicine);
// Update/Delete restricted to admin or super_admin
router.put(
  "/:id",
  verifyToken,
  requireAdmin,
  attachPharmacyContext,
  updateMedicine
);
router.delete(
  "/:id",
  verifyToken,
  requireAdmin,
  attachPharmacyContext,
  deleteMedicine
);
router.post(
  "/:id/restore",
  verifyToken,
  requireAdmin,
  attachPharmacyContext,
  restoreMedicine
);
router.delete(
  "/:id/purge",
  verifyToken,
  requireAdmin,
  attachPharmacyContext,
  purgeMedicine
);
// removed duplicate unprotected purge route

export default router;
