import express from 'express';
import {
  addToWishlist,
  getUserWishlist,
  removeFromWishlist,
} from '../controllers/wishlistController.js';
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";

const router = express.Router();

router.post('/add-wishlist', isUserAuthenticated, addToWishlist);
router.get('/list-wishlist', isUserAuthenticated, getUserWishlist);
router.delete('/remove-wishlist/:productId', isUserAuthenticated, removeFromWishlist);

export default router;
