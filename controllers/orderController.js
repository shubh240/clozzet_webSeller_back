import { Order } from "../models/order.model.js";
import { OrderItem } from "../models/orderItems.model.js";
import { Cart } from "../models/cart.model.js";
import { CartProduct } from "../models/cartProduct.model.js";
import { Product } from "../models/product.model.js";
import { ProductSize } from "../models/productSize.model.js";
import { CustomerAddress } from "../models/customerAddres.model.js";
import { Shipment } from "../models/shipment.model.js";
import { ShipmentHistory } from "../models/shipmentHistory.model.js";
import { v4 as uuidv4 } from "uuid";
import { sendResponse, roundToTwo } from "../common/index.js";
import { getDistanceInKm } from "../common/distance.js";
import { calculateAndUpdateCartTotals } from "./cartController.js";
import { ShipmentProvider } from "../models/shipmentProvider.model.js";
import {
  createShiprocketShipment,
  createShiprocketReversePickup,
} from "../provider/shiprocket.js";
import {
  createPorterShipment,
  createPorterReversePickup,
  getPorterLiveTrackingDetails,
} from "../provider/porter.js";
import { rezerpayRefundPayment } from "../provider/razorPay.js";
import { StoreInfo } from "../models/sellerStoreInfo.model.js";
import { Category } from "../models/category.model.js";
import { Subcategory } from "../models/subCategories.model.js";
import { Customer } from "../models/customer.model.js";
import { Color } from "../models/color.model.js";
import { Refund } from "../models/refund.model.js";
import { Return } from "../models/return.model.js";
import { ReturnProduct } from "../models/returnProduct.model.js";
import { PaymentType } from "../models/paymentType.model.js";
import { razorpay } from "../config/razorPay.js";
import { Exchange } from "../models/exchange.model.js";
import { ExchangeProduct } from "../models/exchangeProduct.model.js";
import mongoose from "mongoose";
import axios from "axios";
import { Coupon } from "../models/coupon.model.js";
import { CouponUsage } from "../models/couponUsage.model.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import {
  sendCustomerNotification,
  sendSellerNotification,
} from "../utils/firebase-admin.js";
import { SellerUserAuth } from "../models/sellerUserInfo.model.js";
import crypto from "crypto";
import { ReturnShipmentHistory } from "../models/returnshipmentHistory.model.js";
/**
 *
 * Create an order
 *
 */
export const createOrder = async (req, res) => {
  try {
    const {
      cartId,
      customerAddressId,
      paymentTypeId, // 1 = COD, 2 = Online
    } = req.body;

    const currentHour = new Date().getHours();
    if (currentHour < 9 || currentHour >= 21) {
      return sendResponse(
        res,
        400,
        false,
        "Orders can only be placed between 9 AM to 9 PM"
      );
    }

    if (!cartId || !customerAddressId || !paymentTypeId) {
      return sendResponse(res, 400, false, "All fileds are required");
    }

    /**
     * Get Cart
     */
    const cart = await Cart.findOne({ _id: cartId });
    if (!cart) return sendResponse(res, 404, false, "Cart not found");

    /**
     * Store In-Active (cannot place order)
     */
    const store = await StoreInfo.findById(cart.storeId);
    if (!store || !store.isActive) {
      return sendResponse(
        res,
        400,
        false,
        "Store is inactive, cannot place order"
      );
    }

    if(!store.storeOn) 
    {
      return sendResponse(
        res,
        400,
        false,
        "Store is off, cannot place order"
      );

    }

    /**
     * Check Customer Distance < 15km
     */
    const customerAddress = await CustomerAddress.findById(customerAddressId);
    if (!customerAddress) {
      return sendResponse(res, 404, false, "Customer address not found");
    }

    const storeLat = store?.position?.lat;
    const storeLng = store?.position?.lng;
    const customerLat = customerAddress?.location?.coordinates?.[0];
    const customerLng = customerAddress?.location?.coordinates?.[1];
    console.log('storeLat -->',storeLat)
    console.log('storeLng -->',storeLng)
    console.log('customerLat -->',customerLat)
    console.log('customerLng -->',customerLng)
    if (
      storeLat == null || storeLng == null ||
      customerLat == null || customerLng == null
    ) {
      return sendResponse(res, 400, false, "Invalid location data");
    }

    const distance = getDistanceInKm(storeLat, storeLng, customerLat, customerLng);
    console.log('distance',distance);

    if (distance > 15) {
      return sendResponse(
        res,
        400,
        false,
        "Sorry, delivery is only available within 15 km from the store"
      );
    }
    /**
     * Get Cart Products
     */
    const cartProducts = await CartProduct.find({ cartId: cart._id });
    if (!cartProducts.length)
      return sendResponse(res, 404, false, "Cart is empty");

    /**
     * Fetch Product Details
     */
    const orderItems = [];
    for (const cp of cartProducts) {
      const product = await Product.findById(cp.productId).populate("colors");
      if (!product) continue;

      const productSize = await ProductSize.findById(cp.sizeId);
      if (!productSize) continue;

      if (productSize.quantity < cp.quantity) {
        return sendResponse(
          res,
          400,
          false,
          `Insufficient stock for size: ${productSize.size}`
        );
      }

      const amountPerUnit = product.sellingPrice;
      const total = amountPerUnit * cp.quantity;
      orderItems.push({
        productId: cp.productId,
        productSizeId: cp.sizeId,
        categoryId: product.category,
        subcategoryId: product.subcategory,
        sku: productSize.sku,
        productName: product.name,
        productSize: productSize?.size,
        productImage: product.image,
        quantity: cp.quantity,
        amountPerUnit: roundToTwo(amountPerUnit),
        totalAmount: roundToTwo(total),
        color: product.colors._id,
      });

      await ProductSize.findByIdAndUpdate(productSize._id, {
        $inc: { quantity: -cp.quantity },
      });
    }

    /**
     * Create New Order
     */
    const orderNumber = "ORD-" + Date.now();
    const newOrder = await Order.create({
      cartId,
      storeId: cart?.storeId,
      sellerId: cart?.sellerId,
      customerId: cart?.customerId,
      customerAddressId,
      paymentTypeId,
      orderNumber,
      subTotalAmount: roundToTwo(cart?.sub_total_amount),
      platformFee: roundToTwo(cart?.platform_fee) || 0,
      deliveryFee: roundToTwo(cart?.delivery_fee) || 0,
      couponCode: cart?.couponCode,
      discountAmount: roundToTwo(cart?.discountAmount),
      cgst: roundToTwo(cart?.cgst) || 0,
      sgst: roundToTwo(cart?.sgst) || 0,
      sgst: roundToTwo(cart?.sgst) || 0,
      totalAmount: roundToTwo(cart?.total_amount) || 0,
      paymentStatus: paymentTypeId === 1 ? "Success" : "Pending",
    });

    const itemsToInsert = orderItems.map((item) => ({
      ...item,
      orderId: newOrder._id,
    }));
    await OrderItem.insertMany(itemsToInsert);

    // Send notification to seller
    if (paymentTypeId === 1) {
      const seller = await SellerUserAuth.findById(cart.sellerId);
      if (seller && seller.fcmToken) {
        await sendSellerNotification(
          seller.fcmToken,
          {
            title: "New Order Received",
            body: `You received a new order #${newOrder.orderNumber}!`,
            data: { orderId: newOrder._id.toString(), isFullScreen: "true" },
          },
          seller._id
        );
      }
    }

    /**
     * Handle Coupon Usage Count
     */
    if (cart?.couponCode) {
      const coupon = await Coupon.findOne({
        couponCode: cart.couponCode,
        storeId: new mongoose.Types.ObjectId(cart.storeId),
        is_deleted: false,
        isActive: true,
      });

      if (coupon) {
        if (
          coupon.usageLimit > 0 &&
          coupon.currentUsagesCount >= coupon.usageLimit
        ) {
          return sendResponse(res, 400, false, "Coupon usage limit exceeded");
        }

        const userUsage = await CouponUsage.findOne({
          couponId: coupon._id,
          customerId: cart.customerId,
        });

        if (
          coupon.usageLimitPerUser > 0 &&
          userUsage?.usageCount >= coupon.usageLimitPerUser
        ) {
          return sendResponse(
            res,
            400,
            false,
            "You have reached maximum usage for this coupon"
          );
        }
        coupon.currentUsagesCount += 1;
        await coupon.save();

        await CouponUsage.findOneAndUpdate(
          { couponId: coupon._id, customerId: cart.customerId },
          { $inc: { usageCount: 1 } },
          { upsert: true, new: true }
        );
      }
    }

    /**
     * Clear Cart (only delete when payment is COD)
     */
    if (paymentTypeId === 1) {
      await CartProduct.deleteMany({ cartId: cart._id });
      await Cart.findByIdAndDelete({ _id: cart._id });
    }

    const data = {
      orderId: newOrder._id,
      orderNumber: newOrder.orderNumber,
      paymentTypeId,
      totalAmount: roundToTwo(newOrder.totalAmount),
    };
    return sendResponse(res, 201, true, "Order created successfully", data);
  } catch (error) {
    console.error("Create Order Error:", error.message);
    return sendResponse(res, 500, false, error.message);
  }
};

/**
 *
 * Accept or Reject Order by seller
 *
 *
 */
