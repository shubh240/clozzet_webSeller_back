import { Customer } from "../models/customer.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Otp } from "../models/otp.model.js";
import crypto from "crypto";
import AWS from "aws-sdk";
import { sendOtp } from "../config/awsConfig.js";
import { sendResponse } from "../common/index.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import { CustomerAddress } from "../models/customerAddres.model.js";

const OTP_EXPIRY_MINUTES = 5;

export const signup = async (req, res) => {
  try {
    const { fullName, email, countryCode, mobileNo, altMobileNo } = req.body;

    if (!fullName || !email || !mobileNo || !countryCode) {
      return sendResponse(res, 400, false, "All fields are required");
    }

    const existingEmail = await Customer.findOne({ email });
    if (existingEmail) {
      return sendResponse(
        res,
        400,
        false,
        "Customer already exists with this email."
      );
    }

    const existingMobile = await Customer.findOne({ mobileNo });
    if (existingMobile) {
      return sendResponse(
        res,
        400,
        false,
        "Customer already exists with this phone number."
      );
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
    const { countryCode, mobileNo } = req.body;
    if (!mobileNo || !countryCode) {
      return sendResponse(res, 400, false, "Mobile Number and countryCode are required");
    }

    const customer = await Customer.findOne({ mobileNo, countryCode });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found.", success: false });
    }

    const testNumbers = ["6351635713", "7984865391"];
    let otp = "1234";

    if (!testNumbers.includes(mobileNo)) {
      otp = crypto.randomInt(1000, 9999).toString();
    }

    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

    await Otp.findOneAndUpdate(
      { mobileNo },
      {
        otp,
        otp_type: "signup",
        expiryDate: expiry,
      },
      { upsert: true, new: true }
    );

    // if (!testNumbers.includes(mobileNo)) {
    //   const sendResult = await sendOtp(mobileNo, otp);
    //   if (!sendResult.success) {
    //     return sendResponse(res, 500, false, "Failed to send OTP");
    //   }
    // }

    return sendResponse(res, 201, true, "OTP sent to your mobile number.");
  } catch (err) {
    console.error("OTP Send Error:", err);
    return sendResponse(res, 500, false, err.message);
  }
};

