import { Customer } from "../models/customer.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Otp } from "../models/otp.model.js";
import crypto from "crypto";
import AWS from "aws-sdk";
import { sns } from "../config/awsConfig.js";
import { sendResponse } from "../common/index.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import { CustomerAddress } from "../models/customerAddres.model.js";

const OTP_EXPIRY_MINUTES = 5;
export const signup = async (req, res) => {
  try {
    const { fullName, email, countryCode, mobileNo ,altMobileNo } = req.body;

    if (
      !fullName ||
      !email ||
      !mobileNo ||
      !countryCode
    ) {
      return sendResponse(res, 400, false, "All fields are required");
    }

    const existingEmail = await Customer.findOne({ email });
    if (existingEmail) {
      return sendResponse(res, 400, false, "Customer already exists with this email.");
    }

    const existingMobile = await Customer.findOne({ mobileNo });
    if (existingMobile) {
      return sendResponse(res, 400, false, "Customer already exists with this phone number.");
    }

    const existingAltMobile = await Customer.findOne({ altMobileNo });
    if (existingAltMobile) {
      return sendResponse(res, 400, false, "Customer already exists with this alternative phone number.");
    }

    // Create new customer
    await Customer.create({
      fullName,
      email,
      countryCode,
      mobileNo,
      altMobileNo,
    });

    return sendResponse(res, 201, true, "Account created successfully.");

  } catch (error) {
    console.log(`Sign up customer error: ${error}`);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

export const generateOtp = async (req, res) => {
  try {
    const {countryCode, mobileNo } = req.body;
    if(!mobileNo || !countryCode){
      return sendResponse(res, 400, false, "Mobile Number and countryCode are required");
    }
    const customer = await Customer.findOne({ mobileNo,countryCode });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found.", success: false });
    }

    // const otp = crypto.randomInt(100000, 999999).toString();
    const otp = 1234;
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

    // Save or update OTP in Otp collection
    await Otp.findOneAndUpdate(
      { mobileNo },
      {
        otp,
        otp_type: "signup",
        expiryDate: expiry,
      },
      { upsert: true, new: true }
    );

    // Format number in E.164 format
    const formattedNumber = `+91${mobileNo}`;

    const message = `Your OTP is: ${otp}. It is valid for ${OTP_EXPIRY_MINUTES} minutes.`;

    // Send SMS logic here
    // await sns.publish({ Message: message, PhoneNumber: formattedNumber }).promise();
    return sendResponse(res, 201, true, "OTP sent to your mobile number.");

  } catch (err) {
    console.error("OTP Send Error:", err);
    return sendResponse(res, 500, false, err.message);
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { mobileNo, otp,countryCode } = req.body;

    if (!mobileNo || !otp || !countryCode) {
      return sendResponse(res, 400, false, "Mobile number,countryCode and OTP are required");
    }

    const otpRecord = await Otp.findOne({ mobileNo });

    if (!otpRecord) {
      return sendResponse(res, 404, false, "OTP not found.");
    }

    const isOtpExpired = new Date() > new Date(otpRecord.expiryDate);

    if (
      otpRecord.otp !== parseInt(otp) ||
      !otpRecord.expiryDate ||
      isOtpExpired
    ) {
      return sendResponse(res, 400, false, "Invalid or expired OTP.");
    }

    const customer = await Customer.findOne({ mobileNo,countryCode });
    if (!customer) {
      return sendResponse(res, 404, false, "Customer not found.");
    }

    // Generate JWT
    const tokenPayload = {
      userId: customer._id,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET_KEY, {
      expiresIn: "1d",
    });

    // Update customer as active and store token
    customer.isActive = true;
    customer.token = token;
    await customer.save();

    // Delete used OTP
    await Otp.deleteOne({ mobileNo });

    // Set token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "strict",
    });

    return sendResponse(res, 200, true, "OTP verified successfully. Customer is now active.", {
      token,
      user: {
        _id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        mobileNo: customer.mobileNo,
        isActive: customer.isActive,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return sendResponse(res, 400, false, "No token found.");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const customerId = decoded.userId;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return sendResponse(res, 404, false, "Customer not found.");
    }

    customer.isActive = false;
    customer.token = null;
    await customer.save();

    // Clear token cookie
    res.cookie("token", "", {
      maxAge: 0,
      httpOnly: true,
      sameSite: "strict",
    });

    return sendResponse(res, 200, true, "Logged out successfully.");
  } catch (error) {
    console.error("Logout error:", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
};
export const updateProfile = async (req, res) => {
  try {
    const customerId = req.id;

    const {
      fullName,

      // Address-related
      addressId,
      type,
      address_line_1,
      address_line_2,
      landmark,
      city,
      state,
      pincode,
      address_url,
      coordinates, // [longitude, latitude]
    } = req.body;

    let imageUrl;
    const parsedCoordinates = [];

    // Upload image to Cloudinary
    if (req.files && req.files["image"] && req.files["image"][0]) {
      const imagePath = req.files["image"][0].path;
      const imageResult = await cloudinary.uploader.upload(imagePath, {
        folder: "uploads/customers/profile",
        resource_type: "image",
      });
      imageUrl = imageResult.secure_url;
      fs.unlinkSync(imagePath);
    }

    // Parse coordinates if provided in string format
    if (coordinates && typeof coordinates === "string") {
      try {
        const coordinatesArray = JSON.parse(coordinates);  // Parse stringified array
        if (Array.isArray(coordinatesArray) && coordinatesArray.length === 2) {
          parsedCoordinates.push(parseFloat(coordinatesArray[0]), parseFloat(coordinatesArray[1]));
        } else {
          throw new Error("Invalid coordinates format");
        }
      } catch (err) {
        console.error("Invalid coordinates format:", err.message);
        return sendResponse(res, 400, false, "Invalid coordinates format. Should be an array like [lng, lat]");
      }
    } else if (Array.isArray(coordinates) && coordinates.length === 2) {
      parsedCoordinates.push(parseFloat(coordinates[0]), parseFloat(coordinates[1]));
    } else {
      return sendResponse(res, 400, false, "Coordinates must be an array of two numbers.");
    }

    // Update customer basic profile
    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      {
        ...(fullName && { fullName }),
        ...(imageUrl && { image: imageUrl }),
      },
      { new: true }
    );

    // Address handling
    const addressDataPresent = type && address_line_1 && address_line_2 && city && state && pincode && parsedCoordinates.length === 2;
    console.log(parsedCoordinates);

    if (addressId) {
      // Update existing address
      await CustomerAddress.findOneAndUpdate(
        { _id: addressId, customerId },
        {
          ...(type && { type }),
          ...(address_line_1 && { address_line_1 }),
          ...(address_line_2 && { address_line_2 }),
          ...(landmark && { landmark }),
          ...(city && { city }),
          ...(state && { state }),
          ...(pincode && { pincode }),
          ...(address_url && { address_url }),
          ...(parsedCoordinates.length === 2 && {
            location: {
              type: "Point",
              coordinates: parsedCoordinates,
            },
          }),
        },
        { new: true }
      );
    } else if (addressDataPresent) {
      // Create new address
      await CustomerAddress.create({
        customerId,
        type,
        address_line_1,
        address_line_2,
        landmark: landmark || '',
        city,
        state,
        pincode,
        address_url: address_url || '',
        location: {
          type: "Point",
          coordinates: parsedCoordinates,
        },
      });
    }

    return sendResponse(res, 200, true, "Profile updated successfully", {
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

