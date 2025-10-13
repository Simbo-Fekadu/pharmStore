import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { attachPharmacyContext } from "../middleware/pharmacyScope.js";
import { listMessages, postMessage } from "../controllers/chat.controller.js";

const router = express.Router();

router.get("/", verifyToken, attachPharmacyContext, listMessages);
router.post("/", verifyToken, attachPharmacyContext, postMessage);

export default router;
