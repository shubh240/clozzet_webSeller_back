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
import { sendResponse } from "../common/index.js";
import { calculateAndUpdateCartTotals } from "./cartController.js";
import { ShipmentProvider } from "../models/shipmentProvider.model.js";
import { createShiprocketShipment } from "../provider/shiprocket.js";
import { createPorterShipment } from "../provider/porter.js";
import { StoreInfo } from "../models/sellerStoreInfo.model.js";
import { Category } from "../models/category.model.js";
import { Subcategory } from "../models/subCategories.model.js";
import { Customer } from "../models/customer.model.js";
import { Color } from "../models/color.model.js";
import { Refund } from "../models/refund.model.js";
import { PaymentType } from "../models/paymentType.model.js";
import { razorpay } from "../config/razorPay.js";
import mongoose from 'mongoose';
import axios from 'axios';


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

    if (!cartId || !customerAddressId || !paymentTypeId) {
      return sendResponse(res, 400, false, "All fileds are required");
    }

    /**
     * Get Cart
     */
    const cart = await Cart.findOne({ _id: cartId });
    if (!cart) return sendResponse(res, 404, false, "Cart not found");

    /**
     * Get Cart Products
     */
    const cartProducts = await CartProduct.find({ cartId: cart._id });
    if (!cartProducts.length)
      return sendResponse(res, 404, false, "Cart is empty");

    /**
     * Calculate Totals using the helper function
     */
    const {
      sub_total_amount,
      platform_fee,
      delivery_fee,
      cgst,
      sgst,
      total_amount,
    } = await calculateAndUpdateCartTotals(cart._id);

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
        sku: product.sku,
        productName: product.name,
        productSize: productSize?.size,
        productImage: product.image,
        quantity: cp.quantity,
        amountPerUnit: amountPerUnit,
        totalAmount: total,
        color: product.colors._id
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
      storeId: cart?.storeId,
      sellerId: cart?.sellerId,
      customerId: cart?.customerId,
      customerAddressId,
      paymentTypeId,
      orderNumber,
      subTotalAmount: sub_total_amount,
      platformFee: platform_fee,
      deliveryFee: delivery_fee,
      cgst,
      sgst,
      totalAmount: total_amount,
      paymentStatus: paymentTypeId === 1 ? "Success" : "Pending",
    });

    const itemsToInsert = orderItems.map((item) => ({
      ...item,
      orderId: newOrder._id,
    }));
    await OrderItem.insertMany(itemsToInsert);

    /**
     * Clear Cart
     */
    await CartProduct.deleteMany({ cartId: cart._id });
    await Cart.findByIdAndDelete({ _id: cart._id });

    const data = {
      orderId: newOrder._id,
      orderNumber: newOrder.orderNumber,
      paymentTypeId,
      totalAmount: newOrder.totalAmount,
    };
    return sendResponse(res, 201, true, "Order created successfully", data);
  } catch (error) {
    console.error("Create Order Error:", error.message);
    return sendResponse(res, 500, false, error.message);
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
    console.log('orderId',orderId);
    
    const order = await Order.findById(orderId);
    if (!order) return sendResponse(res, 404, false, "Order not found");
    if (order.paymentTypeId !== 2) return sendResponse(res, 400, false, "Not an online payment order");
    
    const options = {
      amount: Math.round(order?.totalAmount * 100), // Razorpay needs amount in paisa
      currency: order?.currency || "INR",
      receipt: order?.orderNumber,
      payment_capture: 1, //Auto-capture enabled
    };

    const rzpOrder = await razorpay.orders.create(options);
    console.log('rzpOrder :- ?',rzpOrder);
    
    const data = {
      razorpayOrderId: rzpOrder.id,
      amount: options.amount,
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
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

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
export const returnOrder = async(req,res)=>{
  try {
    const { orderItemId, reason } = req.body;

    if (!orderItemId || !reason) {
      return sendResponse(res, 400, false, "All fileds are required");
    }

    const orderItem = await OrderItem.findById(orderItemId);

    if(!orderItem) 
    {
      return sendResponse(res, 400,false, 'No order item found');
    }
    
    if(orderItem?.isRefunded)
    {
      return sendResponse(res, 400,false, 'Already refunded');
    }

    const order = await Order.findById(orderItem?.orderId);

    if(!order) 
    {
      return sendResponse(res, 400,false, 'No order found');
    }
    
    if(order?.paymentStatus != "Success")
    {
      return sendResponse(res, 400,false, 'Payment not completed');
    }

    

    return sendResponse(res, 200, true, "Returned successfully");

  } catch (err) {
    console.error('Returned error:', err);
    return sendResponse(res, 500, false, "Returned failed");
  }
}


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
      path: 'sellerAuthId',
      select: 'userInfo',
    });
    const customerAddress = await CustomerAddress.findById(order.customerAddressId).populate({
      path : 'customerId',
      select: 'fullName countryCode mobileNo altMobileNo'
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
    console.log('shipmentProvider : ',shipmentProvider);
    

    let shipmentResponse;
    // if (shipmentProvider.name === 'Shiprocket') {
    //   shipmentResponse = await createShiprocketShipment(order, store, customerAddress);
    // } else {
    //   shipmentResponse = await createPorterShipment(order, store, customerAddress);
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
      dropLat: customerAddress.location.coordinates[1],
      dropLng: customerAddress.location.coordinates[0],
      shipmentResponse: JSON.stringify(shipmentResponse?.raw),
      trackingUrl:
        shipmentResponse?.tracking_url ||
        "https://app.shiprocket.in/orders/view/123456789",
    });

    return sendResponse(res, 201, true, "Shipment created", shipment);
  } catch (error) {
    console.error("Create Shipment error:", error.message);
    return sendResponse(res, 500, false, error.message);
  }
};

