import express from "express";
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  createEmployee,
} from "../controllers/user.controller.js";
import { verifyToken, requireAdmin } from "../utils/verifyUser.js";

const router = express.Router();

// Admin-only user management
router.use(verifyToken, requireAdmin);
router.post("/", createEmployee); // create employee
router.get("/", getUsers);
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
