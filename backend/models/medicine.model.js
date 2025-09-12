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
        "Cosmetics",
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

// Set sellingPrice to default margin if not provided
// Cosmetics => 35% margin (1.35x), others => 25% margin (1.25x)
medicineSchema.pre("save", function (next) {
  if (this.sellingPrice == null) {
    const factor = this.category === "Cosmetics" ? 1.35 : 1.25;
    this.sellingPrice = this.purchasePrice * factor;
  }
  next();
});

// Unique per supplier: allow the same batchNumber if supplier differs
// Partial filter ensures we only enforce when supplier exists and doc is active
medicineSchema.index(
  { batchNumber: 1, supplier: 1, isDeleted: 1 },
  {
    name: "uniq_batch_per_supplier",
    unique: true,
    partialFilterExpression: {
      batchNumber: { $type: "string", $ne: "" },
      supplier: { $type: "objectId" },
      isDeleted: false,
    },
  }
);

// Optional barcode uniqueness (ignore docs without a real barcode)

const Medicine = mongoose.model("Medicine", medicineSchema);
export default Medicine;
