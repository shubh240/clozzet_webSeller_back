import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminAuth",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminAuth",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminAuth",
    },
  },
  { timestamps: true }
);

export const Category = mongoose.model("Category", CategorySchema);