export const generateOtpOld = async (req, res) => {
  try {
    const { countryCode, mobileNo } = req.body;
    if (!mobileNo || !countryCode) {
      return sendResponse(
        res,
        400,
        false,
        "Mobile Number and countryCode are required"
      );
    }
    const customer = await Customer.findOne({ mobileNo, countryCode });

    if (!customer) {
      return res
        .status(404)
        .json({ message: "Customer not found.", success: false });
    }

    const otp = crypto.randomInt(1000, 9999).toString();
    // const otp = 1234;
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

    const sendResult = await sendOtp(mobileNo, otp);
    if (!sendResult.success) {
      return sendResponse(res, 500, false, "Failed to send OTP");
    }

    return sendResponse(res, 201, true, "OTP sent to your mobile number.");
  } catch (err) {
    console.error("OTP Send Error:", err);
    return sendResponse(res, 500, false, err.message);
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { mobileNo, otp, countryCode, fcmToken } = req.body;

    if (!mobileNo || !otp || !countryCode) {
      return sendResponse(
        res,
        400,
        false,
        "Mobile number,countryCode and OTP are required"
      );
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

    const customer = await Customer.findOne({ mobileNo, countryCode });
    if (!customer) {
      return sendResponse(res, 404, false, "Customer not found.");
    }

    // Generate JWT
    const tokenPayload = {
      userId: customer._id,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET_KEY, {
      expiresIn: "90d",
    });

    // Update customer as active and store token
    customer.isActive = true;
    customer.token = token;
    customer.fcmToken = fcmToken;
    await customer.save();

    // Delete used OTP
    await Otp.deleteOne({ mobileNo });

    // Set token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 90 * 24 * 60 * 60 * 1000,
      sameSite: "strict",
    });

    return sendResponse(
      res,
      200,
      true,
      "OTP verified successfully. Customer is now active.",
      {
        token,
        user: {
          _id: customer._id,
          fullName: customer.fullName,
          email: customer.email,
          mobileNo: customer.mobileNo,
          isActive: customer.isActive,
        },
      }
    );
  } catch (error) {
    console.error("OTP verification error:", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

export const logout = async (req, res) => {
  try {
    if (!req.id) {
      return sendResponse(res, 400, false, "Customer not authenticated.");
    }

    const customer = await Customer.findById(req.id);
    if (!customer) {
      return sendResponse(res, 404, false, "Customer not found.");
    }

    customer.isActive = false;
    customer.token = null;
    customer.fcmToken = null;
    await customer.save();

    // Clear token cookie
    res.cookie("token", {
      // maxAge: 0,
      httpOnly: true,
      sameSite: "strict",
    });

    return sendResponse(res, 200, true, "Customer logged out successfully.");
  } catch (error) {
    console.error("Logout error:", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

export const updateProfile = async (req, res) => {
  try {
    const customerId = req.id;
    const { fullName, fcmToken } = req.body;

    let imageUrl;

    // Upload image to Cloudinary
    if (req.files && req.files["image"] && req.files["image"][0]) {
      const imagePath = req.files["image"][0].path;
      const imageResult = await cloudinary.uploader.upload(imagePath, {
        folder: "uploads/customers/profile",
        resource_type: "image",
      });
      imageUrl = imageResult.secure_url;
      fs.unlinkSync(imagePath); // Remove local file
    }

    // Update customer full name and image
    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      {
        ...(fullName && { fullName }),
        ...(imageUrl && { image: imageUrl }),
        ...(fcmToken && { fcmToken }),
      },
      { new: true }
    );

    return sendResponse(res, 200, true, "Profile updated successfully", {
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

/**
 * Manage Address
 */
export const addAddress = async (req, res) => {
  try {
    const {
      type,
      address_line_1,
      address_line_2,
      landmark,
      city,
      state,
      pincode,
      address_url,
      location,
    } = req.body;

    if (
      !type ||
      !address_line_1 ||
      !address_line_2 ||
      !city ||
      !state ||
      !pincode ||
      !location ||
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2
    ) {
      return sendResponse(
        res,
        400,
        false,
        "All required fields must be provided"
      );
    }

    const newAddress = await CustomerAddress.create({
      customerId: req.id,
      type,
      address_line_1,
      address_line_2,
      landmark,
      city,
      state,
      pincode,
      address_url,
      location: {
        type: "Point",
        coordinates: location.coordinates.map(Number),
      },
    });

    return sendResponse(res, 201, true, "Address created", newAddress);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// Get all addresses for customer
export const getAllAddresses = async (req, res) => {
  try {
    const addresses = await CustomerAddress.find({
      customerId: req.id,
      is_deleted: false,
    }).sort({ createdAt: -1 });

    return sendResponse(res, 200, true, "Address data found", addresses);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// Get single address by ID
export const getAddressById = async (req, res) => {
  try {
    const address = await CustomerAddress.findOne({
      _id: req.params.id,
      customerId: req.id,
      is_deleted: false,
    });

    if (!address) {
      return sendResponse(res, 400, false, "Address not found");
    }
    return sendResponse(res, 200, true, "Address data found", address);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// Update address
export const updateAddress = async (req, res) => {
  try {
    const {
      type,
      address_line_1,
      address_line_2,
      landmark,
      city,
      state,
      pincode,
      address_url,
      location,
    } = req.body;

    const updateFields = {
      type,
      address_line_1,
      address_line_2,
      landmark,
      city,
      state,
      pincode,
      address_url,
    };

    // If location is provided, validate it
    if (location) {
      if (
        typeof location !== "object" ||
        location.type !== "Point" ||
        !Array.isArray(location.coordinates) ||
        location.coordinates.length !== 2 ||
        location.coordinates.some((coord) => isNaN(coord))
      ) {
        return sendResponse(res, 400, false, "Invalid location format");
      }

      updateFields.location = {
        type: "Point",
        coordinates: location.coordinates.map(Number),
      };
    }

    const updated = await CustomerAddress.findOneAndUpdate(
      { _id: req.params.id, customerId: req.id, is_deleted: false },
      updateFields,
      { new: true }
    );

    if (!updated) {
      return sendResponse(
        res,
        400,
        false,
        "Address not found or already deleted"
      );
    }
    return sendResponse(res, 200, true, "Address updated", updated);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const customerId = req.id;

    const activeCount = await CustomerAddress.countDocuments({
      customerId,
      is_deleted: false,
    });

    if (activeCount <= 1) {
      return sendResponse(
        res,
        403,
        false,
        "You must have at least one address. You cannot delete your all address."
      );
    }

    // Proceed to soft delete
    const deleted = await CustomerAddress.findOneAndUpdate(
      { _id: req.params.id, customerId, is_deleted: false },
      { is_deleted: true },
      { new: true }
    );

    if (!deleted) {
      return sendResponse(
        res,
        400,
        false,
        "Address not found or already deleted"
      );
    }

    return sendResponse(res, 200, true, "Address deleted successfully");
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};


export const updateCustomerFcmToken = async (req, res) => {
  try {
    const customerId = req.id;
    const { fcmToken } = req.body;
    console.log(customerId)
    if (!fcmToken) {
      return sendResponse(res, 400, false, "FCM token is required");
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return sendResponse(res, 404, false, "customer not found");
    }

    customer.fcmToken = fcmToken;
    await customer.save();

    return sendResponse(res, 200, true, "FCM token updated successfully");
  } catch (error) {
    console.error("Update FCM token error:", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
};