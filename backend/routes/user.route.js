import express from "express";
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  createEmployee,
  listMyBranchEmployees,
} from "../controllers/user.controller.js";
import { verifyToken, requireAdmin } from "../utils/verifyUser.js";

const router = express.Router();

// Team listing for authenticated users (non-admin allowed)
router.get("/team", verifyToken, listMyBranchEmployees);

// Admin-only user management
router.use(verifyToken, requireAdmin);
router.post("/", createEmployee); // create employee
router.get("/", getUsers);
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
