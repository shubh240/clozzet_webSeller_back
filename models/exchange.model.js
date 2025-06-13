import mongoose from "mongoose";

const exchangeSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreInfo",
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerUserAuth",
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    image: {
      type: String,
    },

    status: {
      type: String,
      // enum: ["Requested", "Pickup Initiated", "Picked Up", "Completed", "Rejected"],
      default: "Requested",
    },

    shipmentProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShipmentProvider",
    },
    trackingId: {
      type: String,
    },
    pickupAddress: {
      type: String,
    },
    pickupDate: {
      type: Date,
    },
    response: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Exchange = mongoose.model("Exchange", exchangeSchema);