export const updateOrderStatusBySeller = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!orderId) return sendResponse(res, 400, false, "OrderId is required");
    if (!status) return sendResponse(res, 400, false, "Status is required");

    if (!["Accepted", "Rejected"].includes(status)) {
      return sendResponse(
        res,
        400,
        false,
        "Status must be either 'Accepted' or 'Rejected'"
      );
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { orderStatus: status },
      { new: true }
    );

    if (!order) return sendResponse(res, 404, false, "Order not found");

    // Notify customer
    const customer = await Customer.findById(order.customerId);
    if (customer && customer.fcmToken) {
      await sendCustomerNotification(
        customer.fcmToken,
        {
          title: `Order Status Updated`,
          body: `Your order #${order.orderNumber} status is now ${status}`,
          data: { orderId: order._id.toString(), status },
        },
        customer._id
      );
    }

    // Notify seller
    const seller = await SellerUserAuth.findById(order.sellerId);
    if (seller && seller.fcmToken) {
      await sendSellerNotification(
        seller.fcmToken,
        {
          title: `Order Status Updated`,
          body: `Order #${order.orderNumber} status is now ${status}`,
          data: {
            orderId: order._id.toString(),
            status,
            isFullScreen: "false",
          },
        },
        seller._id
      );
    }

    // Create shipment if order is accepted
    if (status === "Accepted") {
      const store = await StoreInfo.findById(order.storeId).populate({
        path: "sellerAuthId",
        select: "userInfo",
      });

      const customerAddress = await CustomerAddress.findById(
        order.customerAddressId
      ).populate({
        path: "customerId",
        select: "fullName countryCode mobileNo altMobileNo",
      });

      if (!store || !customerAddress) {
        return sendResponse(
          res,
          400,
          false,
          "Missing address info for shipment"
        );
      }

      const shipmentProviderName =
        order.paymentTypeId === 1 ? "Shiprocket" : "Porter";
      const shipmentProvider = await ShipmentProvider.findOne({
        name: shipmentProviderName,
      });

      if (!shipmentProvider) {
        return sendResponse(res, 400, false, "Invalid shipment provider");
      }

      let shipmentResponse;
      // if (shipmentProvider.name === "Shiprocket") {
      //   shipmentResponse = await createShiprocketShipment(
      //     order,
      //     store,
      //     customerAddress
      //   );
      // } else {
      //   shipmentResponse = await createPorterShipment(
      //     order,
      //     store,
      //     customerAddress
      //   );
      // }

      shipmentResponse = await createPorterShipment(
        order,
        store,
        customerAddress
      );

      const shipment = await Shipment.create({
        orderId: order._id,
        shipmentProviderId: shipmentProvider._id,
        trackingId: shipmentResponse?.tracking_id || shipmentProvider._id,
        currentStatus: "Created",
        pickupStoreName: store.storeName,
        pickupAddress: store.storeAddress,
        pickupAddressUrl: store.address_url,
        pickupPincode: store.pincode,
        pickupCity: store.city,
        pickupState: store.state,
        pickupLat: store.lat,
        pickupLng: store.lng,
        dropAddressType: customerAddress.type,
        dropAddressLine1: customerAddress.address_line_1,
        dropAddressLine2: customerAddress.address_line_2,
        dropAddressUrl: customerAddress.address_url,
        dropLandmark: customerAddress.landmark,
        dropPincode: customerAddress.pincode,
        dropCity: customerAddress.city,
        dropState: customerAddress.state,
        dropLat: customerAddress.location.coordinates[0],
        dropLng: customerAddress.location.coordinates[1],
        shipmentResponse: JSON.stringify(shipmentResponse?.raw),
        trackingUrl: shipmentResponse?.tracking_url || null,
      });

      await Order.findByIdAndUpdate(order._id, { orderStatus: "Processing" });

      // Notify about shipment creation
      if (customer && customer.fcmToken) {
        await sendCustomerNotification(
          customer.fcmToken,
          {
            title: "Shipment Created",
            body: `Your order #${order.orderNumber} is ready for shipment`,
            data: {
              orderId: order._id.toString(),
              shipmentId: shipment._id.toString(),
            },
          },
          customer._id
        );
      }

      if (seller && seller.fcmToken) {
        await sendSellerNotification(
          seller.fcmToken,
          {
            title: "Shipment Created",
            body: `Order #${order.orderNumber} is ready for shipment`,
            data: {
              orderId: order._id.toString(),
              shipmentId: shipment._id.toString(),
              isFullScreen: "false",
            },
          },
          seller._id
        );
      }
    }

    return sendResponse(
      res,
      200,
      true,
      `Order ${status.toLowerCase()} successfully`,
      order
    );
  } catch (error) {
    console.error("Order status update error:", error.message);
    return sendResponse(res, 500, false, "Something went wrong");
  }
};

/**
 *
 * Razorpay Order Creation (for Online Payments)
 *
 */
export const createRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return sendResponse(res, 400, false, "orderId is required");

    const order = await Order.findById(orderId);
    if (!order) return sendResponse(res, 404, false, "Order not found");
    if (order.paymentTypeId !== 2)
      return sendResponse(res, 400, false, "Not an online payment order");

    const options = {
      amount: Math.round(order?.totalAmount * 100), // Razorpay needs amount in paisa
      currency: order?.currency || "INR",
      receipt: order?.orderNumber,
      payment_capture: 1, //Auto-capture enabled
    };

    const rzpOrder = await razorpay.orders.create(options);

    const data = {
      razorpayOrderId: rzpOrder.id,
      amount: roundToTwo(options.amount),
      currency: options.currency,
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order._id,
    };
    return sendResponse(
      res,
      200,
      true,
      "Razorpay Order created successfully",
      data
    );
  } catch (error) {
    console.error("Razorpay order error:", error.message);
    return sendResponse(res, 500, false, error.message);
  }
};

/**
 *
 * Razorpay Payment Verification
 *
 */
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId, // our local DB order _id
    } = req.body;
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !orderId
    ) {
      return sendResponse(res, 400, false, "All fields are required");
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    console.log("body  ---->", body);
    // console.log(
    //   "process.env.RAZORPAY_KEY_SECRET  ---->",
    //   process.env.RAZORPAY_KEY_SECRET
    // );
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    console.log("expectedSignature", expectedSignature);
    if (expectedSignature !== razorpay_signature)
      return sendResponse(res, 400, false, "Payment verification failed");

    /**
     * Update order as paid
     */
    await Order.findByIdAndUpdate(orderId, {
      transactionId: razorpay_payment_id,
      paymentStatus: "Success",
      paymentError: "",
    });

    // Update order status to paid
    await Order.findByIdAndUpdate(orderId, { status: "paid" });

    // Send payment confirmation notifications
    const order = await Order.findById(orderId);
    if (!order) return sendResponse(res, 404, false, "Order not found");

    if (order) {
      // Notify customer
      const customer = await Customer.findById(order.customerId);
      if (customer && customer.fcmToken) {
        await sendCustomerNotification(
          customer.fcmToken,
          {
            title: "Payment Successful",
            body: `Your payment for order #${order.orderNumber} has been successful`,
            data: { orderId: order._id.toString() },
          },
          customer._id
        );
      }

      // Notify seller
      const seller = await SellerUserAuth.findById(order.sellerId);
      if (seller && seller.fcmToken) {
        await sendSellerNotification(
          seller.fcmToken,
          {
            title: "New Order Received",
            body: `You received a new order #${order.orderNumber}!`,
            data: { orderId: order._id.toString(), isFullScreen: "true" },
          },
          seller._id
        );
      }
    }
    /**
     * Clear Cart
     */
    if (order.cartId) {
      await CartProduct.deleteMany({ cartId: order.cartId });
      await Cart.findByIdAndDelete(order.cartId);
    }

    return sendResponse(res, 200, true, "Payment verified successfully");
  } catch (error) {
    console.error("Razorpay verification error:", error.message);
    return sendResponse(res, 500, false, error.message);
  }
};

/**
 *
 * Return Order
 *
 */
export const returnOrder = async (req, res) => {
  try {
    const customerId = req.id;
    const { orderId, reason, description, orderItemIds } = req.body;

    let parsedOrderItemIds;
    try {
      parsedOrderItemIds =
        typeof orderItemIds === "string"
          ? JSON.parse(orderItemIds)
          : orderItemIds;
    } catch (err) {
      return sendResponse(
        res,
        400,
        false,
        "orderItemIds must be a valid JSON array."
      );
    }

    if (!Array.isArray(parsedOrderItemIds) || parsedOrderItemIds.length === 0) {
      return sendResponse(
        res,
        400,
        false,
        "orderItemIds must be a non-empty array."
      );
    }

    if (
      !orderId ||
      !reason ||
      !Array.isArray(parsedOrderItemIds) ||
      parsedOrderItemIds.length === 0
    ) {
      return sendResponse(res, 400, false, "Missing required fields.");
    }

    const order = await Order.findById(orderId)
      .populate("storeId")
      .populate("sellerId");

    if (!order) return sendResponse(res, 400, false, "Order not found.");
    if (
      !order.storeId ||
      order.storeId.is_deleted ||
      order.storeId.isActive === false
    ) {
      return sendResponse(
        res,
        403,
        false,
        "Return request not allowed. Store is inactive or deleted."
      );
    }
    if (order.orderStatus !== "Delivered")
      return sendResponse(
        res,
        400,
        false,
        "You can only request a return after the product has been delivered."
      );
    if (order.paymentStatus !== "Success")
      return sendResponse(
        res,
        400,
        false,
        "We haven't received your payment yet. Please complete the payment to request a return."
      );

    const existingReturns = await ReturnProduct.find({
      orderItemId: { $in: parsedOrderItemIds },
    }).populate("returnId");

    const alreadyRequested = existingReturns.filter(
      (rp) =>
        rp.returnId &&
        rp.returnId.customerId.toString() === customerId.toString()
    );

    if (alreadyRequested.length > 0) {
      return sendResponse(
        res,
        409,
        false,
        "Return request already exists for one or more selected items."
      );
    }

    let primaryImageUrl = "";
    if (!req.files || !req.files["image"]) {
      return sendResponse(res, 400, false, "image is required");
    }

    // Upload primary image
    const imagePath = req.files["image"][0].path;
    const imageResult = await cloudinary.uploader.upload(imagePath, {
      folder: "uploads/returnOrder/images",
      resource_type: "image",
    });
    primaryImageUrl = imageResult.secure_url;
    fs.unlinkSync(imagePath);

    const returnRequest = await Return.create({
      orderId,
      customerId,
      storeId: order.storeId,
      sellerId: order.sellerId,
      reason,
      description,
      image: primaryImageUrl,
      status: "Return Initiated",
      refundStatus: "Pending",
    });

    order.orderStatus = "Return Initiated";
    await order.save();

    // Send return request notification to seller
    const seller = await SellerUserAuth.findById(order.sellerId);
    if (seller && seller.fcmToken) {
      await sendSellerNotification(
        seller.fcmToken,
        {
          title: "Return Request Received",
          body: `New return request for order #${orderId}`,
          data: {
            orderId: orderId.toString(),
            returnId: returnRequest._id.toString(),
            isFullScreen: "false",
          },
        },
        seller._id
      );
    }

    const customer = await Customer.findById(req.id);
    if (customer && customer.fcmToken) {
      await sendCustomerNotification(
        customer.fcmToken,
        {
          title: "Return Request Submitted",
          body: `Your return request for order #${orderId} has been submitted`,
          data: {
            orderId: orderId.toString(),
            returnId: returnRequest._id.toString(),
          },
        },
        customer._id
      );
    }

    const returnProducts = parsedOrderItemIds.map((itemId) => ({
      returnId: returnRequest._id,
      orderItemId: itemId,
    }));

    await ReturnProduct.insertMany(returnProducts);

    /**
     * Calling Reverse-Shipment Api's
     */
    const customerAddress = await CustomerAddress.findOne({
      customerId,
      is_deleted: false,
    }).sort({ createdAt: -1 });

    const shipment = await Shipment.findOne({ orderId: order._id });

    if (!shipment) {
      return sendResponse(res, 404, false, "Original shipment not found.");
    }

    if (!customerAddress) {
      return sendResponse(res, 404, false, "Customer address not found.");
    }

    await returnRequest.populate("customerId");

    const paymentTypeId = order.paymentTypeId; // 1 = COD, 2 = Online
    let pickupInfo;
    let shipmentProviderName;

    // if (paymentTypeId === 1) {
    //   // COD → Use Shiprocket
    //   pickupInfo = await createShiprocketReversePickup(order, returnRequest, customerAddress,parsedOrderItemIds);
    //   shipmentProviderName = "Shiprocket";
    // } else {
    // Online → Use Porter
    pickupInfo = await createPorterReversePickup(
      order,
      returnRequest,
      shipment
    );
    shipmentProviderName = "Porter";
    // }
    const shipmentProvider = await ShipmentProvider.findOne({
      name: shipmentProviderName,
    });

    if (!pickupInfo.success) {
      return sendResponse(
        res,
        500,
        false,
        "Reverse shipment creation failed.",
        pickupInfo.error
      );
    }

    returnRequest.status = "Pickup Initiated";
    returnRequest.shipmentProviderId = shipmentProvider._id;
    returnRequest.trackingId = pickupInfo.trackingId;
    returnRequest.pickupAddress =
      pickupInfo.pickupAddress.street_address1 || "";
    returnRequest.pickupAddressUrl =
      pickupInfo.pickupAddress?.address_url || "";
    returnRequest.pickupDate = pickupInfo.pickupDate;
    returnRequest.pickupPincode = pickupInfo.pickupAddress?.pincode;
    returnRequest.pickupCity = pickupInfo.pickupAddress?.city;
    returnRequest.pickupState = pickupInfo.pickupAddress?.state;
    returnRequest.pickupLat = pickupInfo.pickupAddress?.lat;
    returnRequest.pickupLng = pickupInfo.pickupAddress?.lng;
    returnRequest.pickupAddressType =
      pickupInfo.pickupAddress?.apartment_address;

    returnRequest.dropAddressLine1 = order.storeId?.storeAddress;
    returnRequest.dropAddressLine2 = order.storeId?.city;
    returnRequest.dropCity = order.storeId?.city;
    returnRequest.dropState = order.storeId?.state;
    returnRequest.dropPincode = order.storeId?.pincode;
    returnRequest.dropLat = order.storeId?.position?.lat;
    returnRequest.dropLng = order.storeId?.position?.lng;
    returnRequest.shipmentResponse = pickupInfo.data || "";

    await returnRequest.save();

    return sendResponse(
      res,
      201,
      true,
      "Return request created successfully.",
      {
        returnRequest,
        returnProducts,
      }
    );
  } catch (err) {
    console.error("Create Return Error:", err);
    return sendResponse(res, 500, false, "Returned failed");
  }
};

