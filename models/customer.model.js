import mongoose from "mongoose";

const customerModel = new mongoose.Schema(
  {
    fullName: {
      type: String,
      //   required: true,
      default: null,
    },
    countryCode: {
      type: String,
      required: true,
    },
    mobileNo: {
      type: Number,
      required: true,
      unique: true,
    },
    altMobileNo: {
      type: Number,
    },
    email: {
      type: String,
      //   required: true,
      //   unique: true,
      //   sparse: true,
      default: null,
    },
    image: {
      type: String,
    },
    token: {
      type: String,
    },
    fcmToken: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Customer = mongoose.model("Customer", customerModel);
