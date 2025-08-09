import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ["Tablet", "Capsule", "Syrup", "Injection", "Cream/Oint", "Others"],
      required: true,
      default: "Other",
    },
    unit: {
      type: String,
      enum: ["Packet", "Strip", "Tube", "Bottle", "Others"],
    },
    batchNumber: {
      type: String,
      required: true,
      unique: true,
      default: "Not mentioned",
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    purchasePrice: {
      type: Number,
      required: true,
    },
    sellingPrice: {
      type: Number,
      required: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: false,
      default: "Authorized Supplier",
    },
    createdBy: {
      type: String,
      required: true,
    },
  },

  { timestamps: true }
);

// Set sellingPrice to 1.25 * purchasePrice if not provided
medicineSchema.pre("save", function (next) {
  if (this.sellingPrice == null) {
    this.sellingPrice = this.purchasePrice * 1.25;
  }
  next();
});

const Medicine = mongoose.model("Medicine", medicineSchema);
export default Medicine;