export const returnOrderOld = async (req, res) => {
  try {
    const customerId = req.id;
    const { orderId, reason, description, orderItemIds } = req.body;

    let parsedOrderItemIds;
    try {
      parsedOrderItemIds =
        typeof orderItemIds === "string"
          ? JSON.parse(orderItemIds)
          : orderItemIds;
    } catch (err) {
      return sendResponse(
        res,
        400,
        false,
        "orderItemIds must be a valid JSON array."
      );
    }

    if (!Array.isArray(parsedOrderItemIds) || parsedOrderItemIds.length === 0) {
      return sendResponse(
        res,
        400,
        false,
        "orderItemIds must be a non-empty array."
      );
    }

    if (
      !orderId ||
      !reason ||
      !Array.isArray(parsedOrderItemIds) ||
      parsedOrderItemIds.length === 0
    ) {
      return sendResponse(res, 400, false, "Missing required fields.");
    }

    const order = await Order.findById(orderId)
      .populate("storeId")
      .populate("sellerId");

    if (!order) return sendResponse(res, 400, false, "Order not found.");
    if (
      !order.storeId ||
      order.storeId.is_deleted ||
      order.storeId.isActive === false
    ) {
      return sendResponse(
        res,
        403,
        false,
        "Return request not allowed. Store is inactive or deleted."
      );
    }
    if (order.orderStatus !== "Delivered")
      return sendResponse(
        res,
        400,
        false,
        "You can only request a return after the product has been delivered."
      );
    if (order.paymentStatus !== "Success")
      return sendResponse(
        res,
        400,
        false,
        "We haven't received your payment yet. Please complete the payment to request a return."
      );

    const existingReturns = await ReturnProduct.find({
      orderItemId: { $in: parsedOrderItemIds },
    }).populate("returnId");

    const alreadyRequested = existingReturns.filter(
      (rp) =>
        rp.returnId &&
        rp.returnId.customerId.toString() === customerId.toString()
    );

    if (alreadyRequested.length > 0) {
      return sendResponse(
        res,
        409,
        false,
        "Return request already exists for one or more selected items."
      );
    }

    let primaryImageUrl = "";
    if (!req.files || !req.files["image"]) {
      return sendResponse(res, 400, false, "image is required");
    }

    // Upload primary image
    const imagePath = req.files["image"][0].path;
    const imageResult = await cloudinary.uploader.upload(imagePath, {
      folder: "uploads/returnOrder/images",
      resource_type: "image",
    });
    primaryImageUrl = imageResult.secure_url;
    fs.unlinkSync(imagePath);

    const returnRequest = await Return.create({
      orderId,
      customerId,
      storeId: order.storeId,
      sellerId: order.sellerId,
      reason,
      description,
      image: primaryImageUrl,
      status: "Return Initiated",
      refundStatus: "Pending",
    });

    order.orderStatus = "Return Initiated";
    await order.save();

    // Send return request notification to seller
    const seller = await SellerUserAuth.findById(order.sellerId);
    if (seller && seller.fcmToken) {
      await sendSellerNotification(
        seller.fcmToken,
        {
          title: "Return Request Received",
          body: `New return request for order #${orderId}`,
          data: {
            orderId: orderId.toString(),
            returnId: returnRequest._id.toString(),
            isFullScreen: "false",
          },
        },
        seller._id
      );
    }

    const customer = await Customer.findById(req.id);
    if (customer && customer.fcmToken) {
      await sendCustomerNotification(
        customer.fcmToken,
        {
          title: "Return Request Submitted",
          body: `Your return request for order #${orderId} has been submitted`,
          data: {
            orderId: orderId.toString(),
            returnId: returnRequest._id.toString(),
          },
        },
        customer._id
      );
    }

    const returnProducts = parsedOrderItemIds.map((itemId) => ({
      returnId: returnRequest._id,
      orderItemId: itemId,
    }));

    await ReturnProduct.insertMany(returnProducts);

    /**
     * Calling Reverse-Shipment Api's
     */
    const customerAddress = await CustomerAddress.findOne({
      customerId,
      is_deleted: false,
    }).sort({ createdAt: -1 });

    if (!customerAddress) {
      return sendResponse(res, 404, false, "Customer address not found.");
    }

    await returnRequest.populate("customerId");

    const paymentTypeId = order.paymentTypeId; // 1 = COD, 2 = Online
    let pickupInfo;
    let shipmentProviderName;

    // if (paymentTypeId === 1) {
    //   // COD → Use Shiprocket
    //   pickupInfo = await createShiprocketReversePickup(order, returnRequest, customerAddress,parsedOrderItemIds);
    //   shipmentProviderName = "Shiprocket";
    // } else {
    // Online → Use Porter
    pickupInfo = await createPorterReversePickup(
      order,
      returnRequest,
      customerAddress
    );
    shipmentProviderName = "Porter";
    // }
    const shipmentProvider = await ShipmentProvider.findOne({
      name: shipmentProviderName,
    });

    if (!pickupInfo.success) {
      return sendResponse(
        res,
        500,
        false,
        "Reverse shipment creation failed.",
        pickupInfo.error
      );
    }

    returnRequest.status = "Pickup Initiated";
    returnRequest.shipmentProviderId = shipmentProvider._id;
    returnRequest.trackingId = pickupInfo.trackingId;
    returnRequest.pickupAddress =
      pickupInfo.pickupAddress.street_address1 || "";
    returnRequest.pickupAddressUrl =
      pickupInfo.pickupAddress?.address_url || "";
    returnRequest.pickupDate = pickupInfo.pickupDate;
    returnRequest.pickupPincode = pickupInfo.pickupAddress?.pincode;
    returnRequest.pickupCity = pickupInfo.pickupAddress?.city;
    returnRequest.pickupState = pickupInfo.pickupAddress?.state;
    returnRequest.pickupLat = pickupInfo.pickupAddress?.lat;
    returnRequest.pickupLng = pickupInfo.pickupAddress?.lng;
    returnRequest.pickupAddressType =
      pickupInfo.pickupAddress?.apartment_address;

    returnRequest.dropAddressLine1 = order.storeId?.storeAddress;
    returnRequest.dropAddressLine2 = order.storeId?.city;
    returnRequest.dropCity = order.storeId?.city;
    returnRequest.dropState = order.storeId?.state;
    returnRequest.dropPincode = order.storeId?.pincode;
    returnRequest.dropLat = order.storeId?.position?.lat;
    returnRequest.dropLng = order.storeId?.position?.lng;
    returnRequest.shipmentResponse = pickupInfo.data || "";

    await returnRequest.save();

    return sendResponse(
      res,
      201,
      true,
      "Return request created successfully.",
      {
        returnRequest,
        returnProducts,
      }
    );
  } catch (err) {
    console.error("Create Return Error:", err);
    return sendResponse(res, 500, false, "Returned failed");
  }
};

/**
 * @param {*} req  PorterWebhook
 * @param {*} res
 * @returns
 */
