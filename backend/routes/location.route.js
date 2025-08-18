import express from "express";
import {
  createBranch,
  getBranches,
  getBranch,
  updateBranch,
  deleteBranch,
  createStore,
  getStores,
  getStore,
  updateStore,
  deleteStore,
} from "../controllers/location.controller.js";

const router = express.Router();

// Branch routes
router.post("/branch", createBranch);
router.get("/branch", getBranches);
router.get("/branch/:id", getBranch);
router.put("/branch/:id", updateBranch);
router.delete("/branch/:id", deleteBranch);

// Store routes
router.post("/store", createStore);
router.get("/store", getStores);
router.get("/store/:id", getStore);
router.put("/store/:id", updateStore);
router.delete("/store/:id", deleteStore);

export default router;
