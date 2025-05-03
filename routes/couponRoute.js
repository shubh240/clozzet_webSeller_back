import express from "express";
import {
  addCoupon,
  getAllCoupons,
  editCoupon,
  deleteCoupon,
} from "../controllers/couponController.js";

const router = express.Router();

router.post("/add", addCoupon); 
router.get("/all", getAllCoupons); 
router.put("/edit/:id", editCoupon); 
router.delete("/delete/:id", deleteCoupon); 

export default router;
