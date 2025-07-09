import { Cart } from "../models/cart.model.js";
import { Config } from "../models/config.model.js";
import { sendResponse , roundToTwo } from "../common/index.js";
import { CartProduct } from "../models/cartProduct.model.js";
import { Product } from "../models/product.model.js";
import { ProductSize } from "../models/productSize.model.js";
import { StoreInfo } from "../models/sellerStoreInfo.model.js";
import { Coupon } from "../models/coupon.model.js";
import mongoose from "mongoose";
import { CouponUsage } from "../models/couponUsage.model.js";
import { CustomerAddress } from "../models/customerAddres.model.js";
import { getDistanceInKm } from "../common/distance.js";

export const addToCart = async (req, res) => {
  try {
    const { storeId, productId, sizeId, quantity,customerAddressId } = req.body;
    // const { storeId, productId, sizeId, quantity } = req.body;
    const customerId = req.id;

    // if (!storeId || !productId || !sizeId || !quantity  ) {
    if (!storeId || !productId || !sizeId || !quantity || !customerAddressId ) {
      return sendResponse(res, 400, false, "Missing required fields");
    }

    const cartCount = await Cart.countDocuments({ customerId });
    if (cartCount >= 5) {
      return sendResponse(
        res,
        400,
        false,
        "Maximum 5 carts allowed per customer"
      );
    }

    const sizeData = await ProductSize.findOne({
      _id: sizeId,
      isDeleted: false,
    });
    if (!sizeData) {
      return sendResponse(res, 404, false, "Size not found");
    }

    if (quantity > sizeData.quantity) {
      if(sizeData.quantity === 0) return sendResponse(res,400,false,'No stock available for this size');
      
      return sendResponse(
        res,
        400,
        false,
        `Only ${sizeData.quantity} item(s) available in stock for this size`
      );
    }

    const store = await StoreInfo.findOne({ _id: storeId, is_deleted: false });
    if (!store) {
      return sendResponse(res, 404, false, "Store not found");
    }

    const sellerId = store.sellerAuthId;

    let cart = await Cart.findOne({ customerId, storeId });
    if (!cart) {
      cart = await Cart.create({ customerId, storeId,sellerId });
    }

    const cartProduct = await CartProduct.findOne({
      cartId: cart._id,
      productId,
      sizeId,
    });

    if (cartProduct) {
      return sendResponse(
        res,
        400,
        false,
        `Product already exists in your cart.`
      );
    }

    if (quantity <= 0) {
      return sendResponse(res, 400, false, "Quantity must be greater than 0");
    }

    await CartProduct.create({ cartId: cart._id, productId, sizeId, quantity });

    // 🔁 Inline updateCartTotals function
    // await calculateAndUpdateCartTotals(cart._id);
    await calculateAndUpdateCartTotals(cart._id, storeId, customerAddressId);

    return sendResponse(res, 201, true, "Item added to cart");
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

export const updateCartProduct = async (req, res) => {
  try {
    //  const { cartproductId, sizeId, quantity } = req.body;
    const { cartproductId, sizeId, quantity, customerAddressId  } = req.body;

    if (!cartproductId || !sizeId || !quantity || !customerAddressId || quantity < 1) {
    // if (!cartproductId || !sizeId || !quantity || quantity < 1) {
      return sendResponse(res, 400, false, "Missing or invalid fields");
    }

    const sizeData = await ProductSize.findOne({
      _id: sizeId,
      isDeleted: false,
    });

    if (!sizeData) {
      return sendResponse(res, 404, false, "Size not found");
    }

    if (quantity > sizeData.quantity) {
      return sendResponse(
        res,
        400,
        false,
        `Only ${sizeData.quantity} item(s) available in stock for this size`
      );
    }

    const updatedCart = await CartProduct.findByIdAndUpdate(
      cartproductId,
      {
        $set: {
          sizeId,
          quantity,
        },
      },
      { new: true }
    );

    if (!updatedCart) {
      return sendResponse(res, 404, false, "Cart product not found");
    }

    const cartId = updatedCart.cartId;
    const cartData = await Cart.findById(cartId);  

    if (customerAddressId) {
      cartData.customerAddressId = customerAddressId;
      await cartData.save();
    }
    // const customerAddressId = cartData?.customerAddressId;

    const storeId = cartData.storeId;
    
    // await calculateAndUpdateCartTotals(cartId);
    await calculateAndUpdateCartTotals(cartId, storeId, customerAddressId);

    return sendResponse(res, 200, true, "Cart product updated", updatedCart);
  } catch (error) {
    console.error("Update Cart Product Error:", error);
    return sendResponse(
      res,
      500,
      false,
      error.message
    );
  }
};

export const getCart = async (req, res) => {
  try {
    const customerId = req.id;

    const cart = await Cart.findOne({ customerId });
    if (!cart) {
      return sendResponse(res, 200, true, "Cart is empty", []);
    }

    const items = await CartProduct.aggregate([
      { $match: { cartId: cart._id } },

      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $match: { "product.isDeleted": false } },
      {
        $addFields: {
            productColorId: "$product.colors"
          }
      },
      {
        $lookup: {
          from: "productsizes",
          localField: "sizeId",
          foreignField: "_id",
          as: "size",
        },
      },
      { $unwind: "$size" },
      { $match: { "size.isDeleted": false } },

      {
        $lookup: {
          from: "colors",
          localField: "productColorId",
          foreignField: "_id",
          as: "color",
        },
      },
      { $unwind: { path: "$color", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          cartProductId: "$_id",
          sizeId: "$sizeId",
          colorId: "$color._id",
          colorName: "$color.name",
          colorImage: "$color.image",
          productId: "$product._id",
          name: "$product.name",
          image: "$product.primaryImage",
          size: "$size.size",
          quantity: 1,
          price: "$product.sellingPrice",
          description: "$product.description",
          itemTotal: { $multiply: ["$quantity", "$product.sellingPrice"] },
        },
      },
    ]);

    const response = {
      cartId: cart._id,
      storeId: cart.storeId,
      sellerId : cart.sellerId,
      customerAddressId : cart.customerAddressId,
      items,
      sub_total_amount : cart.sub_total_amount,
      platform_fee : cart.platform_fee,
      delivery_fee : cart.delivery_fee,
      cgst : cart.cgst,
      sgst : cart.sgst,
      discountAmount: roundToTwo(cart.discountAmount || 0),
      total_amount : cart.total_amount,
      couponCode: cart.couponCode || null,
    };

    return sendResponse(res, 200, true, "Cart fetched successfully", response);
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
};

export const removeCartItems = async (req, res) => {
  try {
    const { cartId, cartProductIds } = req.body;

    if (!cartId) {
      return sendResponse(res, 400, false, "cartId is required");
    }

    // 1. Remove selected items or all
    if (Array.isArray(cartProductIds) && cartProductIds.length > 0) {
      await CartProduct.deleteMany({ _id: { $in: cartProductIds }, cartId });
    } else {
      // Remove all items in cart
      await CartProduct.deleteMany({ cartId });
    }

    // 2. Check if cart is now empty
    const remainingItems = await CartProduct.countDocuments({ cartId });
    if (remainingItems === 0) {
      await Cart.findByIdAndDelete(cartId);
      return sendResponse(res, 200, true, "All items removed and cart deleted");
    }

    // 3. Recalculate totals
    const cartData = await Cart.findById(cartId);
    const storeId = cartData.storeId;
    const customerAddressId = cartData?.customerAddressId;
    // await calculateAndUpdateCartTotals(cartId);
    await calculateAndUpdateCartTotals(cartId, storeId, customerAddressId);

    return sendResponse(res, 200, true, "Selected items removed from cart");
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
};

// export const calculateAndUpdateCartTotals = async (cartId) => {
//   const cartProducts = await CartProduct.aggregate([
//     { $match: { cartId } },
//     {
//       $lookup: {
//         from: "products",
//         localField: "productId",
//         foreignField: "_id",
//         as: "product",
//       },
//     },
//     { $unwind: "$product" },
//     { $match: { "product.isDeleted": false } },
//     {
//       $project: {
//         itemTotal: { $multiply: ["$quantity", "$product.sellingPrice"] },
//       },
//     },
//   ]);

//   const sub_total_amount = cartProducts.reduce(
//     (sum, item) => sum + item.itemTotal,
//     0
//   );

//   const neededConfigKeys = ["platformfee", "deliveryfee", "cgst", "sgst"];
//   const configMap = await getConfigsByNames(neededConfigKeys);

//   let delivery_fee = 0;

//   const platform_fee = configMap.platformfee ? roundToTwo(parseFloat(configMap.platformfee)) : 0;
//   const cgst = configMap.cgst ? roundToTwo(parseFloat(configMap.cgst)) : 0;
//   const sgst = configMap.sgst ? roundToTwo(parseFloat(configMap.sgst)) : 0;

//   const total_amount = roundToTwo(sub_total_amount + platform_fee + delivery_fee + cgst + sgst);

//   await Cart.findByIdAndUpdate(cartId, {
//     sub_total_amount: roundToTwo(sub_total_amount),
//     platform_fee,
//     delivery_fee,
//     cgst,
//     sgst,
//     total_amount,
//   });

//   return {
//     sub_total_amount,
//     platform_fee,
//     delivery_fee,
//     cgst,
//     sgst,
//     total_amount,
//   };
// };

export const calculateAndUpdateCartTotals = async (cartId, storeId, customerAddressId) => {
  const cartProducts = await CartProduct.aggregate([
    { $match: { cartId } },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    { $match: { "product.isDeleted": false } },
    {
      $project: {
        itemTotal: { $multiply: ["$quantity", "$product.sellingPrice"] },
      },
    },
  ]);

  const sub_total_amount = cartProducts.reduce(
    (sum, item) => sum + item.itemTotal,
    0
  );

  const neededConfigKeys = ["platformfee", "deliveryfee", "cgst", "sgst"];
  const configMap = await getConfigsByNames(neededConfigKeys);

  let delivery_fee = 0;

  // ✅ Apply distance based delivery fee
  if (storeId && customerAddressId) {
    const store = await StoreInfo.findById(storeId);
    const customerAddress = await CustomerAddress.findById(customerAddressId);

    if (store && customerAddress) {
      const storeLat = store?.position?.lat;
      const storeLng = store?.position?.lng;
      const customerLat = customerAddress?.location?.coordinates?.[0];
      const customerLng = customerAddress?.location?.coordinates?.[1];

      if (
        storeLat != null &&
        storeLng != null &&
        customerLat != null &&
        customerLng != null
      ) {
        const distance = getDistanceInKm(
          storeLat,
          storeLng,
          customerLat,
          customerLng
        );

        if (distance > 8) {
          delivery_fee = configMap.deliveryfee
            ? roundToTwo(parseFloat(configMap.deliveryfee))
            : 0;
        }
      }
    }
  }

  const platform_fee = configMap.platformfee ? roundToTwo(parseFloat(configMap.platformfee)) : 0;
  const cgst = configMap.cgst ? roundToTwo(parseFloat(configMap.cgst)) : 0;
  const sgst = configMap.sgst ? roundToTwo(parseFloat(configMap.sgst)) : 0;

  const total_amount = roundToTwo(sub_total_amount + platform_fee + delivery_fee + cgst + sgst);

  await Cart.findByIdAndUpdate(cartId, {
    sub_total_amount: roundToTwo(sub_total_amount),
    platform_fee,
    delivery_fee,
    cgst,
    sgst,
    total_amount,
  });

  return {
    sub_total_amount,
    platform_fee,
    delivery_fee,
    cgst,
    sgst,
    total_amount,
  };
};

/**
 * Coupon Applying
 */

export const applyCouponToCart = async (req, res) => {
  try {
    const { cartId, couponCode } = req.body;
    const customerId = req.id;

    if (!cartId) {
      return sendResponse(res, 400, false, "cartId is required");
    }
    
    const cart = await Cart.findOne({ _id: cartId, customerId });
    if (!cart) {
      return sendResponse(res, 404, false, "Cart not found");
    }

    const originalTotal =
      cart.sub_total_amount +
      cart.platform_fee +
      cart.delivery_fee +
      cart.cgst +
      cart.sgst;

    
    if(!couponCode || couponCode.trim() === ""){
      cart.couponCode = null;
      cart.discountAmount = 0;
      cart.total_amount = roundToTwo(originalTotal);

      await cart.save();

      return sendResponse(res, 200, true, "Coupon removed", {
          originalTotal,
          discount: 0,
          finalTotal: originalTotal,
        });
     }

    const coupon = await Coupon.findOne({
      couponCode: couponCode.toUpperCase(),
      storeId: new mongoose.Types.ObjectId(cart.storeId),
      is_deleted: false,
      isActive: true,
      validFrom: { $lte: new Date() },
      validTill: { $gte: new Date() },
    });

    if (!coupon) {
      return sendResponse(res, 404, false, "Invalid or expired coupon.");
    }
    if (coupon.usageLimit > 0 && coupon.currentUsagesCount >= coupon.usageLimit) {
      return sendResponse(res, 400, false, "Coupon usage limit exceeded.");
    }

    if (coupon.usageLimitPerUser > 0) {
      const userUsage = await CouponUsage.findOne({
        couponId: coupon._id,
        customerId,
      });
      if (userUsage && userUsage.usageCount >= coupon.usageLimitPerUser) {
        return sendResponse(
          res,
          400,
          false,
          "You have already used this coupon the maximum allowed times."
        );
      }
    }

    if (cart.sub_total_amount < coupon.minOrderAmount) {
      return sendResponse(
        res,
        400,
        false,
        `Cart total must be at least ₹${coupon.minOrderAmount} to use this coupon.`
      );
    }

    let discount = 0;
    if (coupon.discountType === "flat") {
      discount = coupon.discountValue;
    } else if (coupon.discountType === "percentage") {
      discount = (cart.sub_total_amount * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    }
    const totalAmountAfterDiscount = originalTotal - discount;

    cart.couponCode = coupon.couponCode;
    cart.discountAmount = roundToTwo(discount);
    cart.total_amount = roundToTwo(totalAmountAfterDiscount);

    await cart.save();

    return sendResponse(res, 200, true, "Coupon applied", {
      originalTotal: roundToTwo(cart.total_amount + discount),
      discount: roundToTwo(discount),
      finalTotal: roundToTwo(totalAmountAfterDiscount),
    });
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

export const getConfigsByNames = async (namesArray) => {
  const configs = await Config.find({
    name: { $in: namesArray },
    status: true,
    isDeleted: false,
  });

  const configMap = {};
  configs.forEach((item) => {
    configMap[item.name] = item.value;
  });

  return configMap;
};