import { RatingReview } from "../models/ratingReview.model.js";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { sendResponse } from "../common/index.js";
import mongoose from "mongoose";

export const createRatingReview = async (req, res) => {
  try {
    const { productId, orderId, rating, review } = req.body;

    if (!productId || !orderId || !rating) {
      return sendResponse(res, 400, false, "ProductId, orderId and rating are required");
    }

    const customerId = req.id;

    const product = await Product.findById(productId).select("storeId");
    if (!product) {
      return sendResponse(res, 404, false, "Product not found");
    }

    const existingReview  = await RatingReview.findOne({
      productId,
      customerId,
    });
    if (existingReview ) {
      const oldRating = existingReview.rating;

      existingReview.rating = rating;
      existingReview.review = review;
      existingReview.timing = new Date();
      await existingReview.save();

      const newAvgRating = parseFloat(
        ((product.avgRating * product.totalRating - oldRating + rating) / product.totalRating).toFixed(2)
      );

      await Product.findByIdAndUpdate(productId, {
        $set: { avgRating: newAvgRating },
      });

      return sendResponse(res, 200, true, "Review updated successfully", existingReview);
    }

    const newReview = new RatingReview({
      productId,
      orderId,
      customerId,
      storeId: product.storeId,
      rating,
      review,
      timing: new Date(),
    });

    await newReview.save();

    const newTotalRating = product.totalRating + 1;
    const newAvgRating = parseFloat(
      ((product.avgRating * product.totalRating + rating) / newTotalRating).toFixed(2)
    );

    await Product.findByIdAndUpdate(productId, {
      $inc: {
        totalReview: 1,
        totalRating: 1,
      },
       $set: {
        avgRating: newAvgRating,
      },
    });

    return sendResponse(res, 201, true, "Review submitted successfully", ratingReview);
  } catch (error) {
    console.error("Review creation error:", error);
    return sendResponse(res, 500, false, "Internal Server Error");
  }
};

export const getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const query = {};

    if(productId){
      query.productId = new mongoose.Tyes.ObjectId(productId)
    }

    const reviews = await RatingReview.find(query)
      .populate("customerId", "fullName image")
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, "Product reviews fetched", reviews);
  } catch (error) {
    console.error("Fetch reviews error:", error);
    return sendResponse(res, 500, false, "Internal Server Error");
  }
};