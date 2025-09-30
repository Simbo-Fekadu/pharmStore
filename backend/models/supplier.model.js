import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema({
  supplierName: {
    type: String,
    required: true,
    unique: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: false,
  },
  pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: "Pharmacy" },
});

const Supplier = mongoose.model("Supplier", supplierSchema);
export default Supplier;
