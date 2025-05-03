import mongoose from "mongoose";

const sellerUserAuthSchema = new mongoose.Schema(
  {
    userInfo: {
      firstName: {
        type: String,
        required: true,
      },
      lastName: {
        type: String,
        required: true,
      },
      mobileNo: {
        type: String,
        required: true,
        unique: true,
      },
    },
    userAuth: {
      email: {
        type: String,
        required: true,
        unique: true,
      },
      password: {
        type: String,
        required: true,
      },
      otp: {
        type: String,
      },
      otpValid: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true }
);

export const SellerUserAuth = mongoose.model(
  "SellerUserAuth",
  sellerUserAuthSchema
);