export const porterWebhook = async (req, res) => {
  try {
    const payload = req.body;
    const { order_id, status, order_details } = payload;
    if (!order_id || !status) {
      return sendResponse(res, 400, false, "Missing tracking ID or status");
    }

    // First check for a normal shipment
    let shipment = await Shipment.findOne({ trackingId: order_id });
    let returnRequest = null;
    let order = null;
    let isReturn = false;

    // If not found, check in returns
    if (!shipment) {
      returnRequest = await Return.findOne({ trackingId: order_id }).populate(
        "orderId"
      );
      if (!returnRequest) {
        return sendResponse(res, 404, false, "Shipment or Return not found");
      }
      isReturn = true;
      order = returnRequest.orderId;
    } else {
      order = await Order.findById(shipment.orderId);
      if (!order) return sendResponse(res, 404, false, "Order not found");
    }

    const seller = await SellerUserAuth.findById(order.sellerId);
    const customer = await Customer.findById(order.customerId);

    const target = isReturn ? returnRequest : shipment;

    if (status === "order_accepted") {
      const driver = order_details?.driver_details || {};
      const location = order_details?.partner_location || {};
      Object.assign(target, {
        partner_name: driver.driver_name,
        partner_vehicle_number: driver.vehicle_number,
        partner_mobile: driver.mobile,
        partner_lat: location.lat?.toString() || "",
        partner_lng: location.long?.toString() || "",
        currentStatus: "Accepted",
      });
      await target.save();

      const historyData = {
        currentStatus: "Accepted",
        partner_lat: location.lat?.toString() || "",
        partner_lng: location.long?.toString() || "",
        location:
          location.lat && location.long
            ? `${location.lat},${location.long}`
            : "",
        description: `Partner assigned: ${driver.driver_name}, Vehicle: ${driver.vehicle_number}, Mobile: ${driver.mobile}`,
      };

      if (isReturn) {
        await ReturnShipmentHistory.create({
          returnId: returnRequest._id,
          ...historyData,
        });
        returnRequest.status = "Partner Assigned";
        await returnRequest.save();
      } else {
        await ShipmentHistory.create({
          shipmentId: shipment._id,
          ...historyData,
        });
        order.orderStatus = "Partner Assigned";
        await order.save();

        if (seller?.fcmToken) {
          await sendSellerNotification(
            seller.fcmToken,
            {
              title: "Pickup Partner Assigned",
              body: `Order #${order.orderNumber} is ready for pickup by ${driver.driver_name}`,
              data: {
                orderId: order._id.toString(),
                shipmentId: shipment._id.toString(),
                status: "Partner Assigned",
                isFullScreen: "false",
              },
            },
            seller._id
          );
        }

        if (customer?.fcmToken) {
          await sendCustomerNotification(
            customer.fcmToken,
            {
              title: "Pickup Partner Assigned",
              body: `A delivery partner is assigned order #${order.orderNumber}`,
              data: {
                orderId: order._id.toString(),
                shipmentId: shipment._id.toString(),
                status: "Partner Assigned",
              },
            },
            customer._id
          );
        }
      }
    } else if (status === "order_start_trip") {
      const location = order_details?.partner_location || {};
      const estimatedFare = order_details?.estimated_trip_fare;

      target.currentStatus = "Trip Started";
      await target.save();

      const historyData = {
        currentStatus: "Trip Started",
        partner_lat: location.lat?.toString() || "",
        partner_lng: location.long?.toString() || "",
        location:
          location.lat && location.long
            ? `${location.lat},${location.long}`
            : "",
        description: `Trip started${
          estimatedFare ? ` | Estimated Fare: ₹${estimatedFare}` : ""
        }`,
      };

      if (isReturn) {
        await ReturnShipmentHistory.create({
          returnId: returnRequest._id,
          ...historyData,
        });
        returnRequest.status = "Out For Pickup";
        await returnRequest.save();
      } else {
        await ShipmentHistory.create({
          shipmentId: shipment._id,
          ...historyData,
        });
        order.orderStatus = "Out For Delivery";
        await order.save();

        if (seller?.fcmToken) {
          await sendSellerNotification(
            seller.fcmToken,
            {
              title: "Pickup Partner En Route",
              body: `Delivery partner is on the way for order #${order.orderNumber}`,
              data: {
                orderId: order._id.toString(),
                shipmentId: shipment._id.toString(),
                status: "Out For Delivery",
                isFullScreen: "false",
              },
            },
            seller._id
          );
        }

        if (customer?.fcmToken) {
          await sendCustomerNotification(
            customer.fcmToken,
            {
              title: "Pickup Partner On The Way",
              body: `Your delivery partner is on the way with your order #${order.orderNumber}`,
              data: {
                orderId: order._id.toString(),
                shipmentId: shipment._id.toString(),
                status: "Out For Delivery",
              },
            },
            customer._id
          );
        }
      }
    } else if (status === "order_end_job") {
      target.currentStatus = "Delivered";
      target.deliveryFee = order_details?.actual_trip_fare;
      await target.save();

      const historyData = {
        currentStatus: "Delivered",
        description: `Trip completed. Actual fare: ₹${
          order_details?.actual_trip_fare || "N/A"
        }`,
      };

      if (isReturn) {
        await ReturnShipmentHistory.create({
          returnId: returnRequest._id,
          ...historyData,
        });
        returnRequest.status = "Return Completed";
        order.orderStatus = "Return Completed";
        await order.save();
        await returnRequest.save();
      } else {
        await ShipmentHistory.create({
          shipmentId: shipment._id,
          ...historyData,
        });
        order.orderStatus = "Delivered";
        await order.save();

        if (seller?.fcmToken) {
          await sendSellerNotification(
            seller.fcmToken,
            {
              title: "Order Delivered",
              body: `Order #${order.orderNumber} has been delivered successfully.`,
              data: {
                orderId: order._id.toString(),
                shipmentId: shipment._id.toString(),
                status: "Delivered",
                isFullScreen: "false",
              },
            },
            seller._id
          );
        }

        if (customer?.fcmToken) {
          await sendCustomerNotification(
            customer.fcmToken,
            {
              title: "Order Delivered",
              body: `Your order #${order.orderNumber} has been delivered successfully.`,
              data: {
                orderId: order._id.toString(),
                shipmentId: shipment._id.toString(),
                status: "Delivered",
              },
            },
            customer._id
          );
        }
      }
    } else if (status === "order_reopen") {
      Object.assign(target, {
        partner_name: null,
        partner_vehicle_number: null,
        partner_mobile: null,
        partner_lat: null,
        partner_lng: null,
        deliveryFee: null,
      });
      await target.save();

      const historyData = {
        currentStatus: "Reopened",
        partner_lat: null,
        partner_lng: null,
        location: "",
        description: "Driver cancelled. Attempting to assign new partner.",
      };

      if (isReturn) {
        await ReturnShipmentHistory.create({
          returnId: returnRequest._id,
          ...historyData,
        });
        returnRequest.status = "Reopened";
        await returnRequest.save();
      } else {
        await ShipmentHistory.create({
          shipmentId: shipment._id,
          ...historyData,
        });
        order.orderStatus = "Reopened";
        await order.save();

        if (seller?.fcmToken) {
          await sendSellerNotification(
            seller.fcmToken,
            {
              title: "Delivery Partner Reassignment",
              body: `Delivery partner for order #${order.orderNumber} cancelled. Reassigning a new one.`,
              data: {
                orderId: order._id.toString(),
                shipmentId: shipment._id.toString(),
                status: "Reopened",
                isFullScreen: "false",
              },
            },
            seller._id
          );
        }
      }
    } else if (status === "order_cancel") {
      target.currentStatus = "Partner Cancelled";
      await target.save();

      const historyData = {
        currentStatus: "Partner Cancelled",
        partner_lat: null,
        partner_lng: null,
        location: "",
        description: "Order has been cancelled by delivery partner.",
      };

      if (isReturn) {
        await ReturnShipmentHistory.create({
          returnId: returnRequest._id,
          ...historyData,
        });
        returnRequest.status = "Partner Cancelled";
        await returnRequest.save();
      } else {
        await ShipmentHistory.create({
          shipmentId: shipment._id,
          ...historyData,
        });
        order.orderStatus = "Partner Cancelled";
        await order.save();

        if (seller?.fcmToken) {
          await sendSellerNotification(
            seller.fcmToken,
            {
              title: "Order Cancelled by delivery partner",
              body: `Order #${order.orderNumber} has been cancelled by delivery partner.`,
              data: {
                orderId: order._id.toString(),
                shipmentId: shipment._id.toString(),
                status: "Partner Cancelled",
                isFullScreen: "false",
              },
            },
            seller._id
          );
        }

        if (customer?.fcmToken) {
          await sendCustomerNotification(
            customer.fcmToken,
            {
              title: "Order Cancelled",
              body: `Your order #${order.orderNumber} has been cancelled.`,
              data: {
                orderId: order._id.toString(),
                status: "Partner Cancelled",
              },
            },
            customer._id
          );
        }
      }
    }

    return sendResponse(res, 200, true, "Porter Webhook Success");
  } catch (err) {
    console.error("Porter Webhook Error:", err);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

export const porterWebhookNotification = async (req, res) => {
  try {
    const payload = req.body;
    const { order_id, status, order_details } = payload;
    if (!order_id || !status) {
      return sendResponse(res, 400, false, "Missing tracking ID or status");
    }

    // First check for a normal shipment
    let shipment = await Shipment.findOne({ trackingId: order_id });
    let returnRequest = null;
    let order = null;
    let isReturn = false;

    // If not found, check in returns
    if (!shipment) {
      returnRequest = await Return.findOne({ trackingId: order_id }).populate(
        "orderId"
      );
      if (!returnRequest) {
        return sendResponse(res, 404, false, "Shipment or Return not found");
      }
      isReturn = true;
      order = returnRequest.orderId;
    } else {
      order = await Order.findById(shipment.orderId);
      if (!order) return sendResponse(res, 404, false, "Order not found");
    }

    const seller = await SellerUserAuth.findById(order.sellerId);
    const customer = await Customer.findById(order.customerId);

    const target = isReturn ? returnRequest : shipment;

    if (status === "order_accepted") {
      const driver = order_details?.driver_details || {};
      const location = order_details?.partner_location || {};
      Object.assign(target, {
        partner_name: driver.driver_name,
        partner_vehicle_number: driver.vehicle_number,
        partner_mobile: driver.mobile,
        partner_lat: location.lat?.toString() || "",
        partner_lng: location.long?.toString() || "",
        currentStatus: "Accepted",
      });
      await target.save();

      const historyData = {
        currentStatus: "Accepted",
        partner_lat: location.lat?.toString() || "",
        partner_lng: location.long?.toString() || "",
        location:
          location.lat && location.long
            ? `${location.lat},${location.long}`
            : "",
        description: `Partner assigned: ${driver.driver_name}, Vehicle: ${driver.vehicle_number}, Mobile: ${driver.mobile}`,
      };

      if (isReturn) {
        await ReturnShipmentHistory.create({
          returnId: returnRequest._id,
          ...historyData,
        });
        returnRequest.status = "Partner Assigned";
        await returnRequest.save();
      } else {
        await ShipmentHistory.create({
          shipmentId: shipment._id,
          ...historyData,
        });
        order.orderStatus = "Partner Assigned";
        await order.save();
      }

      await sendNotifications({
        isReturn,
        status,
        order,
        shipment,
        returnRequest,
        seller,
        customer,
      });
    } else if (status === "order_start_trip") {
      const location = order_details?.partner_location || {};
      const estimatedFare = order_details?.estimated_trip_fare;

      target.currentStatus = "Trip Started";
      await target.save();

      const historyData = {
        currentStatus: "Trip Started",
        partner_lat: location.lat?.toString() || "",
        partner_lng: location.long?.toString() || "",
        location:
          location.lat && location.long
            ? `${location.lat},${location.long}`
            : "",
        description: `Trip started${
          estimatedFare ? ` | Estimated Fare: ₹${estimatedFare}` : ""
        }`,
      };

      if (isReturn) {
        await ReturnShipmentHistory.create({
          returnId: returnRequest._id,
          ...historyData,
        });
        returnRequest.status = "Out For Pickup";
        await returnRequest.save();
      } else {
        await ShipmentHistory.create({
          shipmentId: shipment._id,
          ...historyData,
        });
        order.orderStatus = "Out For Delivery";
        await order.save();
      }

      await sendNotifications({
        isReturn,
        status,
        order,
        shipment,
        returnRequest,
        seller,
        customer,
      });
    } else if (status === "order_end_job") {
      target.currentStatus = "Delivered";
      target.deliveryFee = order_details?.actual_trip_fare;
      await target.save();

      const historyData = {
        currentStatus: "Delivered",
        description: `Trip completed. Actual fare: ₹${
          order_details?.actual_trip_fare || "N/A"
        }`,
      };

      if (isReturn) {
        await ReturnShipmentHistory.create({
          returnId: returnRequest._id,
          ...historyData,
        });
        returnRequest.status = "Return Completed";
        order.orderStatus = "Return Completed";
        await order.save();
        await returnRequest.save();
      } else {
        await ShipmentHistory.create({
          shipmentId: shipment._id,
          ...historyData,
        });
        order.orderStatus = "Delivered";
        await order.save();
      }

      await sendNotifications({
        isReturn,
        status,
        order,
        shipment,
        returnRequest,
        seller,
        customer,
      });
    } else if (status === "order_reopen") {
      Object.assign(target, {
        partner_name: null,
        partner_vehicle_number: null,
        partner_mobile: null,
        partner_lat: null,
        partner_lng: null,
        deliveryFee: null,
      });
      await target.save();

      const historyData = {
        currentStatus: "Reopened",
        partner_lat: null,
        partner_lng: null,
        location: "",
        description: "Driver cancelled. Attempting to assign new partner.",
      };

      if (isReturn) {
        await ReturnShipmentHistory.create({
          returnId: returnRequest._id,
          ...historyData,
        });
        returnRequest.status = "Reopened";
        await returnRequest.save();
      } else {
        await ShipmentHistory.create({
          shipmentId: shipment._id,
          ...historyData,
        });
        order.orderStatus = "Reopened";
        await order.save();
      }

      await sendNotifications({
        isReturn,
        status,
        order,
        shipment,
        returnRequest,
        seller,
        customer,
      });
    } else if (status === "order_cancel") {
      target.currentStatus = "Partner Cancelled";
      await target.save();

      const historyData = {
        currentStatus: "Partner Cancelled",
        partner_lat: null,
        partner_lng: null,
        location: "",
        description: "Order has been cancelled by delivery partner.",
      };

      if (isReturn) {
        await ReturnShipmentHistory.create({
          returnId: returnRequest._id,
          ...historyData,
        });
        returnRequest.status = "Partner Cancelled";
        await returnRequest.save();
      } else {
        await ShipmentHistory.create({
          shipmentId: shipment._id,
          ...historyData,
        });
        order.orderStatus = "Partner Cancelled";
        await order.save();
      }

      await sendNotifications({
        isReturn,
        status,
        order,
        shipment,
        returnRequest,
        seller,
        customer,
      });
    }

    return sendResponse(res, 200, true, "Porter Webhook Success");
  } catch (err) {
    console.error("Porter Webhook Error:", err);
    return sendResponse(res, 500, false, "Internal server error");
  }
};
/**
 * @param {*} req
 * @param {*} res Shiprocketwebhook
 * @returns
 */
export const shiprocketWebhookHandler = async (req, res) => {
  try {
    const { current_status, shipment_id } = req.body;

    console.log("Shiprocket Webhook:", shipment_id, current_status);

    if (!shipment_id || !current_status) {
      return sendResponse(res, 400, false, "Invalid payload");
    }

    const returnRequest = await Return.findOne({ trackingId: shipment_id });

    if (!returnRequest) {
      return sendResponse(res, 404, false, "Return request not found");
    }

    if (current_status === "Pickup Completed") {
      returnRequest.status = "Picked Up";
      await returnRequest.save();
      console.log("Return marked as Picked Up");
    }

    return sendResponse(res, 200, true, "Webhook processed");
  } catch (err) {
    console.error("Shiprocket Webhook Error:", err.message);
    return sendResponse(res, 500, false, "Internal Server Error");
  }
};

/**
 *
 * @param {Refund} req
 * @param {*} res
 * @returns
 */
export const processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { refundReason } = req.body;

    const returnDoc = await Return.findById(id).populate("orderId");
    if (!returnDoc) return sendResponse(res, 404, false, "Return not found");

    const order = await Order.findById(returnDoc.orderId);
    if (!order || order.paymentStatus !== "Success") {
      return sendResponse(
        res,
        400,
        false,
        "Refund not allowed. Order not paid."
      );
    }
    if (returnDoc.refundStatus === "Completed") {
      return sendResponse(
        res,
        400,
        false,
        "Refund already completed for this return."
      );
    }
    if (returnDoc.status !== "Picked Up") {
      return sendResponse(
        res,
        400,
        false,
        "Return must be in 'Picked Up' status before refund"
      );
    }

    const returnProducts = await ReturnProduct.find({ returnId: id });

    const orderItemIds = returnProducts.map((rp) => rp.orderItemId);
    const orderItems = await OrderItem.find({ _id: { $in: orderItemIds } });

    if (!orderItems)
      return sendResponse(res, 400, false, "OrderItems not found");
    const refundAmount = orderItems.reduce(
      (total, item) => total + item.totalAmount,
      0
    );

    returnDoc.refundStatus = "Processing";
    await returnDoc.save();

    let refundData = null;
    let refundStatus = "completed";
    let refundResponse = "";

    console.log("returnDoc", returnDoc);
    if (order.paymentTypeId === 2) {
      refundData = await rezerpayRefundPayment(
        returnDoc.orderId.transactionId,
        refundAmount
      );
      refundStatus = refundData.status;
      refundResponse = JSON.stringify(refundData);
    } else if (order.paymentTypeId === 1) {
      refundData = {
        method: "COD",
        info: "Manual refund via Wallet or UPI",
      };
      refundResponse = JSON.stringify(refundData);
    } else {
      return sendResponse(res, 400, false, "Invalid refund method");
    }

    const refund = await Refund.create({
      orderId: returnDoc.orderId._id,
      refundId: refundData.razorpayRefundId || `cod-${Date.now()}`,
      refundAmount: roundToTwo(refundAmount),
      refundReason,
      refundStatus,
      refundResponse,
    });

    // Send refund initiated notification
    if (order) {
      // Notify customer
      const customer = await Customer.findById(order.customerId);
      if (customer && customer.fcmToken) {
        await sendCustomerNotification(
          customer.fcmToken,
          {
            title: "Refund Initiated",
            body: `Refund of ₹${roundToTwo(
              refundAmount
            )} has been initiated for order #${order.orderNumber}`,
            data: {
              orderId: order._id.toString(),
              refundId: refund._id.toString(),
            },
          },
          customer._id
        );
      }

      // Notify seller
      const seller = await SellerUserAuth.findById(order.sellerId);
      if (seller && seller.fcmToken) {
        await sendSellerNotification(
          seller.fcmToken,
          {
            title: "Refund Initiated",
            body: `Refund of ₹${roundToTwo(
              refundAmount
            )} has been initiated for order #${order.orderNumber}`,
            data: {
              orderId: order._id.toString(),
              refundId: refund._id.toString(),
              isFullScreen: "false",
            },
          },
          seller._id
        );
      }
    }

    returnDoc.status = "Completed";
    returnDoc.refundStatus = "Completed";
    returnDoc.refundId = refund._id;

    await returnDoc.save();

    // Send refund completed notification
    if (order) {
      // Notify customer
      const customer = await Customer.findById(order.customerId);
      if (customer && customer.fcmToken) {
        await sendCustomerNotification(
          customer.fcmToken,
          {
            title: "Refund Completed",
            body: `Refund of ₹${roundToTwo(
              refundAmount
            )} has been successfully processed for order #${order.orderNumber}`,
            data: {
              orderId: order._id.toString(),
              refundId: refund._id.toString(),
            },
          },
          customer._id
        );
      }

      // Notify seller
      const seller = await SellerUserAuth.findById(order.sellerId);
      if (seller && seller.fcmToken) {
        await sendSellerNotification(
          seller.fcmToken,
          {
            title: "Refund Completed",
            body: `Refund of ₹${roundToTwo(
              refundAmount
            )} has been successfully processed for order #${order.orderNumber}`,
            data: {
              orderId: order._id.toString(),
              refundId: refund._id.toString(),
              isFullScreen: "false",
            },
          },
          seller._id
        );
      }
    }

    await OrderItem.findByIdAndUpdate(orderItemIds, {
      isRefunded: true,
      refundStatus: "Success",
    });

    return sendResponse(res, 200, true, "Refund processed successfully", {
      return: returnDoc,
      refund,
    });
  } catch (err) {
    console.error(err);
    return sendResponse(res, 500, false, "Refund processing failed", err);
  }
};

