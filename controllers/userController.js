import { SellerUserAuth } from "../models/sellerUserInfo.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendOtp } from "../config/awsConfig.js";
import { sendResponse } from "../common/index.js";
import AWS from "aws-sdk";
import { StoreInfo } from "../models/sellerStoreInfo.model.js";
import mongoose from "mongoose";
import { Order } from "../models/order.model.js";

const OTP_EXPIRY_MINUTES = 5;

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "us-east-1",
});

const sns = new AWS.SNS({ apiVersion: "2010-03-31" });

// export const signup = async (req, res) => {
//   try {
//     console.log("sign up user");
//     const { firstName, lastName, email, password  } = req.body;
//     console.log(firstName, lastName, email, password );
//     if (!firstName || !lastName || !email || !password ) {
//       return res.status(400).json({ message: "All fields are required" });
//     }
//     const user = await SellerUserAuth.findOne({ email });
//     if (user) {
//       return res.status(400).json({
//         message: "User already exists with this email.",
//         success: false,
//       });
//     }
//     const hashedPassword = await bcrypt.hash(password, 10);

//     await SellerUserAuth.create({
//       firstName,
//       lastName,
//       email,
//       password: hashedPassword,
//     });

//     return res.status(201).json({
//       message: "Account created succesfully.",
//       success: true,
//     });
//   } catch (error) {
//     console.log(`Sign up user error: ${error}`);
//      return res.status(500).json({
//        message: "Internal server error",
//        success: false,
//      });
//   }
// };

// Register Seller
// export const registerSeller = async (req, res) => {
//   try {
//     const { firstName, lastName, mobileNo, email, password } = req.body;

//     if(!firstName || !lastName || !mobileNo || !email || !password ){
//       return res.status(400).json({ message: "All fields are required" });
//     }
//     const existingUser = await SellerUserAuth.findOne({ "userInfo.mobileNo": mobileNo });
//     if (existingUser) {
//       return res.status(400).json({ message: "Mobile number already registered.", success: false });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const newSeller = new SellerUserAuth({
//       userInfo: { firstName, lastName, mobileNo },
//       userAuth: { email, password: hashedPassword },
//     });

//     await newSeller.save();
//     res.status(201).json({ message: "Seller registered successfully.", success: true });
//   } catch (err) {
//     console.log(err);

//     res.status(500).json({ error: err.message });
//   }
// };

