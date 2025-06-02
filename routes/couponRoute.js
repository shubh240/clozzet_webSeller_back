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

const router = express.Router();

router.post("/add-coupon",isUserAuthenticated, createCoupon); 
router.get("/list-seller-coupon",isUserAuthenticated, getSellerCoupons); 
router.get("/couponById/:id",isUserAuthenticated, getCouponById); 
router.put("/edit-coupon/:id",isUserAuthenticated, updateCoupon);
router.delete("/delete-coupon/:id",isUserAuthenticated, deleteCoupon); 

//customer-fetching coupons
router.get("/list-customer-coupon", getCustomerCoupons); 

export default router;
