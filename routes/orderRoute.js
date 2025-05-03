import express from "express";
import {
  addOrder,
  getAllOrders,
  editOrder,
  deleteOrder,
} from "../controllers/orderController.js";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";


const router = express.Router();

router.post("/add", isUserAuthenticated, addOrder); 
router.get("/all", isUserAuthenticated, getAllOrders); 
router.put("/edit/:id",  isUserAuthenticated, editOrder); 
router.delete("/delete/:id",  isUserAuthenticated, deleteOrder); 

export default router;
