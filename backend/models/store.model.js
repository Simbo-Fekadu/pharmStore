import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
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

// Unique store name per pharmacy
storeSchema.index({ pharmacy: 1, name: 1 }, { unique: true });

const Store = mongoose.model("Store", storeSchema);
export default Store;
