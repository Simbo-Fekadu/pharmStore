import Branch from "../models/branch.model.js";

export const listBranches = async (req, res) => {
  try {
    const filter =
      req.user?.role === "super_admin" && req.pharmacyId
        ? { pharmacy: req.pharmacyId }
        : req.user?.pharmacy
        ? { pharmacy: req.user.pharmacy }
        : {};
    const branches = await Branch.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, branches });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const createBranch = async (req, res) => {
  try {
    const { name, address } = req.body;
    if (!name)
      return res.status(400).json({ success: false, message: "Name required" });
    const pharmacy = req.pharmacyId || req.user?.pharmacy;
    if (!pharmacy) {
      return res
        .status(400)
        .json({ success: false, message: "Missing pharmacy context" });
    }
    const exists = await Branch.findOne({ name, pharmacy });
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "Branch name already exists" });
    const branch = await Branch.create({ name, address, pharmacy });
    res.status(201).json({ success: true, branch });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address } = req.body;
    const filter = { _id: id };
    if (req.user?.role === "super_admin" && req.pharmacyId) {
      filter.pharmacy = req.pharmacyId;
    } else if (req.user?.pharmacy) {
      filter.pharmacy = req.user.pharmacy;
    }
    const update = {
      $set: {
        ...(name && { name }),
        ...(address !== undefined && { address }),
      },
    };
    const branch = await Branch.findOneAndUpdate(filter, update, { new: true });
    if (!branch)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });
    res.json({ success: true, branch });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const filter = { _id: id };
    if (req.user?.role === "super_admin" && req.pharmacyId) {
      filter.pharmacy = req.pharmacyId;
    } else if (req.user?.pharmacy) {
      filter.pharmacy = req.user.pharmacy;
    }
    const branch = await Branch.findOneAndDelete(filter);
    if (!branch)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
