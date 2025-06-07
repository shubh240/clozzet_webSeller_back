import mongoose from "mongoose";

const ratingReviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreInfo",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      trim: true,
    },
    timing: {
      type: Date,
      default: Date.now, 
    },
  },
  {
    timestamps: true,
  }
);

export const RatingReview = mongoose.model("RatingReview", ratingReviewSchema);
