import Branch from "../models/branch.model.js";
import Store from "../models/store.model.js";
import errorHandler from "../utils/error.js";

export const createBranch = async (req, res, next) => {
  try {
    const branch = await Branch.create({ ...req.body, pharmacy: req.pharmacyId });
    res.status(201).json({ success: true, message: "Branch created", branch });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const getBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find({ pharmacy: req.pharmacyId });
    res.status(200).json({ success: true, branches });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const getBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findOne({ _id: req.params.id, pharmacy: req.pharmacyId });
    if (!branch) return next(errorHandler(404, "Branch not found"));
    res.status(200).json({ success: true, branch });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const updateBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, pharmacy: req.pharmacyId },
      req.body,
      { new: true }
    );
    if (!branch) return next(errorHandler(404, "Branch not found"));
    res.status(200).json({ success: true, message: "Branch updated", branch });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findOneAndDelete({ _id: req.params.id, pharmacy: req.pharmacyId });
    if (!branch) return next(errorHandler(404, "Branch not found"));
    res.status(200).json({ success: true, message: "Branch deleted" });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const createStore = async (req, res, next) => {
  try {
    const store = await Store.create({ ...req.body, pharmacy: req.pharmacyId });
    res.status(201).json({ success: true, message: "Store created", store });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const getStores = async (req, res, next) => {
  try {
    const stores = await Store.find({ pharmacy: req.pharmacyId });
    res.status(200).json({ success: true, stores });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const getStore = async (req, res, next) => {
  try {
    const store = await Store.findOne({ _id: req.params.id, pharmacy: req.pharmacyId });
    if (!store) return next(errorHandler(404, "Store not found"));
    res.status(200).json({ success: true, store });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const updateStore = async (req, res, next) => {
  try {
    const store = await Store.findOneAndUpdate(
      { _id: req.params.id, pharmacy: req.pharmacyId },
      req.body,
      { new: true }
    );
    if (!store) return next(errorHandler(404, "Store not found"));
    res.status(200).json({ success: true, message: "Store updated", store });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};

export const deleteStore = async (req, res, next) => {
  try {
    const store = await Store.findOneAndDelete({ _id: req.params.id, pharmacy: req.pharmacyId });
    if (!store) return next(errorHandler(404, "Store not found"));
    res.status(200).json({ success: true, message: "Store deleted" });
  } catch (error) {
    next(errorHandler(400, error.message));
  }
};
