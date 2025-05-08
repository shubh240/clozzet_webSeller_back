import express from "express";
import upload from "../middleware/multer.middleware.js";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";

const router = express.Router();

router.post(
  '/add-product',
  isUserAuthenticated,
  upload.fields([
    { name: "primaryImage", maxCount: 1 },
    { name: "images", maxCount: 5 }
  ]),
  createProduct
);

router.get('/list-product', isUserAuthenticated, getProducts); 

router.get('/list-productById/:productId', isUserAuthenticated, getProductById); 

router.put(
  '/update-product/:productId',
  isUserAuthenticated, 
  upload.fields([
    { name: "primaryImage", maxCount: 1 },
    { name: "images", maxCount: 5 }
  ]),
  updateProduct
);

router.delete('/delete-product/:productId', isUserAuthenticated, deleteProduct);

export default router;
