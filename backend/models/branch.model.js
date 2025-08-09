import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    address: { type: String },
  },
  { timestamps: true }
);

const Branch = mongoose.model("Branch", branchSchema);
export default Branch;
