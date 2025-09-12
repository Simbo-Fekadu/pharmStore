import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { listMessages, postMessage } from "../controllers/chat.controller.js";

const router = express.Router();

router.get("/", verifyToken, listMessages);
router.post("/", verifyToken, postMessage);

export default router;
