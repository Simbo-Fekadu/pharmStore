import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medicine",
      required: true,
    },
    locationType: { type: String, enum: ["Store", "Branch"], required: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, required: true }, // ref to Store or Branch
    quantity: { type: Number, default: 0 },
    batchNumber: { type: String },
    expiryDate: { type: Date },
  },
  { timestamps: true }
);

const Inventory = mongoose.model("Inventory", inventorySchema);
export default Inventory;
