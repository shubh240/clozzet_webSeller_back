import express from "express";
import {
  signup,
  generateOtp,
  verifyOtp,
  logout,
  updateProfile
} from "../controllers/customerController.js";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.route("/signup").post(signup);
router.route("/generateOtp").post(generateOtp);
router.route("/verifyOtp").post(verifyOtp);
router.route("/logout").get(logout);
router.put("/profile", isUserAuthenticated ,
  upload.fields([
    { name: "image", maxCount: 1 }
  ]),
  updateProfile);

export default router;