/**
 *
 * @param {Exchange} req
 * @param {*} res
 * @returns
 */
export const exchangeProduct = async (req, res) => {
  try {
    const customerId = req.id;
    const { orderId, orderItemIds, newSizeIds, reason, description } = req.body;

    let parsedOrderItemIds;
    let parsedNewSizeIds;
    try {
      parsedOrderItemIds =
        typeof orderItemIds === "string"
          ? JSON.parse(orderItemIds)
          : orderItemIds;
      parsedNewSizeIds =
        typeof newSizeIds === "string" ? JSON.parse(newSizeIds) : newSizeIds;
    } catch (err) {
      return sendResponse(
        res,
        400,
        false,
        "orderItemIds & parsedNewSizeIds must be a valid JSON array."
      );
    }

    if (!Array.isArray(parsedOrderItemIds) || parsedOrderItemIds.length === 0) {
      return sendResponse(
        res,
        400,
        false,
        "orderItemIds must be a non-empty array."
      );
    }

    if (!Array.isArray(parsedNewSizeIds) || parsedNewSizeIds.length === 0) {
      return sendResponse(
        res,
        400,
        false,
        "sizeId's must be a non-empty array."
      );
    }

    if (!orderId || !parsedOrderItemIds || !parsedNewSizeIds || !reason) {
      return sendResponse(
        res,
        400,
        false,
        "All required fields must be filled"
      );
    }

    const order = await Order.findById(orderId);
    if (!order) return sendResponse(res, 404, false, "Order not found");

    if (order.paymentStatus !== "Success") {
      return sendResponse(res, 400, false, "Cannot exchange unpaid order");
    }

    if (order.orderStatus !== "Delivered") {
      return sendResponse(res, 400, false, "Your order is not delivered yet");
    }

    let primaryImageUrl = null;
    if (req.files && req.files["image"]) {
      const imagePath = req.files["image"][0].path;
      const imageResult = await cloudinary.uploader.upload(imagePath, {
        folder: "uploads/exchangeOrder/images",
        resource_type: "image",
      });
      primaryImageUrl = imageResult.secure_url;
      fs.unlinkSync(imagePath);
    }

    // Fetch all valid size entries
    const productSizes = await ProductSize.find({
      _id: { $in: parsedNewSizeIds },
      quantity: { $gt: 0 },
      isDeleted: false,
    });

    // If size check fails
    if (productSizes.length !== parsedNewSizeIds.length) {
      return sendResponse(
        res,
        400,
        false,
        "One or more selected sizes are out of stock or invalid."
      );
    }

    const exchangeDoc = await Exchange.create({
      orderId,
      customerId,
      storeId: order.storeId,
      sellerId: order.sellerId,
      reason,
      description,
      image: primaryImageUrl,
    });

    const exchangeProducts = parsedOrderItemIds.map((orderItemId, i) => ({
      exchangeId: exchangeDoc._id,
      orderItemId,
      newSizeId: parsedNewSizeIds[i],
    }));
    await ExchangeProduct.insertMany(exchangeProducts);

    const customerAddress = await CustomerAddress.findById(
      order.customerAddressId
    );
    if (!customerAddress)
      return sendResponse(res, 404, false, "Customer address not found");

    let pickupInfo, shipmentProviderName;
    if (order.paymentTypeId === 1) {
      pickupInfo = await createShiprocketReversePickup(
        order,
        exchangeDoc,
        customerAddress,
        orderItemIds
      );
      shipmentProviderName = "Shiprocket";
    } else {
      pickupInfo = await createPorterReversePickup(
        order,
        exchangeDoc,
        customerAddress
      );
      shipmentProviderName = "Porter";
    }

    const shipmentProvider = await ShipmentProvider.findOne({
      name: shipmentProviderName,
    });
    exchangeDoc.shipmentProviderId = shipmentProvider?._id || null;
    exchangeDoc.trackingId = pickupInfo?.trackingId || null;
    exchangeDoc.pickupDate = pickupInfo?.pickup_scheduled_date || null;
    exchangeDoc.pickupAddress = `${customerAddress?.address_line_1}, ${customerAddress.city}`;
    exchangeDoc.status = "Pickup Initiated";
    exchangeDoc.response = JSON.stringify(pickupInfo);
    await exchangeDoc.save();

    return sendResponse(
      res,
      200,
      true,
      "Exchange initiated successfully",
      exchangeDoc
    );
  } catch (error) {
    console.error(error);
    return sendResponse(res, 500, false, error.message);
  }
};

