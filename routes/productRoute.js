import express from "express";
import upload from "../middleware/multer.middleware.js";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  statusProduct,
  universalProductList,
  homePageProductList,
  globalSearch
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

router.patch('/status-product/:productId', isUserAuthenticated, statusProduct);

router.post('/product-filters', isUserAuthenticated, universalProductList); 

router.get('/product-list/homePage', isUserAuthenticated, homePageProductList);

router.post('/search', isUserAuthenticated, globalSearch);


export default router;
