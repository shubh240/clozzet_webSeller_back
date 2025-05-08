import mongoose from "mongoose";

const ProductImageSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SellerAuth",
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SellerAuth",
      },
      deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SellerAuth",
      }      
  },
  { timestamps: true }
);

export const ProductImage = mongoose.model("ProductImage", ProductImageSchema);
