import mongoose from "mongoose";

const sellerSubCategorySchema = new mongoose.Schema(
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
    sellerCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerCategory",
      required: true,
    },
    subCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerUserAuth",
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

export const SellerSubCategory = mongoose.model("SellerSubCategory", sellerSubCategorySchema);
