import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    address: {
      type: String,
      required: true,
    },
    phoneNo: {
      type: String,
      required: true,
    },
    coverPhotoUrl: {
      type: String,
      default: "",
    },
    logoUrl: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const Store = mongoose.model("Store", storeSchema);


