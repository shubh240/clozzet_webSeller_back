import mongoose from "mongoose";

const categoryModel = new mongoose.Schema(
  {
    categoryId: {
      type: String,
      required: true,
    },
    categoryName: {
      type: String,
      required: true,
    },
    categoryStatus: {
      type: Boolean,
      default: false,
    },
    featured: {
      type: Boolean,
      default: false,
    },

    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminAuth",
    },
  },
  { timestamps: true }
);

export const Category = mongoose.model("Category", categoryModel);
