import mongoose from "mongoose";
import  sizeChartSchema  from "./schemas/SizeChartSchema.js";

const subCategoryModel = new mongoose.Schema(
  {
    subCategoryId: {
      type: String,
      required: true,
    },
    subCategoryName: {
      type: String,
      required: true,
    },
    subCategoryStatus: {
      type: Boolean,
      default: false,
    },
    subCategoryImageUrl: {
      type: [String],
      required: true,
    },

    subCategorySizeChartUrl: {
      type: [String],
      default: "",
    },
    subCategorySizeChart: {
      type: [sizeChartSchema],
      default: [],
    },
    gender: {
      type: String,
      enum: ["Men", "Women", "Children"],
      required: true,
    },
    categoryType: {
      type: String,
      enum: ["upper", "lower"],
      required: true,
    },
    mainCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerUserAuth",
      required: true,
    },
  },
  { timestamps: true }
);

export const SubCategory = mongoose.model("SubCategory", subCategoryModel);
