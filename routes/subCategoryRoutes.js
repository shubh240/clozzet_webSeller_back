import express from "express";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";
import upload from "../middleware/multer.middleware.js";

import {
  addSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
  toggleSubCategoryStatus,
  toggleSubCategoryFeatured,
  deleteSubCategory,
  getSubCategoriesByMainCategory,
} from "../controllers/subCategoryController.js"; 

const router = express.Router();

// POST - Create a new subcategory
router.post(
  "/add",
  isUserAuthenticated,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "sizeChart", maxCount: 1 },
  ]),
  addSubCategory
);

// GET - Get all subcategories 
router.get("/all", isUserAuthenticated, getAllSubCategories);

// GET - Get subcategory by ID
router.get("/getOne/:id", isUserAuthenticated,  getSubCategoryById);

// PUT - Update subcategory by ID
router.put(
  "/edit/:id",
  isUserAuthenticated,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "sizeChart", maxCount: 1 },
  ]),
  updateSubCategory
);

router.put("/toggle-status/:id", isUserAuthenticated, toggleSubCategoryStatus);
router.put(
  "/toggle-featured/:id",
  isUserAuthenticated,
  toggleSubCategoryFeatured
);


// DELETE - Delete subcategory by ID
router.delete("/delete/:id", deleteSubCategory);

// GET - Get subcategories by mainCategoryId
router.get("/main/:mainCategoryId", getSubCategoriesByMainCategory);

export default router;
