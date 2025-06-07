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

// router.post("/signup", registerSeller);
router.post("/login", loginseller);
router.post("/generateOtp", generateOtp);
router.post("/verifyOtp", verifyOtp);
router.get("/logout",isUserAuthenticated, logoutSeller);

router.put("/update-fcm-token", isUserAuthenticated, updateSellerFcmToken)

export default router;
