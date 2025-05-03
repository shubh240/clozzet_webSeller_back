import express from "express";
import {
  registerSeller,
  loginseller,
  generateOtp,
  verifyOtp,
  logoutSeller,
} from "../controllers/userController.js";

const router = express.Router();

router.route("/signup").post(registerSeller);
router.route("/login").post(loginseller);
router.route("/generateOtp").post(generateOtp);
router.route("/verifyOtp").post(verifyOtp);
router.route("/logout").get(logoutSeller);

export default router;
