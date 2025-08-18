import Branch from "../models/branch.model.js";

export const listBranches = async (req, res) => {
  try {
    const branches = await Branch.find().sort({ createdAt: -1 });
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
    const exists = await Branch.findOne({ name });
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "Branch name already exists" });
    const branch = await Branch.create({ name, address });
    res.status(201).json({ success: true, branch });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address } = req.body;
    const branch = await Branch.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(name && { name }),
          ...(address !== undefined && { address }),
        },
      },
      { new: true }
    );
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
    const branch = await Branch.findByIdAndDelete(id);
    if (!branch)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
