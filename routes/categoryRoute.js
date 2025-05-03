import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  toggleCategoryStatus,
  toggleCategoryFeatured,
  deleteCategory,
} from "../controllers/categoryController.js";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";


const router = express.Router();

router.post("/add", isUserAuthenticated, createCategory);
router.get("/all", isUserAuthenticated, getAllCategories);
router.get("/:id", isUserAuthenticated, getCategoryById);
router.put("/edit/:id", isUserAuthenticated, updateCategory);
router.patch("/toggle-status/:id", isUserAuthenticated, toggleCategoryStatus);
router.patch(
  "/toggle-featured/:id",
  isUserAuthenticated, toggleCategoryFeatured
);

router.delete("/delete/:id", isUserAuthenticated, deleteCategory);

export default router;
