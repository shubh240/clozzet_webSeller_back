import express from "express";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";
import { createSellerCategory, deleteSellerCategory, getSellerCategories, updateSellerCategory } from "../controllers/categoryController.js";

const router = express.Router();

router.post("/add-category", isUserAuthenticated, createSellerCategory);
router.get("/list-category", isUserAuthenticated, getSellerCategories);
router.put("/edit-category/:id", isUserAuthenticated, updateSellerCategory);
router.delete("/delete-category/:id", isUserAuthenticated, deleteSellerCategory);

export default router;
