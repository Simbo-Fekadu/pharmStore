import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pharmacy",
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure branch names are unique per pharmacy (multi-tenant isolation)
branchSchema.index({ pharmacy: 1, name: 1 }, { unique: true });

const Branch = mongoose.model("Branch", branchSchema);
export default Branch;
