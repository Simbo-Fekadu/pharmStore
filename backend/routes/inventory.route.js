import express from "express";
import {
  upsertInventory,
  getInventory,
  transferMedicine,
} from "../controllers/inventory.controller.js";

const router = express.Router();

// Add or update inventory for a location
router.post("/upsert", upsertInventory);

// Get inventory for a location
router.get("/", getInventory);

// Transfer medicine from store to branch
router.post("/transfer", transferMedicine);

export default router;
