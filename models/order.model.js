import mongoose from "mongoose";

const orderModel = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    orderStatus: {
      type: String,
      enum: [
        "Confirmed",
        "Ready for Delivery",
        "Item on the Way",
        "Delivered",
        "Refunded",
        "Scheduled",
      ],
      default: "Confirmed",
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          default: 1,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    totalAmount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "UPI", "Card", "NetBanking"],
      default: "COD",
    },
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    trackingId: { type: String },
    expectedDeliveryDate: { type: String },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerUserAuth",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderModel);
