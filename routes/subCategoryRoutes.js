import express from "express";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";
import upload from "../middleware/multer.middleware.js";
import {
  createSellerSubCategory , getSellerSubCategories,deleteSellerSubCategory,updateSellerSubCategory
} from "../controllers/subCategoryController.js"; 

const router = express.Router();

router.post("/add-subCategory", isUserAuthenticated,upload.fields([
    { name: "image", maxCount: 1 }
  ]), createSellerSubCategory);
router.get("/list-subCategory", isUserAuthenticated, getSellerSubCategories);
router.put("/edit-subCategory/:id", isUserAuthenticated,upload.fields([
    { name: "image", maxCount: 1 }
  ]), updateSellerSubCategory);
router.delete("/delete-subCategory/:id", isUserAuthenticated, deleteSellerSubCategory);


export default router;
