import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
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
      type: mongoose.Schema.Types.ObjectId,
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
      // enum: ["pending", "success", "failed"],
      default: "pending",
    },
    paymentError: {
      type: String,
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
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
    cancelledBy: {
      type: String,
      // enum: ["customer", "seller", null],
      default: null,
    },
    cancelledReason: {
      type: String,
    },
    cancelledAt: {
      type: Date,
    },
    isRefunded: {
      type: Boolean,
      default: false,
    },
    refundStatus: {
      type: String,
      // enum: ["pending", "completed", "failed", null],
      default: null,
    },
  },
  {
    timestamps: true
  }
);

export const Order = mongoose.model(
  "Order",
  orderSchema
);