/**
 *
 * @param {*updateExchangeStatus} req
 * @param {*} res
 * @returns
 */
export const updateExchangeStatus = async (req, res) => {
  try {
    const { trackingId } = req.body;

    if (!trackingId)
      return sendResponse(res, 400, false, "Tracking ID is required");

    const exchange = await Exchange.findOne({ trackingId });

    if (!exchange)
      return sendResponse(
        res,
        404,
        false,
        "Exchange not found with this tracking ID"
      );

    if (exchange.status === "Picked Up") {
      return sendResponse(
        res,
        400,
        false,
        "Exchange is already marked as Picked Up"
      );
    }

    const exchangeProducts = await ExchangeProduct.find({
      exchangeId: exchange._id,
    });

    // Loop over each exchanged product and update new size stock
    for (const item of exchangeProducts) {
      const productSize = await ProductSize.findById(item.newSizeId);

      if (!productSize) {
        return sendResponse(
          res,
          404,
          false,
          `Size not found for item ${item._id}`
        );
      }

      if (productSize.quantity <= 0) {
        return sendResponse(
          res,
          400,
          false,
          `Size '${productSize.size}' is out of stock`
        );
      }

      productSize.quantity -= 1;
      await productSize.save();
    }

    exchange.status = "Picked Up";
    await exchange.save();

    return sendResponse(
      res,
      200,
      true,
      "Exchange status updated and size stock adjusted",
      exchange
    );
  } catch (error) {
    console.error("Error updating exchange status:", error);
    return sendResponse(res, 500, false, "Failed to update exchange status");
  }
};

/**
 *
 * @param {Exchange webhook} req
 * @param {*} res
 * @returns
 */
export const handleExchangeWebhook = async (req, res) => {
  try {
    const payload = req.body;

    let trackingId;

    // Detect webhook type
    if (payload.shipment_id && payload.status === "Pickup Completed") {
      // Shiprocket webhook
      trackingId = payload.shipment_id;
    } else if (
      payload.data?.tracking_id &&
      payload.data?.status === "pickup_completed"
    ) {
      // Porter webhook
      trackingId = payload.data.tracking_id;
    } else {
      return sendResponse(res, 400, false, "Invalid or unhandled webhook");
    }

    // Call exchange status update
    req.body.trackingId = trackingId;
    await updateExchangeStatus(req, res); // handles response itself
  } catch (err) {
    console.error("Webhook error:", err);
    return sendResponse(res, 500, false, err.message);
  }
};

/**
 *
 * List Return Order (Seller-Side)
 *
 */
export const getSellerReturnRequests = async (req, res) => {
  try {
    const sellerId = req.id;
    const { status, page, limit } = req.query;

    if (!sellerId) {
      return sendResponse(res, 400, false, "Seller ID is required");
    }

    // Step 1: Get all orders of this seller
    const orders = await Order.find({ sellerId }).select("_id");
    const orderIds = orders.map((o) => o._id);

    // Step 2: Build filter
    const filter = {
      orderId: { $in: orderIds },
    };
    if (status) filter.status = status;

    // Step 3: Total count
    const total = await Return.countDocuments(filter);

    // Step 4: Set default pagination values
    const currentPage = Number(page) || 1;
    const perPage = Number(limit) || total || 1; // fallback to total if 0
    const totalPages = Math.ceil(total / perPage);
    const skip = (currentPage - 1) * perPage;

    // Step 5: Query with pagination
    const returns = await Return.find(filter)
      .populate("customerId", "name email")
      .populate("orderId", "orderNumber orderStatus paymentStatus")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage);

    return sendResponse(res, 200, true, "Returns fetched successfully", {
      returns,
      pagination: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages,
      },
    });
  } catch (err) {
    console.error("Error fetching return requests:", err);
    return sendResponse(res, 500, false, "Failed to fetch return requests");
  }
};

/**
 *
 * List Return Order (Customer-Side)
 *
 */
export const getCustomerReturnRequests = async (req, res) => {
  try {
    const customerId = req.id;
    const { status, page, limit } = req.query;

    if (!customerId) {
      return sendResponse(res, 400, false, "Customer ID is required");
    }

    // Step 1: Get all orders of this seller
    const orders = await Order.find({ customerId }).select("_id");
    const orderIds = orders.map((o) => o._id);

    // Step 2: Build filter
    const filter = {
      orderId: { $in: orderIds },
    };
    if (status) filter.status = status;

    // Step 3: Total count
    const total = await Return.countDocuments(filter);

    // Step 4: Set default pagination values
    const currentPage = Number(page) || 1;
    const perPage = Number(limit) || total || 1; // fallback to total if 0
    const totalPages = Math.ceil(total / perPage);
    const skip = (currentPage - 1) * perPage;

    // Step 5: Query with pagination
    const returns = await Return.find(filter)
      // .populate("customerId", "name email")
      .populate("orderId", "orderNumber orderStatus paymentStatus")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage);

    return sendResponse(res, 200, true, "Returns fetched successfully", {
      returns,
      pagination: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages,
      },
    });
  } catch (err) {
    console.error("Error fetching return requests:", err);
    return sendResponse(res, 500, false, "Failed to fetch return requests");
  }
};

/**
 *
 * List Exchange Order (Customer-Side)
 *
 */
export const getCustomerExchanges = async (req, res) => {
  try {
    const customerId = req.id;

    const exchanges = await Exchange.find({ customerId })
      .sort({ createdAt: -1 })
      .lean();

    const result = [];

    for (const ex of exchanges) {
      const exchangeProducts = await ExchangeProduct.find({
        exchangeId: ex._id,
      }).lean();

      const products = [];

      for (const item of exchangeProducts) {
        const orderItem = await OrderItem.findById(item.orderItemId).lean();
        if (!orderItem) continue;

        const product = await Product.findById(orderItem.productId).lean();
        if (!product) continue;

        const oldSizeDoc = await ProductSize.findById(
          orderItem.productSizeId
        ).lean();
        const newSizeDoc = await ProductSize.findById(item.newSizeId).lean();

        products.push({
          productName: product.productName,
          oldSize: oldSizeDoc?.size || "",
          newSize: newSizeDoc?.size || "",
        });
      }

      result.push({
        _id: ex._id,
        status: ex.status,
        reason: ex.reason,
        description: ex.description,
        image: ex.image,
        trackingId: ex.trackingId,
        pickupDate: ex.pickupDate,
        pickupAddress: ex.pickupAddress,
        createdAt: ex.createdAt,
        products,
      });
    }

    return sendResponse(res, 200, true, "Customer exchange list", result);
  } catch (error) {
    console.error(error);
    return sendResponse(res, 500, false, error.message);
  }
};

