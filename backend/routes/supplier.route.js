import express from "express";
import { verifyToken, requireAdmin } from "../utils/verifyUser.js";
import { attachPharmacyContext } from "../middleware/pharmacyScope.js";
import {
  createSupplier,
  getSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplier.controller.js";

const router = express.Router();

// Protect and attach pharmacy scope
router.use(verifyToken, attachPharmacyContext);

router.post("/", requireAdmin, createSupplier);
router.get("/", getSuppliers);
router.get("/:id", getSupplier);
router.put("/:id", requireAdmin, updateSupplier);
router.delete("/:id", requireAdmin, deleteSupplier);

export default router;
