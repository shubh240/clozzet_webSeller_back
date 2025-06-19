import mongoose from "mongoose";

const shipmentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    shipmentProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShipmentProvider",
      required: true,
    },
    trackingId: {
      type: String,
      trim: true,
    },
    currentStatus: {
      type: String,
      trim: true,
    },
    pickupStoreName: {
      type: String,
      trim: true,
    },
    pickupAddress: {
      type: String,
      trim: true,
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
    dropAddressType: {
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

export const Shipment = mongoose.model(
  "Shipment",
  shipmentSchema
);
