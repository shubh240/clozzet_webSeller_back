import express from "express";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";

import {
  createSellerSubCategory , getSellerSubCategories,deleteSellerSubCategory,updateSellerSubCategory
} from "../controllers/subCategoryController.js"; 

const router = express.Router();

router.post("/add-subCategory", isUserAuthenticated, createSellerSubCategory);
router.get("/list-subCategory", isUserAuthenticated, getSellerSubCategories);
router.put("/edit-subCategory/:id", isUserAuthenticated, updateSellerSubCategory);
router.delete("/delete-subCategory/:id", isUserAuthenticated, deleteSellerSubCategory);


export default router;
