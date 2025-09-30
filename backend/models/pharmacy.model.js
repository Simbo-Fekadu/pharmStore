import mongoose from "mongoose";

const pharmacySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: { type: String },
    status: { type: String, enum: ["ACTIVE", "SUSPENDED"], default: "ACTIVE" },
    primaryAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

const Pharmacy = mongoose.model("Pharmacy", pharmacySchema);
export default Pharmacy;