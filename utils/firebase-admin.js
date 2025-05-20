// utils/firebase-admin.js
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import fs from "fs";

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
