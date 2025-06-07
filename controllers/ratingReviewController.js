import { RatingReview } from "../models/ratingReview.model.js";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { sendResponse } from "../common/index.js";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

export const createRatingReview = async (req, res) => {
  try {
    const { productId, orderId, rating, review } = req.body;

    if (!productId || !orderId || !rating) {
      return sendResponse(
        res,
        400,
        false,
        "ProductId, orderId, and rating are required"
      );
    }

    const customerId = req.id;

    // 1. Check if product exists
    const product = await Product.findById(productId).select("storeId");
    if (!product) {
      return sendResponse(res, 404, false, "Product not found");
    }

    const order = await Order.findOne({
      _id: orderId,
      customerId: customerId,
    });

    if (!order) {
      return sendResponse(
        res,
        404,
        false,
        "Order not found for this product and customer"
      );
    }

    let imageUrls = [];

    if (req.files && req.files["images"]) {
      for (let file of req.files["images"]) {
        const filePath = file.path;
        const result = await cloudinary.uploader.upload(filePath, {
          folder: "uploads/reviews/images",
          resource_type: "image",
        });
        imageUrls.push(result.secure_url);
        fs.unlinkSync(filePath);
      }
    }

    const existingReview = await RatingReview.findOne({
      productId,
      customerId,
    });

    if (existingReview) {
      existingReview.rating = rating;
      existingReview.review = review;
      existingReview.timing = new Date();
      await existingReview.save();
    } else {
      const newReview = new RatingReview({
        productId,
        orderId,
        customerId,
        storeId: product.storeId,
        rating,
        review,
        timing: new Date(),
        images: imageUrls,
      });

      await newReview.save();
    }

    const ratingStats = await RatingReview.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalRating: { $sum: 1 },
        },
      },
    ]);

    if (ratingStats.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        $set: {
          avgRating: parseFloat(ratingStats[0].avgRating.toFixed(2)),
          totalRating: ratingStats[0].totalRating,
          totalReview: ratingStats[0].totalRating,
        },
      });
    }

    return sendResponse(
      res,
      200,
      true,
      existingReview
        ? "Review updated successfully"
        : "Review submitted successfully"
    );
  } catch (error) {
    console.error("Review creation error:", error);
    return sendResponse(res, 500, false, "Internal Server Error");
  }
};

export const getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.query;
    const query = {};

    if (!productId) {
      return sendResponse(res, 400, false, "Missing product ID");
    }

    const reviews = await RatingReview.find({
      productId: new mongoose.Types.ObjectId(productId),
    })
      .populate("customerId", "fullName image")
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, "Product reviews fetched", reviews);
  } catch (error) {
    console.error("Fetch reviews error:", error);
    return sendResponse(res, 500, false, "Internal Server Error");
  }
};

export const replyToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return sendResponse(res, 400, false, "Invalid review ID");
    }

    if (!reply || typeof reply !== "string") {
      return sendResponse(res, 400, false, "Reply must be a non-empty string");
    }

    const review = await RatingReview.findById(reviewId);

    if (!review) {
      return sendResponse(res, 404, false, "Review not found");
    }

    review.reviewReply = reply;
    await review.save();

    return sendResponse(res, 200, true, "Reply added successfully", review);
  } catch (error) {
    console.error("Reply to review error:", error);
    return sendResponse(res, 500, false, "Internal Server Error");
  }
};
