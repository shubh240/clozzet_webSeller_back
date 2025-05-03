import express from "express";
import upload from "../middleware/multer.middleware.js";
import {
  addStore,
  getAllStores,
  editStore,
  deleteStore,
} from "../controllers/storeController.js";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";

const router = express.Router();

// Upload Image and Video Middleware
router.post(
  "/add",
  isUserAuthenticated,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "coverPhoto", maxCount: 1 },
  ]),
  addStore
); // Add new item with image & video


router.get("/all", getAllStores); // Get all items

router.put(
  "/edit/:id",
  isUserAuthenticated,

  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "coverPhoto", maxCount: 1 },
  ]),
  editStore
); // Edit item by ID with image & video

router.delete("/delete/:id", isUserAuthenticated, deleteStore); // Delete item by ID

export default router;
