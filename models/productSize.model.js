import mongoose from "mongoose";

const ProductSizeSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
    },
    size: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerAuth",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerAuth",
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerAuth",
    },
  },
  { timestamps: true }
);

export const ProductSize = mongoose.model("ProductSize", ProductSizeSchema);
