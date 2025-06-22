import mongoose from "mongoose";

const returnShipmentHistorySchema = new mongoose.Schema(
  {
    returnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment",
      required: true,
    },
    currentStatus: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    partner_lat: {
      type: String, 
    },
    partner_lng: {
      type: String, 
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ReturnShipmentHistory", returnShipmentHistorySchema);
export const ReturnShipmentHistory = mongoose.model(
  "ReturnShipmentHistory",
  returnShipmentHistorySchema
);