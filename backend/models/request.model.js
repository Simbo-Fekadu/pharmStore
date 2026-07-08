import mongoose from "mongoose";

const requestSchema = new mongoose.Schema(
  {
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medicine",
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    // Multi-tenant scoping: each request belongs to a pharmacy (implicit via branch/medicine, but explicit for faster queries)
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pharmacy",
      index: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    batchNumber: { type: String },
    status: {
      type: String,
      enum: ["Pending", "Shipped", "Received", "Rejected", "Reversed"],
      default: "Pending",
    },
    reason: { type: String },
    rejectionNote: { type: String },
    fulfilledAt: { type: Date },
    receivedAt: { type: Date },
    reversedAt: { type: Date },
    reversalNote: { type: String },
    approvedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receivedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Simple chat-style message thread between branch (employee) and admin
    messages: [
      {
        sender: { type: String, enum: ["admin", "branch"], required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Request = mongoose.model("Request", requestSchema);
export default Request;
