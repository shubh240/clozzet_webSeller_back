import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    description: { type: String },
    sellingPrice: { type: Number, required: true },
    originalPrice: { type: Number, default: 0 },
    brandName: { type: String, required: true },
    status: { type: Boolean, default: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
    },
    sizeChart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SizeChart",
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerUserAuth",
      required: true,
    },
    primaryImage: {
      type: String, 
      required: false
    }, 
    colorId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Color",
      required: true,
    },   
    isDeleted: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerUserAuth",
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

export const Product = mongoose.model("Product", ProductSchema);
