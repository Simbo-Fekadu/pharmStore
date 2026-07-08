import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medicine",
      required: true,
    },
    medicineName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String, // baseUnit or packUnit used for this sale
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    shift: {
      type: String,
      enum: ["morning", "afternoon", "evening", "night"],
      default: "morning",
    },
    refundedAt: { type: Date },
    refundNote: { type: String },
    refundedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
saleSchema.index({ date: 1, employeeId: 1 });
saleSchema.index({ branchId: 1, date: 1 });

const Sale = mongoose.model("Sale", saleSchema);

export default Sale;
