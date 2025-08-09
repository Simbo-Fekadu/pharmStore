import express from "express";
import {
  createMedicine,
  getMedicines,
  getMedicine,
  updateMedicine,
  deleteMedicine,
} from "../controllers/medicine.crud.controller.js";

const router = express.Router();

router.post("/", createMedicine);
router.get("/", getMedicines);
router.get("/:id", getMedicine);
router.put("/:id", updateMedicine);
router.delete("/:id", deleteMedicine);

export default router;
