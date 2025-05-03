import { Customer } from "../models/customer.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import AWS from "aws-sdk";
import { sns } from "../config/awsConfig.js";

const OTP_EXPIRY_MINUTES = 5;
export const signup = async (req, res) => {
  try {
    console.log("sign up customer");
    const { firstName, lastName, email, mobileNo, password, address } =
      req.body;
    console.log(firstName, lastName, email, mobileNo, password, address);

    // Basic validation
    if (
      !firstName ||
      !lastName ||
      !email ||
      !mobileNo ||
      !password ||
      !address
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if customer already exists by email
    const existingEmail = await Customer.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        message: "Customer already exists with this email.",
        success: false,
      });
    }

    // Check if customer already exists by mobile number
    const existingMobile = await Customer.findOne({ mobileNo });
    if (existingMobile) {
      return res.status(400).json({
        message: "Customer already exists with this phone number.",
        success: false,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new customer
    await Customer.create({
      firstName,
      lastName,
      email,
      mobileNo,
      password: hashedPassword,
      address,
    });

    return res.status(201).json({
      message: "Account created successfully.",
      success: true,
    });
  } catch (error) {
    console.log(`Sign up customer error: ${error}`);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

export const login = async (req, res) => {
  try {
    console.log("Log in customer");
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
   const customer = await Customer.findOne({ email }).select("+password");
   if (!customer) {
     return res.status(400).json({
       message: "Incorrect email",
       success: false,
     });
   }
   if (customer.status === false) {
     return res.status(400).json({
       message: "User is not verified.",
       success: false,
     });
   }

   const isPasswordCorrect = await bcrypt.compare(password, customer.password);
   if (!isPasswordCorrect) {
     return res.status(400).json({
       message: "Incorrect password",
       success: false,
     });
   }

    const tokenData = {
      userId: customer._id,
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
        message: "Login successful",
        success: true,
        user: {
          _id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          mobileNo: customer.mobileNo,
          status: customer.status,
        },
      });
  } catch (error) {
    console.log(`Log in customer error: ${error}`);
     return res.status(500).json({
       message: "Internal server error",
       success: false,
     });
  }
};

export const generateOtp = async (req, res) => {
  try {
    const { mobileNo } = req.body;

    const customer = await Customer.findOne({
      mobileNo
    });

    if (!customer) {
      return res
        .status(404)
        .json({ message: "Customer not found.", success: false });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

    customer.otp = otp;
    customer.otpValid = otpExpiry;
    await customer.save();

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

    const user = await Customer.findOne({
     mobileNo
    });
    if (!user) {
      return res
        .status(404)
        .json({ message: "Customer not found.", success: false });
    }

    if (
      user.otp !== otp ||
      !user.otpValid ||
      new Date() > new Date(user.otpValid)
    ) {
      return res
        .status(400)
        .json({ message: "Invalid or expired OTP.", success: false });
    }

    // OTP is valid
    user.otp = null;
    user.otpValid = null;
    user.status = true 
    await user.save();

    return res
      .status(200)
      .json({ message: "OTP verified successfully.", success: true, status: user.status });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};


export const logout = (req, res) => {
  console.log("Inside log out customer");
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

export const toggleCustomerStatus = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Flip the status: true -> false or false -> true
    customer.status = !customer.status;
    await customer.save();

    return res.status(200).json({
      message: `Customer account has been ${
        customer.status ? "activated" : "deactivated"
      }.`,
      status: customer.status,
    });
  } catch (error) {
    console.log("Error toggling customer status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
