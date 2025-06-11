import express from "express";
import upload from "../middleware/multer.middleware.js";
import {
  createOrder,
  createRazorpayOrder,
  verifyPayment,
  createShipment,
  listOrders,
  getOrderDetails,
  returnOrder,
  razorpayWebhook,
  trackShipments,
  updateOrderStatusBySeller,
  getSellerReturnRequests,
  getCustomerReturnRequests,
  retunActionPerform,
  shiprocketWebhookHandler,
  porterWebhookHandler,
  processRefund
  // generateInvoice
} from "../controllers/orderController.js";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";


const router = express.Router();

router.post("/create-order", isUserAuthenticated, createOrder);
router.put("/update-order-status/:orderId", isUserAuthenticated, updateOrderStatusBySeller);
router.post("/list-order", isUserAuthenticated, listOrders);
router.get("/order-details/:orderId", isUserAuthenticated, getOrderDetails);


router.post("/create-razorpay-order", isUserAuthenticated, createRazorpayOrder);
router.post("/verify-payment", isUserAuthenticated, verifyPayment);


router.post("/return-order", isUserAuthenticated,  upload.fields([
    { name: "image", maxCount: 1 }
  ]), returnOrder);
router.get("/list-sellerReturnOrder", isUserAuthenticated, getSellerReturnRequests);
router.post("/retunActionPerform/:id", isUserAuthenticated, retunActionPerform);

router.post("/shiprocket-webhook", shiprocketWebhookHandler);
router.post("/porter-webhook", porterWebhookHandler);

router.post("/refund-payment/:id",isUserAuthenticated, processRefund);

router.get("/list-customerReturnOrder", isUserAuthenticated, getCustomerReturnRequests);

router.post("/create-shipment", isUserAuthenticated, createShipment);

router.post('/api/razorpay/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);

// router.post("/generate-invoice", isUserAuthenticated, generateInvoice);

router.get("/track-shipment", trackShipments);

export default router;
