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
      }
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminAuth",
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    fcmToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export const SellerUserAuth = mongoose.model(
  "SellerUserAuth",
  sellerUserAuthSchema
);
