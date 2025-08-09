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
});

const Supplier = mongoose.model("Supplier", supplierSchema);
export default Supplier;
