import mongoose from "mongoose";

const exchangeProductSchema = new mongoose.Schema(
  {
    exchangeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exchange",
      required: true,
    },
    orderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrderItem",
      required: true,
    },
    newSizeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductSize",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ExchangeProduct = mongoose.model("ExchangeProduct", exchangeProductSchema);
