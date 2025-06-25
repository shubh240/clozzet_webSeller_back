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
  updateOrderStatusBySeller,
  getSellerReturnRequests,
  getCustomerReturnRequests,
  retunActionPerform,
  shiprocketWebhookHandler,
  processRefund,
  exchangeProduct,
  getCustomerExchanges,
  getSellerExchanges,
  handleExchangeWebhook,
  porterWebhook,
  trackShipment
  // generateInvoice
} from "../controllers/orderController.js";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";


const router = express.Router();

/**
 * Manage Orders
 */
router.post("/create-order", isUserAuthenticated, createOrder);
router.put("/update-order-status/:orderId", isUserAuthenticated, updateOrderStatusBySeller);
router.post("/list-order", isUserAuthenticated, listOrders);
router.get("/order-details/:orderId", isUserAuthenticated, getOrderDetails);

/**
 * RazorPay
 */
router.post("/create-razorpay-order", isUserAuthenticated, createRazorpayOrder);
router.post("/verify-payment", isUserAuthenticated, verifyPayment);

/**
 * Return & Exchange & Refund
 */
router.post("/return-order", isUserAuthenticated,  upload.fields([
    { name: "image", maxCount: 1 }
  ]), returnOrder);
router.post("/exchange-product", isUserAuthenticated,  upload.fields([
    { name: "image", maxCount: 1 }
  ]), exchangeProduct);
router.post("/refund-payment/:id",isUserAuthenticated, processRefund);


router.get("/list-sellerReturnOrder", isUserAuthenticated, getSellerReturnRequests);
router.get("/list-sellerExchangeOrder", isUserAuthenticated, getSellerExchanges);
router.post("/retunActionPerform/:id", isUserAuthenticated, retunActionPerform);

/**
 * Webhook for Shiprocket & Porter
 */
router.post("/shiprocket-webhook-handler", shiprocketWebhookHandler);
router.post("/porter-webhook", porterWebhook);

router.post("/porter-webhook-test", (req, res) => {
  console.log("Porter Webhook Test Payload:", req.body);
  res.status(200).json({ success: true, message: "Webhook received" });
});


router.post("/exchange-pickup-status", handleExchangeWebhook);

/**
 * Customer side list Return & Exchange
 */
router.get("/list-customerReturnOrder", isUserAuthenticated, getCustomerReturnRequests);
router.get("/list-customerExchangeOrder", isUserAuthenticated, getCustomerExchanges);

// router.post("/create-shipment", isUserAuthenticated, createShipment);

router.post('/api/razorpay/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);

// router.post("/generate-invoice", isUserAuthenticated, generateInvoice);

// router.get("/track-shipment", trackShipments);
router.get("/shipment-track/:shipmentId", isUserAuthenticated, trackShipment);

export default router;
