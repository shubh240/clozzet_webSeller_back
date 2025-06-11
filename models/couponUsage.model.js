// models/couponUsage.model.js
import mongoose from "mongoose";

const couponUsageSchema = new mongoose.Schema({
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Coupon",
    required: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

couponUsageSchema.index({ couponId: 1, customerId: 1 }, { unique: true });

export const CouponUsage = mongoose.model("CouponUsage", couponUsageSchema);
