import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,
      required: true,
      trim: true,
    },
    // Backward-compat unit field (treat as base unit if new fields not set)
    brand: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "ANTIBIOTICS",
        "CNS DRUGS",
        "VITAMINS & MINERALS",
        "RESPIRATORY DRUGS",
        "ENT DRUGS",
        "GI DRUGS",
        "ANALGESICS/ANTIHISTAMINS",
        "HORMONES",
        "DERMATOLOGICALS",
        "CVS DRUGS",
        "MISCELLANEOUS",
        "COSMETICS",
      ],
      required: true,
      default: "MISCELLANEOUS",
    },
    unit: {
      type: String,
      enum: ["Packet", "Ampule", "Tube", "Bottle", "Box", "Others"],
    },
    // New multi-unit support
    baseUnit: { type: String }, // e.g., "Strip"
    packUnit: { type: String }, // e.g., "Packet"
    packSize: { type: Number, min: 1 }, // e.g., 1 Packet = packSize * baseUnit
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
    // Legacy overall selling price (kept for compatibility)
    sellingPrice: { type: Number, required: false },
    // New per-unit prices
    sellingPriceBase: { type: Number }, // price per base unit
    sellingPricePack: { type: Number }, // price per pack unit
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
  // Default unit mapping
  if (!this.baseUnit && this.unit) this.baseUnit = this.unit;
  // Default legacy sellingPrice if missing
  if (this.sellingPrice == null) {
    const factor = this.category === "COSMETICS" ? 1.35 : 1.25;
    this.sellingPrice = this.purchasePrice * factor;
  }
  // Establish per-unit prices if possible
  const ceil2 = (n) => Math.ceil(n * 100) / 100;
  if (!this.sellingPriceBase) {
    if (this.sellingPrice && this.packUnit && this.packSize > 1) {
      // Treat legacy sellingPrice as pack price; derive per base with ceiling to avoid underpricing
      this.sellingPriceBase = ceil2(this.sellingPrice / this.packSize);
    } else if (this.sellingPrice) {
      this.sellingPriceBase = this.sellingPrice;
    }
  }
  if (!this.sellingPricePack) {
    if (this.sellingPriceBase && this.packSize > 1) {
      this.sellingPricePack = this.sellingPriceBase * this.packSize;
    } else if (this.sellingPrice && this.packUnit && this.packSize > 1) {
      this.sellingPricePack = this.sellingPrice; // legacy pack price provided
    }
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
