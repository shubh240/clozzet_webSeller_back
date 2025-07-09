import express from "express";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";
import { addToCart,applyCouponToCart ,getCart ,removeCartItems,updateCartAddress,updateCartProduct} from "../controllers/cartController.js";

const router = express.Router();

router.post("/add-to-cart", isUserAuthenticated, addToCart );
router.post("/applyCoupon-to-cart", isUserAuthenticated, applyCouponToCart );
router.post("/update-cartProduct", isUserAuthenticated, updateCartProduct );
router.post("/update-cart-address", isUserAuthenticated, updateCartAddress );
router.get("/list-cart", isUserAuthenticated, getCart );
router.post('/remove',isUserAuthenticated, removeCartItems);

export default router;