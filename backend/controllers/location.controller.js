import Branch from "../models/branch.model.js";
import Store from "../models/store.model.js";

// Branch CRUD
export const createBranch = async (req, res) => {
  try {
    const branch = new Branch(req.body);
    await branch.save();
    res.status(201).json({ success: true, message: "Branch created", branch });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getBranches = async (_req, res) => {
  try {
    const branches = await Branch.find();
    res.status(200).json(branches);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });
    res.status(200).json({ success: true, branch });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!branch)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });
    res.status(200).json({ success: true, message: "Branch updated", branch });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findByIdAndDelete(req.params.id);
    if (!branch)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });
    res.status(200).json({ success: true, message: "Branch deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Store CRUD
export const createStore = async (req, res) => {
  try {
    const store = new Store(req.body);
    await store.save();
    res.status(201).json({ success: true, message: "Store created", store });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getStores = async (_req, res) => {
  try {
    const stores = await Store.find();
    res.status(200).json(stores);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getStore = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store)
      return res
        .status(404)
        .json({ success: false, message: "Store not found" });
    res.status(200).json({ success: true, store });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateStore = async (req, res) => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!store)
      return res
        .status(404)
        .json({ success: false, message: "Store not found" });
    res.status(200).json({ success: true, message: "Store updated", store });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteStore = async (req, res) => {
  try {
    const store = await Store.findByIdAndDelete(req.params.id);
    if (!store)
      return res
        .status(404)
        .json({ success: false, message: "Store not found" });
    res.status(200).json({ success: true, message: "Store deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
