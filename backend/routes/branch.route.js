import express from "express";
import {
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from "../controllers/branch.controller.js";

const router = express.Router();

router.get("/", listBranches);
router.post("/", createBranch);
router.put("/:id", updateBranch);
router.delete("/:id", deleteBranch);

export default router;
