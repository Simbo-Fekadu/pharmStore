import express from "express";
import { verifyToken, requireAdmin } from "../utils/verifyUser.js";
import { attachPharmacyContext } from "../middleware/pharmacyScope.js";
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

router.use(verifyToken, attachPharmacyContext);

// Branch routes — mutations require admin
router.post("/branch", requireAdmin, createBranch);
router.get("/branch", getBranches);
router.get("/branch/:id", getBranch);
router.put("/branch/:id", requireAdmin, updateBranch);
router.delete("/branch/:id", requireAdmin, deleteBranch);

// Store routes — mutations require admin
router.post("/store", requireAdmin, createStore);
router.get("/store", getStores);
router.get("/store/:id", getStore);
router.put("/store/:id", requireAdmin, updateStore);
router.delete("/store/:id", requireAdmin, deleteStore);

export default router;
