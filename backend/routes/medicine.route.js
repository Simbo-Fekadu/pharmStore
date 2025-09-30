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
import { verifyToken, requireInventoryAccess } from "../utils/verifyUser.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// CRUD endpoints (merged from previous duplicate route file)
router.post("/", createMedicine);
router.get("/", getMedicines);
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
router.get("/:id", getMedicine);
router.put("/:id", updateMedicine);
router.delete("/:id", deleteMedicine);
router.post("/:id/restore", restoreMedicine);
router.delete("/:id/purge", purgeMedicine);

export default router;
