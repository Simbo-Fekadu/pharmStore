import express from "express";
import { verifyToken, requireAdmin } from "../utils/verifyUser.js";
import { attachPharmacyContext } from "../middleware/pharmacyScope.js";
import {
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from "../controllers/branch.controller.js";

const router = express.Router();

router.use(verifyToken, attachPharmacyContext);

router.get("/", listBranches);
router.post("/", requireAdmin, createBranch);
router.put("/:id", requireAdmin, updateBranch);
router.delete("/:id", requireAdmin, deleteBranch);

export default router;
