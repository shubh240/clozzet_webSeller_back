import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
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
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreInfo",
      required: true,
    },
    primaryImage: {
      type: String, 
      required: false
    }, 
    colors: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "Color",
     },
    totalRating : {type:Number ,default : 0},
    totalReview : {type:Number ,default : 0},
    avgRating: { type: Number, default: 0 },
    
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
