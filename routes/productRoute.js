import express from "express";
import upload from "../middleware/multer.middleware.js";
import {
  uploadProductMedia,
  addItem,
  getAllItems,
  editItem,
  toggleVisibility,
  deleteItem,
} from "../controllers/productController.js";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";

const router = express.Router();

// Upload Image and Video Middleware
router.post(
  "/upload-media",
  isUserAuthenticated,

  upload.fields([
    { name: "images", maxCount: 6 },
    { name: "video", maxCount: 1 },
  ]),
  uploadProductMedia
); 

router.post(
  "/add",
    isUserAuthenticated,
    addItem
); 

router.get("/all",  isUserAuthenticated,
 getAllItems); // Get all items

router.put(
  "/edit/:id",
  upload.fields([
    { name: "images", maxCount: 6 },
    { name: "video", maxCount: 1 },
  ]),
  editItem
); // Edit item by ID with image & video

router.patch("/toggle-visibility/:id", isUserAuthenticated, toggleVisibility);


router.delete("/delete/:id", isUserAuthenticated, deleteItem); // Delete item by ID

export default router;