export const loginseller = async (req, res) => {
  try {
    const { email, password, fcmToken } = req.body;
    if (!email || !password) {
      return sendResponse(res, 400, false, "Email and Password are required");
    }
    const user = await SellerUserAuth.findOne({
      "userAuth.email": email,
    });
    if (!user) {
      return sendResponse(res, 404, false, "Seller not found");
    }

    const storeInfo = await StoreInfo.findOne({sellerAuthId : new mongoose.Types.ObjectId(user._id) }).select('_id storeName isActive')
    if (!storeInfo || !storeInfo.isActive) {
      return sendResponse(res, 403, false, "Store is inactive. Contact admin.");
    }

    const isMatch = await bcrypt.compare(password, user.userAuth.password);
    if (!isMatch) {
      return sendResponse(res, 400, false, "Invalid credentials");
    }

    if (fcmToken) {
      user.fcmToken = fcmToken;
    }

    const tokenData = {
      userId: user._id,
    };

    const token = await jwt.sign(tokenData, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });
    user.token = token;
    await user.save();

    res.cookie("token", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
    });

    return sendResponse(res, 200, true, "Login successful", {
      token,
      _id: user._id,
      firstName: user.userInfo.firstName,
      lastName: user.userInfo.lastName,
      email: user.userAuth.email,
      mobileNo: user.userInfo.mobileNo,
      store : { storeId : storeInfo._id ,storeName : storeInfo.storeName}
    });
  } catch (error) {
    console.log(`Log in seller error: ${error}`);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

export const generateOtp = async (req, res) => {
  try {
    const { mobileNo } = req.body;
    if (!mobileNo) {
      return sendResponse(res, 400, false, "mobileNo is required");
    }
    const seller = await SellerUserAuth.findOne({
      "userInfo.mobileNo": mobileNo,
    });

    if (!seller) {
      return sendResponse(res, 404, false, "Seller not found.");
    }

    // const otp = crypto.randomInt(100000, 999999).toString();
    const otp = 1234;
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

    seller.userAuth.otp = otp;

    seller.userAuth.otpValid = otpExpiry;
    await seller.save();

    // Format number in E.164 format: +91xxxxxxxxxx
    const formattedNumber = `+91${mobileNo}`;

    const params = {
      Message: `Your OTP is: ${otp}. It is valid for ${OTP_EXPIRY_MINUTES} minutes.`,
      PhoneNumber: "+916351635713",
    };

    const snsResult = await sns.publish(params).promise();
    console.log("SNS response:", snsResult);

    return sendResponse(res, 200, true, "OTP sent to your mobile number", {
      mobileNo,
      otp,
    });
  } catch (err) {
    console.error("OTP Send Error:", err);
    return sendResponse(res, 500, false, "Failed to send OTP");
  }
};


// Verify OTP
export const verifyOtp = async (req, res) => {
  try {
    const { mobileNo, otp } = req.body;
    if (!mobileNo || !otp) {
      return sendResponse(res, 400, false, "MobileNumber and Otp are require.");
    }
    const user = await SellerUserAuth.findOne({
      "userInfo.mobileNo": mobileNo,
    });

    if (!user) {
      return sendResponse(res, 404, false, "Seller not found.");
    }

    if (
      user.userAuth.otp !== otp ||
      !user.userAuth.otpValid ||
      new Date() > new Date(user.userAuth.otpValid)
    ) {
      return sendResponse(res, 400, false, "Invalid or expired OTP.");
    }

    // OTP is valid
    user.userAuth.otp = null;
    user.userAuth.otpValid = null;
    await user.save();

    // JWT token generation
    const tokenData = {
      userId: user._id,
    };

    const token = jwt.sign(tokenData, process.env.JWT_SECRET_KEY, {
      expiresIn: "1d",
    });

    res.cookie("token", token, {
      maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
      httpOnly: true,
      sameSite: "strict",
    });

    return sendResponse(
      res,
      200,
      true,
      "OTP verified and user logged in successfully.",
      {
        _id: user._id,
        firstName: user.userInfo?.firstName,
        lastName: user.userInfo?.lastName,
        email: user.userAuth?.email,
      }
    );
  } catch (error) {
    console.log("Verify OTP Error:", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

export const logoutSeller = async(req, res) => {
  console.log("Inside log out seller");
  try {
    if (!req.id) {
      return sendResponse(res, 400, false, "Seller not authenticated.");
    }

    const seller = await SellerUserAuth.findById(req.id);
    if (!seller) {
      return sendResponse(res, 404, false, "Seller not found.");
    }
    
    seller.token = null;
    seller.fcmToken = null;
    await seller.save();

    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production", // optional for HTTPS
    });

    return sendResponse(res, 200, true, "Seller logged out successfully");
  } catch (error) {
    console.log("Logout error:", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

export const updateSellerFcmToken = async (req, res) => {
  try {
    const sellerId = req.id;
    const { fcmToken } = req.body;
    console.log(sellerId)
    if (!fcmToken) {
      return sendResponse(res, 400, false, "FCM token is required");
    }

    const seller = await SellerUserAuth.findById(sellerId);
    if (!seller) {
      return sendResponse(res, 404, false, "Seller not found");
    }

    seller.fcmToken = fcmToken;
    await seller.save();

    return sendResponse(res, 200, true, "FCM token updated successfully");
  } catch (error) {
    console.error("Update FCM token error:", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

/**
 * seller dashboard order and revenue count of week and month
 */
export const getSellerDashboardCounts = async (req, res) => {
  try {
    const sellerId = req.id;

    if (!sellerId) {
      return sendResponse(res, 400, false, "Seller ID is required");
    }

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const pipeline = [
      {
        $match: {
          sellerId: new mongoose.Types.ObjectId(sellerId),
          paymentStatus: "Success"
        },
      },
      {
        $facet: {
          ordersWeek: [
            { $match: { createdAt: { $gte: startOfWeek } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                revenue: { $sum: "$totalAmount" },
              },
            },
          ],
          ordersMonth: [
            { $match: { createdAt: { $gte: startOfMonth } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                revenue: { $sum: "$totalAmount" },
              },
            },
          ],
        },
      },
    ];

    const result = await Order.aggregate(pipeline);

    const ordersWeek = result[0]?.ordersWeek[0] || { count: 0, revenue: 0 };
    const ordersMonth = result[0]?.ordersMonth[0] || { count: 0, revenue: 0 };

    return sendResponse(res, 200, true, "Seller dashboard stats", {
      totalOrdersWeek: ordersWeek.count,
      totalRevenueWeek: ordersWeek.revenue,
      totalOrdersMonth: ordersMonth.count,
      totalRevenueMonth: ordersMonth.revenue,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return sendResponse(res, 500, false, error.message);
  }
};