/**
 *
 * List Exchange Order (Seller-Side)
 *
 */
export const getSellerExchanges = async (req, res) => {
  try {
    const sellerId = req.id;
    const { page, limit } = req.query;

    const total = await Exchange.countDocuments({ sellerId });

    const currentPage = Number(page) || 1;
    const perPage = Number(limit) || total || 1; // fallback to total if 0
    const totalPages = Math.ceil(total / perPage);
    const skip = (currentPage - 1) * perPage;

    const exchanges = await Exchange.find({ sellerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean();

    const result = [];

    for (const ex of exchanges) {
      const exchangeProducts = await ExchangeProduct.find({
        exchangeId: ex._id,
      }).lean();

      const products = [];

      for (const item of exchangeProducts) {
        const orderItem = await OrderItem.findById(item.orderItemId).lean();
        if (!orderItem) continue;

        const product = await Product.findById(orderItem.productId).lean();
        if (!product) continue;

        const oldSizeDoc = await ProductSize.findById(
          orderItem.productSizeId
        ).lean();
        const newSizeDoc = await ProductSize.findById(item.newSizeId).lean();

        products.push({
          productName: product.productName,
          oldSize: oldSizeDoc?.size || "",
          newSize: newSizeDoc?.size || "",
        });
      }

      result.push({
        _id: ex._id,
        status: ex.status,
        reason: ex.reason,
        description: ex.description,
        image: ex.image,
        trackingId: ex.trackingId,
        pickupDate: ex.pickupDate,
        pickupAddress: ex.pickupAddress,
        createdAt: ex.createdAt,
        products,
      });
    }

    return sendResponse(res, 200, true, "Seller exchange list", {
      result,
      pagination: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages,
      },
    });
  } catch (error) {
    console.error(error);
    return sendResponse(res, 500, false, error.message);
  }
};
/**
 *
 * Accept-Reject Return Order (Seller-Side)
 *
 */
export const retunActionPerform = async (req, res) => {
  try {
    const sellerId = req.id;
    const { id } = req.params;
    const { action, response } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return sendResponse(
        res,
        400,
        false,
        "Invalid action. Use 'approve' or 'reject'."
      );
    }

    const returnRequest = await Return.findById(id).populate("customerId");

    if (!returnRequest) {
      return sendResponse(res, 404, false, "Return request not found.");
    }

    if (returnRequest.sellerId.toString() !== sellerId.toString()) {
      return sendResponse(
        res,
        403,
        false,
        "You are not authorized to perform this action."
      );
    }

    if (returnRequest.status !== "Requested") {
      return sendResponse(
        res,
        400,
        false,
        `Return request is already ${returnRequest.status}.`
      );
    }

    if (action === "reject") {
      returnRequest.status = "Rejected";
      returnRequest.response = response || "No reason provided";
      await returnRequest.save();
      return sendResponse(
        res,
        200,
        true,
        "Return request rejected successfully.",
        returnRequest
      );
    }

    returnRequest.status = "Approved";
    await returnRequest.save();

    const customerAddress = await CustomerAddress.findOne({
      customerId: returnRequest.customerId._id,
      is_deleted: false,
    }).sort({ createdAt: -1 });

    if (!customerAddress) {
      return sendResponse(res, 404, false, "Customer address not found.");
    }

    const order = await Order.findById(returnRequest.orderId)
      .populate("storeId")
      .populate("sellerId");
    if (!order) {
      return sendResponse(res, 404, false, "Order not found.");
    }
    const paymentTypeId = order.paymentTypeId; // 1 = COD, 2 = Online
    let pickupInfo;
    let shipmentProviderName;
    if (paymentTypeId === 1) {
      // COD → Use Shiprocket
      pickupInfo = await createShiprocketReversePickup(
        order,
        returnRequest,
        customerAddress
      );
      shipmentProviderName = "Shiprocket";
    } else {
      // Online → Use Porter
      pickupInfo = await createPorterReversePickup(
        order,
        returnRequest,
        customerAddress
      );
      shipmentProviderName = "Porter";
    }

    const shipmentProvider = await ShipmentProvider.findOne({
      name: shipmentProviderName,
    });
    if (!pickupInfo.success) {
      return sendResponse(
        res,
        500,
        false,
        "Reverse shipment creation failed.",
        pickupInfo.error
      );
    }

    returnRequest.status = "Pickup Initiated";
    returnRequest.shipmentProviderId = shipmentProvider._id;
    returnRequest.trackingId = pickupInfo.trackingId;
    returnRequest.pickupAddress = pickupInfo.pickupAddress;
    returnRequest.pickupDate = pickupInfo.pickupDate;

    await returnRequest.save();

    // Send pickup initiated notifications
    if (order) {
      // Notify customer
      const customer = await Customer.findById(order.customerId);
      if (customer && customer.fcmToken) {
        await sendCustomerNotification(
          customer.fcmToken,
          {
            title: "Return Pickup Initiated",
            body: `Your return pickup for order #${order.orderNumber} has been initiated`,
            data: {
              orderId: order._id.toString(),
              returnId: returnRequest._id.toString(),
            },
          },
          customer._id
        );
      }

      // Notify seller
      const seller = await SellerUserAuth.findById(order.sellerId);
      if (seller && seller.fcmToken) {
        await sendSellerNotification(
          seller.fcmToken,
          {
            title: "Return Pickup Initiated",
            body: `Return pickup for order #${order.orderNumber} has been initiated`,
            data: {
              orderId: order._id.toString(),
              returnId: returnRequest._id.toString(),
              isFullScreen: "false",
            },
          },
          seller._id
        );
      }
    }

    return sendResponse(
      res,
      200,
      true,
      `Return request approved and pickup initiated.`,
      returnRequest
    );
  } catch (err) {
    console.error("Error in handleReturnAction:", err);
    return sendResponse(res, 500, false, "Failed to perform return action.");
  }
};

/**
 *
 * Create Shipment
 *
 */
export const createShipment = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return sendResponse(res, 400, false, "Order Id is required");

    const order = await Order.findById(orderId);
    if (!order) return sendResponse(res, 404, false, "Order not found");

    const store = await StoreInfo.findById(order.storeId).populate({
      path: "sellerAuthId",
      select: "userInfo",
    });
    const customerAddress = await CustomerAddress.findById(
      order.customerAddressId
    ).populate({
      path: "customerId",
      select: "fullName countryCode mobileNo altMobileNo",
    });

    if (!store || !customerAddress) {
      return sendResponse(res, 400, false, "Missing address info");
    }

    const shipmentProviderName =
      order.paymentTypeId === 1 ? "Shiprocket" : "Porter";
    const shipmentProvider = await ShipmentProvider.findOne({
      name: shipmentProviderName,
    });

    if (!shipmentProvider) {
      return sendResponse(res, 400, false, "Invalid shipment provider");
    }
    console.log("shipmentProvider : ", shipmentProvider);

    let shipmentResponse;
    // if (shipmentProvider.name === "Shiprocket") {
    //   shipmentResponse = await createShiprocketShipment(
    //     order,
    //     store,
    //     customerAddress
    //   );
    // } else {
    //   shipmentResponse = await createPorterShipment(
    //     order,
    //     store,
    //     customerAddress
    //   );
    // }

    shipmentResponse = await createPorterShipment(
      order,
      store,
      customerAddress
    );

    const shipment = await Shipment.create({
      orderId: order._id,
      shipmentProviderId: shipmentProvider._id,
      trackingId: shipmentResponse?.tracking_id || shipmentProvider._id,
      currentStatus: "Created",
      pickupStoreName: store.storeName,
      pickupAddress: store.storeAddress,
      pickupAddressUrl: store.address_url,
      pickupPincode: store.pincode,
      pickupCity: store.city,
      pickupState: store.state,
      pickupLat: store.lat,
      pickupLng: store.lng,
      dropAddressType: customerAddress.type,
      dropAddressLine1: customerAddress.address_line_1,
      dropAddressLine2: customerAddress.address_line_2,
      dropAddressUrl: customerAddress.address_url,
      dropLandmark: customerAddress.landmark,
      dropPincode: customerAddress.pincode,
      dropCity: customerAddress.city,
      dropState: customerAddress.state,
      dropLat: customerAddress.location.coordinates[0],
      dropLng: customerAddress.location.coordinates[1],
      shipmentResponse: JSON.stringify(shipmentResponse?.raw),
      trackingUrl:
        shipmentResponse?.tracking_url ||
        "https://app.shiprocket.in/orders/view/123456789",
    });

    // Send shipment created notifications
    if (order) {
      // Notify customer
      const customer = await Customer.findById(order.customerId);
      if (customer && customer.fcmToken) {
        await sendCustomerNotification(
          customer.fcmToken,
          {
            title: "Shipment Created",
            body: `Your order #${order.orderNumber} is ready for shipment`,
            data: {
              orderId: order._id.toString(),
              shipmentId: shipment._id.toString(),
            },
          },
          customer._id
        );
      }

      // Notify seller
      const seller = await SellerUserAuth.findById(order.sellerId);
      if (seller && seller.fcmToken) {
        await sendSellerNotification(
          seller.fcmToken,
          {
            title: "Shipment Created",
            body: `Order #${order.orderNumber} is ready for shipment`,
            data: {
              orderId: order._id.toString(),
              shipmentId: shipment._id.toString(),
              isFullScreen: "false",
            },
          },
          seller._id
        );
      }
    }

    return sendResponse(res, 201, true, "Shipment created", shipment);
  } catch (error) {
    console.error("Create Shipment error:", error.message);
    return sendResponse(res, 500, false, error.message);
  }
};

/**
 *
 * Track Shipment
 *
 */
