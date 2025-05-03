import { Coupon } from "../models/coupon.model.js";


// Add Item API
export const addCoupon = async (req, res) => {
  try {
    console.log("Request Body:", req.body); 
    const {
      title,
      couponType,
      code,
      limitForSameUser,
      startDate,
      expireDate,
      discountType,
      discount,
      maxDiscount,
      minPurchase
    } = req.body;

    const coupon = await Coupon.findOne({title});
    if (coupon) {
      return res.status(404).json({
        message: "Coupon withn this title already exists.",
        success: false,
      });
    }

    const newCoupon = await Coupon.create({
      title,
      couponType,
      code,
      limitForSameUser,
      startDate,
      expireDate,
      discountType,
      discount,
      maxDiscount,
      minPurchase,
    });

    return res.status(201).json({
      message: "Coupon created successfully.",
      success: true,
      newCoupon,
    });
  } catch (error) {
    console.error(`Add Coupon error: ${error}`);
    res.status(500).json({
      message: "Error adding Coupon.",
      success: false,
    });
  }
};

// Get All Items API
export const getAllCoupons = async (req, res) => {
  try {
    const allCoupons = await Coupon.find();
    return res.status(200).json({
      success: true,
      items: allCoupons,
    });
  } catch (error) {
    console.error(`Get all Coupons error: ${error}`);
    res.status(500).json({
      message: "Error fetching Coupons.",
      success: false,
    });
  }
};

// Edit Item API
export const editCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const updateData = req.body;
    // console.log(`Update data is ${updateData}`)

    // Find and update item by ID
    const updatedCoupon = await Coupon.findByIdAndUpdate(id, updateData, {
      new: true, // Return updated item
      runValidators: true, // Run validators on update
    });

    if (!updatedCoupon) {
      return res.status(404).json({
        message: "Coupon not found.",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Coupon updated successfully.",
      success: true,
      updatedCoupon,
    });
  } catch (error) {
    console.error(`Edit coupon error: ${error}`);
    res.status(500).json({
      message: "Error updating coupon.",
      success: false,
    });
  }
};

// Delete Item API
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCoupon = await Coupon.findByIdAndDelete(id);

    if (!deletedCoupon) {
      return res.status(404).json({
        message: "Coupon not found.",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Coupon deleted successfully.",
      success: true,
      deletedCoupon,
    });
  } catch (error) {
    console.error(`Delete Coupon error: ${error}`);
    res.status(500).json({
      message: "Error deleting Coupon.",
      success: false,
    });
  }
};
