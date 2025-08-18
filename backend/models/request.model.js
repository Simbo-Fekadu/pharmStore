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
    quantity: { type: Number, required: true, min: 1 },
    batchNumber: { type: String },
    status: {
      type: String,
      enum: ["Pending", "Rejected", "Fulfilled"],
      default: "Pending",
    },
    reason: { type: String },
    rejectionNote: { type: String },
    fulfilledAt: { type: Date },
  },
  { timestamps: true }
);

const Request = mongoose.model("Request", requestSchema);
export default Request;
