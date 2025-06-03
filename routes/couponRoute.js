import express from "express";
import {
  createCoupon,
  getSellerCoupons,
  getCustomerCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon
} from "../controllers/couponController.js";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.post("/add-coupon",isUserAuthenticated,  
  upload.fields([
    { name: "images", maxCount: 1 }
  ]),
  createCoupon); 
router.get("/list-seller-coupon",isUserAuthenticated, getSellerCoupons); 
router.get("/couponById/:id",isUserAuthenticated, getCouponById); 
router.put("/edit-coupon/:id",isUserAuthenticated,upload.fields([
    { name: "images", maxCount: 1 }
  ]),
  updateCoupon);
router.delete("/delete-coupon/:id",isUserAuthenticated, deleteCoupon); 

//customer-fetching coupons
router.get("/list-customer-coupon", getCustomerCoupons); 

export default router;
