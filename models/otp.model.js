import mongoose from "mongoose";

const otpModel = new mongoose.Schema(
  {
    otp: {
      type: Number,
      required: true,
    },  
    otp_type: {
      type: String,
      required: true,
    },
    mobileNo: {
      type: String,
      required: true,
      unique: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    }
  },
  { timestamps: true }
);

export const Otp = mongoose.model("Otp", otpModel);
