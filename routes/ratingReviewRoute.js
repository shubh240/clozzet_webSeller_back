import express from "express";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";
import { createRatingReview, getReviewsByProduct } from "../controllers/productSizeController.js";

const router = express.Router();

router.post("/create-productSize",isUserAuthenticated, createRatingReview);

router.get("/list-productSize",isUserAuthenticated, getReviewsByProduct);


export default router;
