import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    // Store to which this coupon belongs
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreInfo",
      required: true,
    },

    // Seller who created this coupon
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerUserAuth",
      required: true,
    },

    // Unique coupon code to be applied by users (e.g., "WELCOME50")
    couponCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true, // stored in uppercase format
      trim: true,      // removes spaces before/after
    },

    // Type of discount: "percentage" or "flat"
    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      required: true,
    },

    // The value of the discount: e.g., 10 for 10% or ₹50 flat
    discountValue: {
      type: Number,
      required: true,
    },

    // Minimum cart/order amount required to apply this coupon
    minOrderAmount: {
      type: Number,
      default: 0,
    },

    // Maximum discount allowed (e.g., cap ₹100 off even if 20%)
    maxDiscountAmount: {
      type: Number,
      default: 0,
    },

    usageLimit: {
      type: Number,
      default: 0,
    },

    usageLimitPerUser: {
      type: Number,
      default: 0,
    },

    validFrom: {
      type: Date,
      required: true,
    },

    validTill: {
      type: Date,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
couponSchema.index({ storeId: 1, couponCode: 1 }, { unique: true });

export const Coupon = mongoose.model("Coupon", couponSchema);