export const trackShipments = async () => {
  const activeShipments = await Shipment.find({
    currentStatus: { $nin: ["DELIVERED", "CANCELLED"] },
  }).populate('shipmentProviderId');
  console.log('activeShipments',activeShipments);
  
  for (const shipment of activeShipments) {
    try {
      let trackingData;
      console.log(typeof(shipment.shipmentProviderId.indexNumber))
      if (shipment.shipmentProviderId.indexNumber == 2) {
        // Porter API
        const response = await axios.get(
          `${process.env.PORTER_BASE_URL}/v1/orders/track/${shipment.trackingId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.PORTER_API_KEY}`,
            },
          }
        );

        trackingData = {
          status: response.data.status,
          location: response.data.current_location,
          description: response.data.description,
        };
      } else {
        // Shiprocket API
        const response = await axios.get(
          `https://apiv2.shiprocket.in/v1/external/courier/track?awb=${shipment.trackingId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.SHIPROCKET_TOKEN}`,
            },
          }
        );

        const trackInfo = response.data.tracking_data.track_status;
        trackingData = {
          status: trackInfo,
          location: response.data.tracking_data.current_status_location,
          description: response.data.tracking_data.etd || "Status update",
        };
      }

      if (trackingData) {
        await Shipment.updateOne(
          { _id: shipment._id },
          { currentStatus: trackingData.status }
        );

        await ShipmentHistory.create({
          shipmentId: shipment._id,
          currentStatus: trackingData.status,
          location: trackingData.location || "Unknown",
          description: trackingData.description,
        });

        console.log(`Updated tracking for order: ${shipment.orderId}`);
      }
    } catch (err) {
      console.error(`Tracking failed for shipment ${shipment._id}:`, err.message);
    }
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
    const match = {};

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
        const items = await OrderItem.find({ orderId: new mongoose.Types.ObjectId(order._id) })
          .populate({ path: "categoryId", select: "name" })
          .populate({ path: "subcategoryId", select: "name" })
          .populate({ path: "color", select: "name image" })
          .populate({
            path: "productId",
            select: "name primaryImage sku description sellingPrice",
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
        });

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
      .populate({ path: "storeId", select: "storeName city state" })
      .populate({ path: "sellerId", select: "userInfo userAuth.email" })
      .populate({ path: "customerId", select: "fullName email mobile" })
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
        select: "name primaryImage sku description sellingPrice",
      })
      .lean();

    const enrichedItems = items.map((item) => ({
      ...item,
      productImage: item.productId?.primaryImage || null,
      categoryName: item.categoryId?.name || null,
      subcategoryName: item.subcategoryId?.name || null,
      colorName: item.color?.name || null,
      colorImage: item.color?.image || null,
    }));

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

    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body); // raw body

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.log('Invalid webhook signature');
      return res.status(400).send('Invalid signature');
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured') {
      const payment = payload.payment.entity;

      // Find and update your order
      await Order.findOneAndUpdate(
        { orderNumber: payment.receipt }, // match using receipt
        {
          transactionId: payment.id,
          paymentStatus: 'Success',
          paymentError: '',
        }
      );

      console.log('Payment verified and order updated');
    }

    return res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Webhook error:', error.message);
    return res.status(500).send('Internal Server Error');
  }
};
