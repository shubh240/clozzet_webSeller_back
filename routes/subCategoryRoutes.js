import express from "express";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";

import {
  getAllSubCategories
} from "../controllers/subCategoryController.js"; 

const router = express.Router();

// GET - Get all subcategories 
router.get("/list-subCategory", isUserAuthenticated, getAllSubCategories);


export default router;
