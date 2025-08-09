import express from "express";

import { createMedicine } from "../controllers/medicine.controller.js";
const router = express.Router();
router.post("/createMedicine", createMedicine);
export default router;
