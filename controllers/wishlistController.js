import {Wishlist} from '../models/wishlist.model.js';
import { sendResponse } from "../common/index.js";

export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const customerId = req.id;
    if(!productId){
        return sendResponse(res, 400, false, 'ProductId is required');
    }
    const exists = await Wishlist.findOne({ customerId, productId });
    if (exists) {
      return sendResponse(res, 400, false, 'Already in wishlist');
    }

    await Wishlist.create({ customerId, productId });

    return sendResponse(res, 201, true, 'Added to wishlist');
  } catch (err) {
    console.error('Add to wishlist error:', err);
    return sendResponse(res, 500, false, 'Server error');
  }
};

export const getUserWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.find({
      customerId: req.id,
    }).populate('productId');

    return sendResponse(res, 200, true, 'Wishlist fetched successfully', wishlist);
  } catch (err) {
    console.error('Get wishlist error:', err);
    return sendResponse(res, 500, false, 'Failed to fetch wishlist');
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const customerId = req.id;
    if(!productId){
        return sendResponse(res, 400, false, 'ProductId is required');
    }
    const result = await Wishlist.findOneAndDelete({ customerId, productId });

    if (!result) {
      return sendResponse(res, 404, false, 'Product not found in wishlist');
    }

    return sendResponse(res, 200, true, 'Removed from wishlist');
  } catch (err) {
    console.error('Remove wishlist error:', err);
    return sendResponse(res, 500, false, 'Server error');
  }
};

