import express from "express";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";
import { createProductSize, deleteProductSize, getProductSizes, updateProductSize } from "../controllers/productSizeController.js";

const router = express.Router();

// Create a new product size
router.post("/create-productSize",isUserAuthenticated, createProductSize);

// Get all sizes for a product
router.get("/list-prodctSize",isUserAuthenticated, getProductSizes);

// Update a product size
router.put("/update-prodctSize/:id",isUserAuthenticated, updateProductSize);

// Soft delete a product size
router.delete("/delete-prodctSize/:id",isUserAuthenticated, deleteProductSize);

export default router;
