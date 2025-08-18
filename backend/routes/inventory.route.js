import express from "express";
import {
  upsertInventory,
  getInventory,
  transferMedicine,
  createRequest,
  listRequests,
  approveRequest,
  rejectRequest,
} from "../controllers/inventory.controller.js";

const router = express.Router();

// Add or update inventory for a location
router.post("/upsert", upsertInventory);

// Get inventory for a location
router.get("/", getInventory);

// Transfer medicine from store to branch
router.post("/transfer", transferMedicine);

// Branch creates a request
router.post("/request", createRequest);
// List all requests
router.get("/request", listRequests);
// Approve (fulfill) request
router.post("/request/:id/approve", approveRequest);
// Reject request
router.post("/request/:id/reject", rejectRequest);

export default router;
