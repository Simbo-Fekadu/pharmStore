import express from "express";
import {
  createMedicine,
  getMedicines,
  getMedicine,
  updateMedicine,
  deleteMedicine,
  restoreMedicine,
  purgeMedicine,
  getActiveMedicines,
} from "../controllers/medicine.controller.js";

const router = express.Router();

// CRUD endpoints (merged from previous duplicate route file)
router.post("/", createMedicine);
router.get("/", getMedicines);
router.get("/active/list", getActiveMedicines);
router.get("/:id", getMedicine);
router.put("/:id", updateMedicine);
router.delete("/:id", deleteMedicine);
router.post("/:id/restore", restoreMedicine);
router.delete("/:id/purge", purgeMedicine);

export default router;
