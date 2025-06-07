import express from "express";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";
import { createRatingReview, getReviewsByProduct, replyToReview } from "../controllers/ratingReviewController.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.post("/create-review",isUserAuthenticated, 
  upload.fields([
    { name: "images", maxCount: 5 }
  ]),
  createRatingReview);

router.get("/list-review",isUserAuthenticated, getReviewsByProduct);

router.put("/reply-review/:reviewId",isUserAuthenticated, replyToReview);


export default router;
