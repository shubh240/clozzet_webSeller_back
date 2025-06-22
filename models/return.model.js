import mongoose from "mongoose";

const returnSchema = new mongoose.Schema(
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
    /**
     * "Requested": When the customer submits the return.
     * "Approved": When admin/seller reviews and approves the return.
     * "Pickup Initiated": Reverse shipment created (Porter/Shiprocket).
     * "Picked Up": The product has been picked up.
     * "Rejected": The return request was rejected.
     * "Completed": Refund issued and return closed.
     */
    status: {
      type: String,
      // enum: ["Requested", "Approved", "Pickup Initiated", "Picked Up", "Rejected", "Completed"],
      default: "Requested",
    },
    /**
     * "Pending": Return not processed yet.
     * "Processing": Refund transaction initiated (Razorpay, wallet, etc.).
     * "Completed": Refund successful.
     * "Failed": Refund attempt failed (retry may be needed).
     */
    refundStatus: {
      type: String,
      // enum: ["Pending", "Processing", "Completed", "Failed"],
      default: "Pending",
    },
    refundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Refund",
    },
    shipmentProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShipmentProvider",
    },
    trackingId: {
      type: String,
    },
    pickupDate: {
      type: Date,
    },
    pickupAddress: {
      type: String,
    },
    pickupAddressUrl: {
      type: String,
      trim: true,
    },
    pickupPincode: {
      type: String,
    },
    pickupCity: {
      type: String,
      trim: true,
    },
    pickupState: {
      type: String,
      trim: true,
    },
    pickupLat: {
      type: Number,
    },
    pickupLng: {
      type: Number,
    },
    pickupAddressType: {
      type: String, // e.g., Home, Office, etc.
      trim: true,
    },
    dropAddressLine1: {
      type: String,
      trim: true,
    },
    dropAddressLine2: {
      type: String,
      trim: true,
    },
    dropAddressUrl: {
      type: String,
      trim: true,
    },
    dropLandmark: {
      type: String,
      trim: true,
    },
    dropPincode: {
      type: String,
    },
    dropCity: {
      type: String,
      trim: true,
    },
    dropState: {
      type: String,
      trim: true,
    },
    dropLat: {
      type: Number,
    },
    dropLng: {
      type: Number,
    },
    partner_name: {
      type: String,
    },
    partner_vehicle_number: {
      type: String,
    },
    partner_mobile: {
      type: String,
    },
    partner_lat: {
      type: String,
    },
    partner_lng: {
      type: String,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    shipmentResponse: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Return = mongoose.model("Return", returnSchema);
