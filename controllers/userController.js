import { SellerUserAuth } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import AWS from "aws-sdk";
import { sns } from "../config/awsConfig.js";


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
//     res.status(500).json({ error: err.message });
//   }
// };

export const loginseller = async (req, res) => {
  try {
     console.log("Log in user");
     const { email, password } = req.body;

     const user = await SellerUserAuth.findOne({
       "userAuth.email": email,
     });
     if (!user) {
       return res
         .status(404)
         .json({ message: "Seller not found.", success: false });
     }

     const isMatch = await bcrypt.compare(password, user.userAuth.password);
     if (!isMatch) {
       return res
         .status(400)
         .json({ message: "Invalid credentials.", success: false });
     }
    

    const tokenData = {
      userId: user._id,
    };

    const token = await jwt.sign(tokenData, process.env.JWT_SECRET_KEY, {
      expiresIn: "1d",
    });
    return res
      .status(200)
      .cookie("token", token, {
        maxAge: 1 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "strict",
      })
      .json({
        _id: user._id,
        firstName: user.userInfo?.firstName,
        lastName: user.userInfo?.lastName,
        email: user.userInfo?.email,
      });
  } catch (error) {
    console.log(`Log in seller error: ${error}`);
     return res.status(500).json({
       message: "Internal server error",
       success: false,
     });
  }
};

export const generateOtp = async (req, res) => {
  try {
    const { mobileNo } = req.body;

    const seller = await SellerUserAuth.findOne({
      "userInfo.mobileNo": mobileNo,
    });

    if (!seller) {
      return res
        .status(404)
        .json({ message: "Seller not found.", success: false });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
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

    const snsResult = await sns.publish(params).promise();
    console.log("SNS response:", snsResult);

    res.status(200).json({ message: "OTP sent to your mobile number." });
  } catch (err) {
    console.error("OTP Send Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Verify OTP
export const verifyOtp = async (req, res) => {
  try {
    const { mobileNo, otp } = req.body;

    const user = await SellerUserAuth.findOne({
      "userInfo.mobileNo": mobileNo,
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "Seller not found.", success: false });
    }

    if (
      user.userAuth.otp !== otp ||
      !user.userAuth.otpValid ||
      new Date() > new Date(user.userAuth.otpValid)
    ) {
      return res
        .status(400)
        .json({ message: "Invalid or expired OTP.", success: false });
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

    return res
      .status(200)
      .cookie("token", token, {
        maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true,
        sameSite: "strict",
      })
      .json({
        message: "OTP verified and user logged in successfully.",
        success: true,
        _id: user._id,
        firstName: user.userInfo?.firstName,
        lastName: user.userInfo?.lastName,
        email: user.userInfo?.email,
      });
  } catch (error) {
    console.log("Verify OTP Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

export const logoutSeller = (req, res) => {
  console.log("Inside log out seller")
  try {
    return res.status(200).cookie("token", "", { maxAge: 0 }).json({
      message: "Logged out succesfully",
    });
  } catch (error) {
    console.log(error);
     return res.status(500).json({
       message: "Internal server error",
       success: false,
     });
  }
};
