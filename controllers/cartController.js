import { Cart } from "../models/cart.model.js";
import { sendResponse } from "../common/index.js";
import { CartProduct } from "../models/cartProduct.model.js";
import { Product } from "../models/product.model.js"
import { ProductSize } from "../models/productSize.model.js"

export const addToCart = async (req, res) => {
  try {
    const { storeId, productId, sizeId, quantity } = req.body;
    const customerId = req.id
    if (!storeId || !productId || !sizeId || !quantity) {
      return sendResponse(res, 400, false, 'Missing required fields');
    }
    const cartCount = await Cart.countDocuments({customerId});
    if (cartCount >= 5) {
        return sendResponse(res, 400, false, 'Maximum 5 carts allowed per customer');
    }
    let cart = await Cart.findOne({ customerId, storeId });
    
    if (!cart) {
      cart = await Cart.create({ customerId, storeId });
    }

    let cartProduct = await CartProduct.findOne({
      cartId: cart._id,
      productId,
      sizeId
    });

    if (cartProduct) {
      const newQty = cartProduct.quantity + quantity;

      if (newQty <= 0) {
        await CartProduct.findByIdAndDelete(cartProduct._id);
        return sendResponse(res, 200, true, 'Item removed from cart');
      }

      cartProduct.quantity = newQty;
      await cartProduct.save();
      return sendResponse(res, 200, true, 'Cart item quantity updated');

    } else {
      if (quantity <= 0) {
        return sendResponse(res, 400, false, 'Quantity must be greater than 0');
      }

      await CartProduct.create({ cartId: cart._id, productId, sizeId, quantity });
      return sendResponse(res, 201, true, 'Item added to cart');
    }

  } catch (error) {
    return sendResponse(res, 500, false, 'Error adding to cart', error.message);
  }
};

export const getCart = async (req, res) => {
  try {
    const customerId = req.id;

    const cart = await Cart.findOne({ customerId });
    if (!cart) {
      return sendResponse(res, 200, true, 'Cart is empty', []);
    }

    const items = await CartProduct.aggregate([
      { $match: { cartId: cart._id } },

      {
        $lookup: {
          from: 'products', 
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      { $match: { 'product.isDeleted': false } },

      {
        $lookup: {
          from: 'productsizes', 
          localField: 'sizeId',
          foreignField: '_id',
          as: 'size'
        }
      },
      { $unwind: '$size' },
      { $match: { 'size.isDeleted': false } },

      {
        $project: {
          _id: 0,
          productId: '$product._id',
          name: '$product.name',
          image: '$product.primaryImage',
          size: '$size.size',
          quantity: 1,
          price: '$product.sellingPrice',
          description: '$product.description'
        }
      }
    ]);

    const response = {
      cartId: cart._id,
      storeId: cart.storeId,
      items
    };

    return sendResponse(res, 200, true, 'Cart fetched successfully', response);
  } catch (err) {
    return sendResponse(res, 500, false, 'Error fetching cart', err.message);
  }
};

export const removeCartItems = async (req, res) => {
  try {
    const { cartId, cartProductIds } = req.body;

    if (!cartId) {
      return sendResponse(res, 400, false, 'cartId is required');
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
      return sendResponse(res, 200, true, 'All items removed and cart deleted');
    }

    return sendResponse(res, 200, true, 'Selected items removed from cart');
  } catch (err) {
    return sendResponse(res, 500, false, 'Error removing items', err.message);
  }
};


// export const checkout = async (req, res) => {
//   try {
//     const { customerId, storeId } = req.body;

//     const cart = await Cart.findOne({ customerId, storeId });
//     if (!cart) return sendResponse(res, 400, false, 'No cart found');

//     const cartItems = await CartProduct.find({ cartId: cart._id });
//     if (cartItems.length === 0)
//       return sendResponse(res, 400, false, 'Cart is empty');

//     let total = 0;
//     const items = await Promise.all(cartItems.map(async item => {
//       const product = await Product.findById(item.productId);
//       const price = product.price;
//       total += price * item.quantity;
//       return {
//         productId: item.productId,
//         sizeId: item.sizeId,
//         quantity: item.quantity
//       };
//     }));

//     const order = await Order.create({
//       customerId,
//       storeId,
//       items,
//       totalAmount: total,
//       status: 'pending',
//       createdAt: new Date()
//     });

//     await CartProduct.deleteMany({ cartId: cart._id });

//     return sendResponse(res, 201, true, 'Order placed successfully', order);
//   } catch (err) {
//     return sendResponse(res, 500, false, 'Checkout failed', err.message);
//   }
// };
