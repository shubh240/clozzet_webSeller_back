import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    refundId: {
      type: String,
      required: true,
      unique: true,
    },
    refundAmount: {
      type: Number,
      required: true,
    },
    refundReason: {
      type: String,
    },
    refundStatus: {
      type: String,
    //   enum: ["pending", "processing", "completed", "failed"],
      default: null,
    },
    refundResponse: {
      type: String,
    },
  },
  {
    timestamps: true, 
  }
);

export const Refund = mongoose.model(
  "Refund",
  refundSchema
);