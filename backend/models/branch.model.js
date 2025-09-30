import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    address: { type: String },
    pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: "Pharmacy" },
  },
  { timestamps: true }
);

const Branch = mongoose.model("Branch", branchSchema);
export default Branch;
