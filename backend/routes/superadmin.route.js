import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { requireSuperAdmin } from "../middleware/authz.js";
import {
  listAllUsers,
  createUserAnyRole,
  updateUserAnyRole,
  elevateToAdmin,
  deleteUserAny,
  statsSummary,
  systemOverview,
  branchesOverview,
  branchDetailOverview,
} from "../controllers/superadmin.controller.js";

const router = express.Router();

router.use(verifyToken, requireSuperAdmin);
router.get("/users", listAllUsers);
router.post("/users", createUserAnyRole);
router.patch("/users/:id", updateUserAnyRole);
router.post("/users/:id/elevate-admin", elevateToAdmin);
router.delete("/users/:id", deleteUserAny);
router.get("/stats", statsSummary);
router.get("/overview", systemOverview);
router.get("/branches", branchesOverview);
router.get("/branches/:id", branchDetailOverview);

export default router;
