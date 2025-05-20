import express from "express";
import { sendPushNotification } from "../utils/firebase-admin.js";

const router = express.Router();

// POST /send-notification
router.post("/send-notification", async (req, res) => {
  try {
    const { token, title, body, data } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({ message: "token, title, and body are required" });
    }

    const result = await sendPushNotification(token, { title, body, data });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
