import mongoose from "mongoose";

const SubcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true, 
    },
    image: {
      type: String, 
    },
    isDeleted: {
      type: Boolean,
      default: false, 
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminAuth", 
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminAuth", 
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminAuth",
    },
  },
  { timestamps: true }
);

export const Subcategory = mongoose.model("Subcategory", SubcategorySchema);
