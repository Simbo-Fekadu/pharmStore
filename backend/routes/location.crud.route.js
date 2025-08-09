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
} from "../controllers/location.crud.controller.js";

const router = express.Router();

// Branch CRUD
router.post("/branch", createBranch);
router.get("/branch", getBranches);
router.get("/branch/:id", getBranch);
router.put("/branch/:id", updateBranch);
router.delete("/branch/:id", deleteBranch);

// Store CRUD
router.post("/store", createStore);
router.get("/store", getStores);
router.get("/store/:id", getStore);
router.put("/store/:id", updateStore);
router.delete("/store/:id", deleteStore);

export default router;
