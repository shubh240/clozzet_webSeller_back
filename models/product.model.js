import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    category: {
      type: String,
      required: true,
    },
    subcategory: {
      type: String,
      default: "",
    },
    shortDesc: {
      type: String,
      default: "",
      required: true,
    },
    detailedDesc: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    brand: {
      type: String,
      default: "",
    },
    sku: {
      type: String,
      default: "",
    },
    sellingPrice: {
      type: Number,
      required: true,
    },
    originalPrice: {
      type: Number,
      default: 0,
    },
    discountType: {
      type: String,
      enum: ["percentage", "amount", ""],
      default: "",
    },
    discountValue: {
      type: Number,
      default: 0,
    },
    taxIncluded: {
      type: Boolean,
      default: true,
    },
    taxValue: {
      type: Number,
      default: "",
    },
    stock: {
      type: mongoose.Schema.Types.Mixed, // To store size-wise or custom structure
      default: {},
    },
    stockStatus: {
      type: Boolean,
      default: false,
    },
    imageUrls: {
      type: [String],
      default: [],
      required: true,
    },
    videoUrl: {
      type: String,
      default: "",
    },
    returnPolicy: {
      type: Boolean,
      default: false,
    },
    visibility: {
      newArrival: { type: Boolean, default: false },
      trending: { type: Boolean, default: false },
      hidden: { type: Boolean, default: false },
    },
    seoKeywords: {
      type: String,
      default: "",
    },
    buyerNotes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);



