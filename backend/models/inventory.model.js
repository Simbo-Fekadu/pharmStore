import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Immutable record of a single stock movement
const stockLedgerSchema = new Schema(
  {
    medicineId: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
    batchId: { type: Schema.Types.ObjectId },
    locationId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    quantity: { type: Number, required: true }, // in = positive, out = negative
    transactionType: {
      type: String,
      enum: [
        "GRN",
        "TRANSFER_OUT",
        "TRANSFER_IN",
        "SALE",
        "RETURN_CUSTOMER",
        "RETURN_SUPPLIER",
        "ADJUSTMENT",
      ],
      required: true,
    },
    sourceDocType: { type: String },
    sourceDocId: { type: String },
    unitCost: { type: Number },
    unitPrice: { type: Number },
    correlationId: { type: String },
    idempotencyKey: { type: String, index: true },
    status: { type: String, enum: ["ACTIVE", "REVERSED"], default: "ACTIVE" },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    expiryDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

stockLedgerSchema.index({ medicineId: 1, batchId: 1, locationId: 1, createdAt: -1 });
stockLedgerSchema.index({ sourceDocType: 1, sourceDocId: 1 });

// Materialized balance per item+batch+location
const stockBalanceSchema = new Schema(
  {
    medicineId: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
    batchId: { type: Schema.Types.ObjectId },
    locationId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    onHandQty: { type: Number, required: true, default: 0 },
    reservedQty: { type: Number, required: true, default: 0 },
    lastTxnAt: { type: Date },
    lastTxnId: { type: Schema.Types.ObjectId },
    avgCost: { type: Number },
  },
  { timestamps: true }
);

stockBalanceSchema.index({ medicineId: 1, batchId: 1, locationId: 1 }, { unique: true, partialFilterExpression: { medicineId: { $exists: true }, locationId: { $exists: true } } });

export const StockLedger = model("StockLedger", stockLedgerSchema);
export const StockBalance = model("StockBalance", stockBalanceSchema);

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
