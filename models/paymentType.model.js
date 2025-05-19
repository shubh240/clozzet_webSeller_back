import mongoose from "mongoose";

const paymentTypeSchema = new mongoose.Schema(
  {
    indexNumber: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const PaymentType = mongoose.model(
  "PaymentType",
  paymentTypeSchema
);