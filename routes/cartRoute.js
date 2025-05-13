import express from "express";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";
import { addToCart ,getCart ,removeCartItems} from "../controllers/cartController.js";

const router = express.Router();

router.post("/add-to-cart", isUserAuthenticated, addToCart );
router.get("/list-cart", isUserAuthenticated, getCart );
router.post('/remove',isUserAuthenticated, removeCartItems);

export default router;