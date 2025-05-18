import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productSizeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductSize",
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    subcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
    },
    sku: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    productSize: {
      type: String,
      required: true,
    },
    productImage: {
      type: String,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    amountPerUnit: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true, 
  }
);

export const OrderItem = mongoose.model(
  "OrderItem",
  orderItemSchema
);
