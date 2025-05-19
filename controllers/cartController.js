import { Cart } from "../models/cart.model.js";
import { sendResponse } from "../common/index.js";
import { CartProduct } from "../models/cartProduct.model.js";
import { Product } from "../models/product.model.js";
import { ProductSize } from "../models/productSize.model.js";
import { StoreInfo } from "../models/sellerStoreInfo.model.js";

export const addToCart = async (req, res) => {
  try {
    const { storeId, productId, sizeId, quantity } = req.body;
    const customerId = req.id;

    if (!storeId || !productId || !sizeId || !quantity) {
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
    await calculateAndUpdateCartTotals(cart._id);

    return sendResponse(res, 201, true, "Item added to cart");
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

export const updateCartProduct = async (req, res) => {
  try {
    const { cartproductId, sizeId, quantity } = req.body;

    if (!cartproductId || !sizeId || !quantity || quantity < 1) {
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

    // 🔁 Recalculate totals for the parent cart
    const cartId = updatedCart.cartId;

    await calculateAndUpdateCartTotals(cartId);

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
        $project: {
          _id: 0,
          cartProductId: "$_id",
          sizeId: "$sizeId",
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

    // Calculate totals
    const {
      sub_total_amount,
      platform_fee,
      delivery_fee,
      cgst,
      sgst,
      total_amount,
    } = await calculateAndUpdateCartTotals(cart._id);

    const response = {
      cartId: cart._id,
      storeId: cart.storeId,
      sellerId : cart.sellerId,
      items,
      sub_total_amount,
      platform_fee,
      delivery_fee,
      cgst,
      sgst,
      total_amount,
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
    const updatedTotals = await calculateAndUpdateCartTotals(cartId);

    return sendResponse(res, 200, true, "Selected items removed from cart");
  } catch (err) {
    return sendResponse(res, 500, false, err.message);
  }
};

export const calculateAndUpdateCartTotals = async (cartId) => {
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
  const platform_fee = 10;
  const delivery_fee = 20;
  const cgst = sub_total_amount * 0.09;
  const sgst = sub_total_amount * 0.09;
  const total_amount =
    sub_total_amount + platform_fee + delivery_fee + cgst + sgst;

  await Cart.findByIdAndUpdate(cartId, {
    sub_total_amount,
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
