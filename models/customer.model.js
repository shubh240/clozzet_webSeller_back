import mongoose from "mongoose";

const customerModel = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
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
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    image: {
      type: String,
    },
    token:{
      type:String
    },
    fcmToken: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

export const Customer = mongoose.model("Customer", customerModel);
