import express from "express";
import { signup, signin, signout, refresh, me } from "../controllers/auth.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();
router.post("/signup", signup);
router.post("/signin", signin);
router.post("/signout", signout);
router.post("/refresh", refresh);
router.get("/me", verifyToken, me);

export default router;
