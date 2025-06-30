import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    cartId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart",
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
      // enum: ["Pending", "Accepted", "Rejected", "Processing", "Partner Assigned", "Out For Delivery", "Delivered", "Shipment Cancelled", "Return Initiated"],
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
    },
    deliveredTime: {
      type: Date,
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
