import { Coupon } from "../models/coupon.model.js";
import { StoreInfo } from "../models/sellerStoreInfo.model.js";
import { sendResponse } from "../common/index.js";
import mongoose from "mongoose";

export const createCoupon = async (req, res) => {
  try {
    const sellerId = req.id;
    const { couponCode, discountType, discountValue,minOrderAmount,maxDiscountAmount,usageLimit,usageLimitPerUser, validFrom, validTill } = req.body;

    if (!couponCode || !discountType || !discountValue || !validFrom || !validTill || !minOrderAmount || !usageLimit || !usageLimitPerUser) {
      return sendResponse(res, 400, false, "All required fields must be filled.");
    }

    if (discountType === "percentage" && !maxDiscountAmount) {
      return sendResponse(res, 400, false, "maxDiscountAmount is required for percentage coupons.");
    }

    if (!["percentage", "flat"].includes(discountType)) {
      return sendResponse(res, 400, false, "Invalid discountType. It must be either 'flat' or 'percentage'.");
    }
    const store = await StoreInfo.findOne({ sellerAuthId: sellerId, is_deleted: false });
    if (!store) {
      return sendResponse(res, 404, false, "Store not found for this seller.");
    }

    const storeId = store._id;

    const existingCoupon = await Coupon.findOne({
      couponCode: couponCode.toUpperCase(),
      storeId: store._id,
    });

    if (existingCoupon) {
      return sendResponse(res, 400, false, "Coupon code already exists for this store.");
    }

    const newCoupon = new Coupon({
      storeId,
      sellerId,
      couponCode,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      usageLimitPerUser,
      validFrom,
      validTill,
    });

    await newCoupon.save();
    return sendResponse(res, 201, true, "Coupon created successfully", newCoupon);
  } catch (err) {
    console.error("Create Coupon Error:", err);
    return sendResponse(res, 500, false, err.message);
  }
};

export const getSellerCoupons = async (req, res) => {
  try {
    const sellerId = req.id;

    const coupons = await Coupon.find({
      sellerId: new mongoose.Types.ObjectId(sellerId),
      is_deleted: false
    }).sort({ createdAt: -1 });

    return sendResponse(res, 200, true, "coupons fetched", coupons);
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
};


export const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, is_deleted: false });
    if (!coupon) {
      return sendResponse(res, 404, false, "Coupon not found");
    }
    return sendResponse(res, 200, true, "Coupon fetched", coupon);
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Coupon.findOneAndUpdate(
      { _id: id, is_deleted: false },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return sendResponse(res, 404, false, "Coupon not found");
    }
    return sendResponse(res, 200, true, "Coupon updated successfully", updated);
  } catch (err) {
    if (err.code === 11000) {
      return sendResponse(res, 409, false, "Duplicate coupon code");
    }
    return sendResponse(res, 500, false, err.message);
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const deleted = await Coupon.findByIdAndUpdate(req.params.id, { is_deleted: true });
    if (!deleted) {
      return sendResponse(res, 404, false, "Coupon not found");
    }
    return sendResponse(res, 200, true, "Coupon deleted");
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
};


export const getCustomerCoupons = async (req, res) => {
  try {
    const { storeId } = req.query;
    const today = new Date();

    if (!storeId) {
      return sendResponse(res, 400, false, "storeId is required");
    }

    const coupons = await Coupon.find({
      storeId: new mongoose.Types.ObjectId(storeId),
      is_deleted: false,
      isActive: true,
      validFrom: { $lte: today },
      validTill: { $gte: today }
    }).sort({ createdAt: -1 });

    return sendResponse(res, 200, true, "Available coupons fetched", coupons);
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
};