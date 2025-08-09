import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    address: { type: String },
  },
  { timestamps: true }
);

const Store = mongoose.model("Store", storeSchema);
export default Store;
