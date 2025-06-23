// utils/firebase-admin.js
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import fs from "fs";
import { SellerNotification } from "../models/sellerNotification.model.js";
import { CustomerNotification } from "../models/customerNotification.model.js";

// Read and parse the service account key
const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("../config/firebase-service-key.json", import.meta.url))
);

// Initialize Firebase only once
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

// Get the messaging instance
const messaging = getMessaging();

/**
 * Reusable function to send push notification
 * @param {string} token - FCM device token
 * @param {object} payload - { title, body, image?, data? }
 */
export const sendPushNotification = async (token, { title, body,image = "", data = {} }) => {
  try {
    const message = {
      token,
      notification: {
        title,
        body,
        ...(image && { image })
      },
      data,
    };

    const response = await messaging.send(message);
    console.log("✅ Push sent:", response);
    return response;
  } catch (error) {
    console.error("❌ Push failed:", error);
    throw error;
  }
};


const sendPushAndSaveNotification = async (token, payload, userType, userId) => {
  const { title, body, image = "", data = {} } = payload;

  const message = {
    token,
    notification: { title, body, ...(image && { image }) },
    data,
  };
  console.log('message',message)
  const notificationData = {
    title,
    body,
    image,
    data,
    isRead: false,
  };

  try {
    const response = await messaging.send(message);
    notificationData.fcmResponse = response;
    notificationData.isSend = true;

    if (userType === "seller") {
      await SellerNotification.create({ ...notificationData, sellerId: userId });
    } else if (userType === "customer") {
      await CustomerNotification.create({ ...notificationData, customerId: userId });
    }

    console.log(`✅ ${userType} push sent & saved`);
    return response;
  } catch (error) {
    notificationData.fcmResponse = error.message || "Push failed";
    notificationData.isSend = false;

    if (userType === "seller") {
      await SellerNotification.create({ ...notificationData, sellerId: userId });
    } else if (userType === "customer") {
      await CustomerNotification.create({ ...notificationData, customerId: userId });
    }

    console.error(`❌ ${userType} push failed`);
    throw error;
  }
};

export const sendSellerNotification = async (token, payload, sellerId) => {
  return sendPushAndSaveNotification(token, payload, "seller", sellerId);
};

export const sendCustomerNotification = async (token, payload, customerId) => {
  return sendPushAndSaveNotification(token, payload, "customer", customerId);
};

// await sendSellerNotification(seller.fcmToken, {
//   title: "New Order",
//   body: "You received a new order!",
// }, seller._id);
// await sendCustomerNotification(customer.fcmToken, {
//   title: "Order Shipped",
//   body: "Your order has been shipped!",
// }, customer._id);
