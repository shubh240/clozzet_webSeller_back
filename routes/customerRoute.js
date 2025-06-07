import express from "express";
import {
  signup,
  generateOtp,
  verifyOtp,
  logout,
  updateProfile,
  addAddress,
  getAllAddresses,
  getAddressById,
  updateAddress,
  deleteAddress
} from "../controllers/customerController.js";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/generateOtp", generateOtp);
router.post("/verifyOtp", verifyOtp);
router.get("/logout",isUserAuthenticated, logout);
router.put("/profile", isUserAuthenticated ,
  upload.fields([
    { name: "image", maxCount: 1 }
  ]),
  updateProfile);


/**
 * Manage Address
 */

router.post("/add-address",isUserAuthenticated, addAddress);
router.get("/list-address",isUserAuthenticated, getAllAddresses);
router.get("/list-addresById/:id",isUserAuthenticated, getAddressById);
router.put("/update-address/:id",isUserAuthenticated, updateAddress);
router.delete("/delete-address/:id",isUserAuthenticated, deleteAddress);

export default router;
