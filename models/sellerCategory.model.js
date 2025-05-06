import mongoose from "mongoose";

const sellerCategorySchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerUserAuth",
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerUserAuth", // ✅ Seller reference
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerUserAuth",
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerUserAuth",
    },
  },
  { timestamps: true }
);

export const SellerCategory = mongoose.model("SellerCategory", sellerCategorySchema);
