import mongoose from "mongoose";

const customerModel = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    mobileNo: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    otp: {
      type: String,
    },
    otpValid: {
      type: Date,
      default: null,
    },

    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },

    status: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Customer = mongoose.model("Customer", customerModel);
