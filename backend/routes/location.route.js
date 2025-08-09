import express from "express";
import Store from "../models/store.model.js";
import Branch from "../models/branch.model.js";

const router = express.Router();

// Create a store
router.post("/store", async (req, res, next) => {
  try {
    const store = new Store(req.body);
    await store.save();
    res
      .status(201)
      .json({ success: true, message: "Store registered successfully", store });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get all stores
router.get("/store", async (req, res, next) => {
  try {
    const stores = await Store.find();
    res.status(200).json(stores);
  } catch (error) {
    next(error);
  }
});

// Create a branch
router.post("/branch", async (req, res, next) => {
  try {
    const branch = new Branch(req.body);
    await branch.save();
    res
      .status(201)
      .json({
        success: true,
        message: "Branch registered successfully",
        branch,
      });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get all branches
router.get("/branch", async (req, res, next) => {
  try {
    const branches = await Branch.find();
    res.status(200).json(branches);
  } catch (error) {
    next(error);
  }
});

export default router;
