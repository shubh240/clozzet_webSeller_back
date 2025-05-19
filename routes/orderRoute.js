import express from "express";
import {
  createOrder,
  createRazorpayOrder,
  verifyPayment,
  createShipment,
  // generateInvoice
} from "../controllers/orderController.js";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";


const router = express.Router();

router.post("/create-order", isUserAuthenticated, createOrder);
router.post("/create-razorpay-order", isUserAuthenticated, createRazorpayOrder);
router.post("/verify-payment", isUserAuthenticated, verifyPayment);
router.post("/create-shipment", isUserAuthenticated, createShipment);

// router.post("/generate-invoice", isUserAuthenticated, generateInvoice);



export default router;
