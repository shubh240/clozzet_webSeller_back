import express from "express";
import {
  loginseller,
  generateOtp,
  verifyOtp,
  logoutSeller,
  updateSellerFcmToken,
} from "../controllers/userController.js";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";

const router = express.Router();

// router.route("/signup").post(registerSeller);
router.route("/login").post(loginseller);
router.route("/generateOtp").post(generateOtp);
router.route("/verifyOtp").post(verifyOtp);
router.route("/logout",isUserAuthenticated).get(logoutSeller);

router.put("/update-fcm-token", isUserAuthenticated, updateSellerFcmToken)

export default router;
