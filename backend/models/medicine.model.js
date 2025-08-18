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
      enum: [
        "Tablet",
        "Capsule",
        "Syrup",
        "Injection",
        "Cream/Oint",
        "Others",
        "Other",
      ],
      required: true,
      default: "Others",
    },
    unit: {
      type: String,
      enum: ["Packet", "Strip", "Tube", "Bottle", "Others"],
    },
    batchNumber: {
      type: String,
      required: true,
      // uniqueness enforced via partial index below (ignores null/empty); no default so user must supply
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
    quantity: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: false,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: false,
    },
    createdBy: {
      type: String,
      required: true,
      default: "system",
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: { type: Date },
    deletedBy: { type: String },
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

// Define index declaratively; migration in index.js ensures creation & legacy cleanup
medicineSchema.index(
  { batchNumber: 1, isDeleted: 1 },
  {
    name: "uniq_active_batchNumber",
    unique: true,
    partialFilterExpression: {
      batchNumber: { $type: "string", $ne: "" },
      isDeleted: false,
    },
  }
);

// Optional barcode uniqueness (ignore docs without a real barcode)

const Medicine = mongoose.model("Medicine", medicineSchema);
export default Medicine;
