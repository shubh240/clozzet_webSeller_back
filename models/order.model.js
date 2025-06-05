import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
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
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    customerAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerAddress",
      required: true,
    },
    paymentTypeId: {
      type: Number,
      ref: "PaymentType",
      required: true,
    },
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    transactionId: {
      type: String,
    },
    paymentStatus: {
      type: String,
      // enum: ["Pending", "Success", "Failed"],
      default: "Pending",
    },
    paymentError: {
      type: String,
    },
    orderStatus: {
      type: String,
      // enum: ["Pending", "Accepted", "Rejected", "Cancelled", "Delivered"],
      default: "Pending",
    },
    subTotalAmount: {
      type: Number,
      required: true,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    cgst: {
      type: Number,
      default: 0,
    },
    sgst: {
      type: Number,
      default: 0,
    },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String, default: null }, 
    totalAmount: {
      type: Number,
      required: true,
    },
    invoiceUrl: {
      type: String,
    },
    currency: {
      type: String,
      default: "INR",
    }
  },
  {
    timestamps: true
  }
);

export const Order = mongoose.model(
  "Order",
  orderSchema
);
