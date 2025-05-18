import mongoose from "mongoose";

const shipmentProviderSchema = new mongoose.Schema(
  {
    indexNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, 
  }
);

export const ShipmentProvider = mongoose.model(
  "ShipmentProvider",
  shipmentProviderSchema
);
