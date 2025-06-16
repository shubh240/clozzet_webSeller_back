import mongoose from "mongoose";

const SellerStoreInfoSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      required: true,
    },
    storeOn: {
      type: Boolean,
      default: false,
    },
    storeAddress: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    pincode: {
      type: String,
      required: true,
    },
    address_url: {
      type: String,
      default: "",
    },

    coverPhotoUrl: {
      type: String,
      default: "",
    },
    logoUrl: {
      type: String,
      default: "",
    },
    limitTime: {
      minimum: {
        type: String,
        default: "",
      },
      maximum: {
        type: String,
        default: "",
      },
      selectTime: {
        type: String,
        default: "",
      },
    },
    position: {
      lat: {
        type: Number,
      },
      lng: {
        type: Number,
      },
    },
    zone: {
      type: String,
      default: "",
    },

    sellerAuthId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerUserAuth",
      required: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminAuth",
    },
    is_deleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const StoreInfo = mongoose.model("StoreInfo", SellerStoreInfoSchema);
