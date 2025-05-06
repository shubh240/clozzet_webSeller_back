import { SellerUserAuth } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import AWS from "aws-sdk";
import { sns } from "../config/awsConfig.js";
import { sendResponse } from "../common/index.js";


const OTP_EXPIRY_MINUTES = 5;

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
     const { email, password } = req.body;
    if(!email || !password){
      return sendResponse(res, 400, false, "Email and Password are required");
    }
     const user = await SellerUserAuth.findOne({
       "userAuth.email": email,
     });
     if (!user) {
      return sendResponse(res, 404, false, "Seller not found");
     }

     const isMatch = await bcrypt.compare(password, user.userAuth.password);
     if (!isMatch) {
      return sendResponse(res, 400, false, "Invalid credentials");
     }

    const tokenData = {
      userId: user._id,
    };

    const token = await jwt.sign(tokenData, process.env.JWT_SECRET_KEY, {
      expiresIn: "1d",
    });
    res.cookie("token", token, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
    });

    return sendResponse(res, 200, true, "Login successful", {
      token,
      _id: user._id,
      firstName: user.userInfo.firstName,
      lastName: user.userInfo.lastName,
      email: user.userAuth.email,
      mobileNo : user.userInfo.mobileNo
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
    const otp = 1234
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

    seller.userAuth.otp = otp;

    seller.userAuth.otpValid = otpExpiry;
    await seller.save();

    // Format number in E.164 format: +91xxxxxxxxxx
    const formattedNumber = `+91${mobileNo}`;

    const params = {
      Message: `Your OTP is: ${otp}. It is valid for ${OTP_EXPIRY_MINUTES} minutes.`,
      PhoneNumber: formattedNumber,
    };

    // const snsResult = await sns.publish(params).promise();
    // console.log("SNS response:", snsResult);

    return sendResponse(res, 200, true, "OTP sent to your mobile number", {
      mobileNo,
      otp
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

    return sendResponse(res, 200, true, "OTP verified and user logged in successfully.", {
      _id: user._id,
      firstName: user.userInfo?.firstName,
      lastName: user.userInfo?.lastName,
      email: user.userAuth?.email,
    });

  } catch (error) {
    console.log("Verify OTP Error:", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
};  

export const logoutSeller = (req, res) => {
  console.log("Inside log out seller");
  try {
    res.clearCookie("user-token", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production", // optional for HTTPS
    });

    return sendResponse(res, 200, true, "Logged out successfully");
  } catch (error) {
    console.log("Logout error:", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
};