export const trackShipment = async (req, res) => {
  try {
    const { shipmentId } = req.params;

    if (!shipmentId) {
      return sendResponse(res, 400, false, "Shipment ID is required");
    }

    const shipment = await Shipment.findById(shipmentId);

    if (!shipment) {
      return sendResponse(res, 404, false, "Shipment not found");
    }

    if (["Accepted", "Trip Started"].includes(shipment.currentStatus)) {
      try {
        const porterResponse = await getPorterLiveTrackingDetails(
          shipment.trackingId
        );

        const partnerLocation = porterResponse?.partner_info?.location;

        if (partnerLocation?.lat && partnerLocation?.long) {
          shipment.partner_lat = partnerLocation.lat.toString();
          shipment.partner_lng = partnerLocation.long.toString();
          await shipment.save();
        }
      } catch (err) {
        console.error("Porter tracking fetch failed:", err.message);
      }
    }

    return sendResponse(
      res,
      200,
      true,
      "Shipment fetched successfully",
      shipment
    );
  } catch (error) {
    console.error("Error in trackShipment:", error.message);
    return sendResponse(res, 500, false, "Something went wrong");
  }
};

/**
 *
 * Order List
 *
 */
export const listOrders = async (req, res) => {
  try {
    const { page, limit, customerId, sellerId, storeId, search } = req.body;
    const match = { paymentStatus: "Success" };

    if (customerId) match.customerId = customerId;
    if (sellerId) match.sellerId = new mongoose.Types.ObjectId(sellerId);
    if (storeId) match.storeId = new mongoose.Types.ObjectId(storeId);

    if (search) {
      match.orderNumber = { $regex: search, $options: "i" };
    }
    let total = await Order.countDocuments(match);

    let ordersQuery = Order.find(match)
      .sort({ createdAt: -1 })
      .populate({ path: "storeId", select: "storeName city state " })
      .populate({ path: "sellerId", select: "userInfo userAuth.email " })
      .populate({ path: "customerId", select: "fullName email mobile" })
      .populate({ path: "customerAddressId" })
      .lean();

    // If page & limit are provided, apply pagination
    if (page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      ordersQuery = ordersQuery.skip(skip).limit(parseInt(limit));
    }

    const orders = await ordersQuery;

    if (!orders.length) {
      return sendResponse(res, 400, false, "No orders found");
    }

    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItem.find({
          orderId: new mongoose.Types.ObjectId(order._id),
        })
          .populate({ path: "categoryId", select: "name" })
          .populate({ path: "subcategoryId", select: "name" })
          .populate({ path: "color", select: "name image" })
          .populate({
            path: "productId",
            select: "name primaryImage description sellingPrice",
          })
          .populate({
            path: "productSizeId",
            select: "sku",
          })
          .lean();

        const enrichedItems = items.map((item) => ({
          ...item,
          productImage: item.productId?.image || null,
          categoryName: item.categoryId?.name || null,
          subcategoryName: item.subcategoryId?.name || null,
          colorName: item.color?.name || null,
          colorImage: item.color?.image || null,
        }));

        const paymentType = await PaymentType.findOne({
          indexNumber: order.paymentTypeId,
          isDeleted: false,
        }).lean();

        return {
          ...order,
          items: enrichedItems,
          paymentType: paymentType?.name || "N/A",
        };
      })
    );

    return sendResponse(res, 200, true, "Orders fetched successfully", {
      ...(page && limit
        ? { total, page: parseInt(page), limit: parseInt(limit) }
        : {}),
      orders: ordersWithDetails,
    });
  } catch (error) {
    console.error("List Orders Error:", error.message);
    return sendResponse(res, 500, false, error.message);
  }
};

/**
 *
 * Get Order Details by ID
 *
 */
export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return sendResponse(res, 400, false, "Order ID is required");
    }

    // Find the order
    const order = await Order.findById(orderId)
      .populate({ path: "storeId", select: "storeName city state storeAddress" })
      .populate({ path: "sellerId", select: "userInfo userAuth.email" })
      .populate({ path: "customerId", select: "fullName email mobileNo" })
      .populate({ path: "customerAddressId" })
      .lean();

    if (!order) {
      return sendResponse(res, 404, false, "Order not found");
    }

    // Fetch order items
    const items = await OrderItem.find({ orderId: order._id })
      .populate({ path: "categoryId", select: "name" })
      .populate({ path: "subcategoryId", select: "name" })
      .populate({ path: "color", select: "name image" })
      .populate({
        path: "productId",
        select: "name primaryImage description sellingPrice brandName",
      })
      .populate({
        path: "productSizeId",
        select: "sku",
      })
      .lean();

    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const proSizes = await ProductSize.find({
          productId: item.productId?._id,
          isDeleted: false,
        })
          .select("size sku quantity")
          .lean();

        return {
          ...item,
          productImage: item.productId?.image || null,
          categoryName: item.categoryId?.name || null,
          subcategoryName: item.subcategoryId?.name || null,
          colorName: item.color?.name || null,
          colorImage: item.color?.image || null,
          proSizes: proSizes || [],
        };
      })
    );

    const paymentType = await PaymentType.findOne({
      indexNumber: order.paymentTypeId,
      isDeleted: false,
    }).select("name");

    let shipment = await Shipment.findOne({ orderId: order._id })
      .populate({
        path: "shipmentProviderId",
        select: "name indexNumber status",
      })
      .lean();

    let shipmentHistory = [];
    if (shipment?._id) {
      shipmentHistory = await ShipmentHistory.find({
        shipmentId: shipment._id,
      }).sort({ createdAt: -1 });
    }

    return sendResponse(res, 200, true, "Order details fetched successfully", {
      ...order,
      items: enrichedItems,
      paymentType: paymentType?.name,
      shipment,
      shipmentHistory,
    });
  } catch (error) {
    console.error("Get Order Details Error:", error.message);
    return sendResponse(res, 500, false, error.message);
  }
};

/**
 *
 * RazorPay web-hook
 *
 */

export const razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const signature = req.headers["x-razorpay-signature"];
    const body = JSON.stringify(req.body); // raw body

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.log("Invalid webhook signature");
      return res.status(400).send("Invalid signature");
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === "payment.captured") {
      const payment = payload.payment.entity;

      // Find and update your order
      await Order.findOneAndUpdate(
        { orderNumber: payment.receipt }, // match using receipt
        {
          transactionId: payment.id,
          paymentStatus: "Success",
          paymentError: "",
        }
      );

      console.log("Payment verified and order updated");
    }

    return res.status(200).send("Webhook received");
  } catch (error) {
    console.error("Webhook error:", error.message);
    return res.status(500).send("Internal Server Error");
  }
};

const sendNotifications = async ({
  isReturn,
  status,
  order,
  shipment,
  returnRequest,
  seller,
  customer,
}) => {
  const isShipment = !isReturn;
  const orderIdStr = order._id.toString();
  const shipmentIdStr = isShipment ? shipment._id.toString() : undefined;
  const returnIdStr = isReturn ? returnRequest._id.toString() : undefined;

  const messages = {
    order_accepted: {
      seller: {
        title: isReturn
          ? "Return Pickup Partner Assigned"
          : "Pickup Partner Assigned",
        body: isReturn
          ? `Return pickup for order #${order.orderNumber} is assigned`
          : `Order #${order.orderNumber} is ready for pickup`,
      },
      customer: {
        title: isReturn ? "Return Pickup Assigned" : "Pickup Partner Assigned",
        body: isReturn
          ? `A partner has been assigned to pick up your return for order #${order.orderNumber}`
          : `A delivery partner is assigned for order #${order.orderNumber}`,
      },
    },
    order_start_trip: {
      seller: {
        title: isReturn ? "Return Pickup Started" : "Pickup Partner En Route",
        body: isReturn
          ? `Return pickup trip started for order #${order.orderNumber}`
          : `Delivery partner is on the way for order #${order.orderNumber}`,
      },
      customer: {
        title: isReturn
          ? "Return Pickup In Progress"
          : "Pickup Partner On The Way",
        body: isReturn
          ? `Return partner is coming to pick up your product from order #${order.orderNumber}`
          : `Your delivery partner is on the way with your order #${order.orderNumber}`,
      },
    },
    order_end_job: {
      seller: {
        title: isReturn ? "Return Completed" : "Order Delivered",
        body: isReturn
          ? `Return for order #${order.orderNumber} picked up successfully.`
          : `Order #${order.orderNumber} has been delivered successfully.`,
      },
      customer: {
        title: isReturn ? "Return Pickup Completed" : "Order Delivered",
        body: isReturn
          ? `Your product for order #${order.orderNumber} has been picked up for return.`
          : `Your order #${order.orderNumber} has been delivered successfully.`,
      },
    },
    order_reopen: {
      seller: {
        title: isReturn ? "Return Reopened" : "Delivery Partner Reassignment",
        body: isReturn
          ? `Return pickup for order #${order.orderNumber} reopened. Reassigning partner.`
          : `Partner for order #${order.orderNumber} cancelled. Reassigning.`,
      },
      customer: {
        title: isReturn ? "Return Reopened" : "Delivery Partner Cancelled",
        body: isReturn
          ? `Return pickup for order #${order.orderNumber} was reopened.`
          : `Partner cancelled for order #${order.orderNumber}. Waiting for reassignment.`,
      },
    },
    order_cancel: {
      seller: {
        title: isReturn
          ? "Return Cancelled by Partner"
          : "Order Cancelled by Partner",
        body: isReturn
          ? `Return for order #${order.orderNumber} cancelled by delivery partner.`
          : `Order #${order.orderNumber} cancelled by delivery partner.`,
      },
      customer: {
        title: isReturn ? "Return Cancelled" : "Order Cancelled",
        body: isReturn
          ? `Return for order #${order.orderNumber} was cancelled by delivery partner.`
          : `Your order #${order.orderNumber} was cancelled.`,
      },
    },
  };

  const dataPayload = {
    orderId: orderIdStr,
    ...(isShipment ? { shipmentId: shipmentIdStr } : { returnId: returnIdStr }),
    status: messages[status]?.customer?.title || "Status Updated",
    isFullScreen: "false",
  };

  // Send to seller
  if (seller?.fcmToken && messages[status]?.seller) {
    await sendSellerNotification(
      seller.fcmToken,
      {
        title: messages[status].seller.title,
        body: messages[status].seller.body,
        data: dataPayload,
      },
      seller._id
    );
  }

  // Send to customer
  if (customer?.fcmToken && messages[status]?.customer) {
    await sendCustomerNotification(
      customer.fcmToken,
      {
        title: messages[status].customer.title,
        body: messages[status].customer.body,
        data: dataPayload,
      },
      customer._id
    );
  }
};
