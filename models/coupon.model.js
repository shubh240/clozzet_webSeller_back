import mongoose from "mongoose";

const couponModel = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true
    },
    couponType: {
      type: String,
      enum: [
        "First order discount",
        "Buy one get one",
        "Free Shipping",
      ],
      required: true,
    },

    code: {
      type: String,
      required: true,
    },
    limitForSameUser: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    expireDate: {
      type: Date,
      required: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed amount"],
      required: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    maxDiscount: {
      type: Number,
      required: true,
    },
    minPurchase: {
      type: Number,
      required: true,
    },

  },
  { timestamps: true }
);

export const Coupon = mongoose.model("Coupon", couponModel);
