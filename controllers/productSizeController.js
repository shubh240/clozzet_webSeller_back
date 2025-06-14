import mongoose from "mongoose";
import { sendResponse } from "../common/index.js";
import { ProductSize } from "../models/productSize.model.js";

export const createProductSize = async (req, res) => {
    try {
      const { productId, size,sku, quantity } = req.body;
      const sellerId = req.id;
  
      if (!productId || !size || !quantity || !sku) {
        return sendResponse(res, 400, false, "Product ID, size, and quantity are required.");
      }
  
      // const existSku = await ProductSize.find({sku});
      // if (existSku) {
      //   return sendResponse(res, 400, false, "Sku with this product size is already exists");
      // }
      const newProductSize = await ProductSize.create({
        productId,
        size,
        sku,
        quantity,
        createdBy: sellerId,
      });
  
      return sendResponse(res, 201, true, "Product size created", newProductSize);
    } catch (error) {
      console.error("Create Product Size Error:", error);
      return sendResponse(res, 500, false, "Internal server error");
    }
};

export const getProductSizes = async (req, res) => {
  try {
    const { productId, size } = req.query;

    const query = { isDeleted: false };

    if (productId) {
      query.productId = productId;
    }

    if (size) {
      // Accept size as a comma-separated string (e.g., M,L)
      const sizeArray = size.split(",");
      query.size = { $in: sizeArray };
    }

    const productSizes = await ProductSize.find(query).sort({ createdAt: -1 });

    return sendResponse(res, 200, true, "Product sizes fetched", productSizes);
  } catch (error) {
    console.error("Get Product Sizes Error:", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

  
export const updateProductSize = async (req, res) => {
    try {
      const { id } = req.params;
      const { size,sku, quantity } = req.body;
      const sellerId = req.id;
  
      if (!mongoose.isValidObjectId(id)) {
        return sendResponse(res, 400, false, "Invalid product size ID");
      }
  
      const productSize = await ProductSize.findById(id);
      if (!productSize || productSize.isDeleted) {
        return sendResponse(res, 404, false, "Product size not found or is deleted");
      }
  
      productSize.size = size || productSize.size;
      productSize.sku = sku || productSize.sku;
      productSize.quantity = quantity || productSize.quantity;
      productSize.updatedBy = sellerId;
  
      await productSize.save();
  
      return sendResponse(res, 200, true, "Product size updated", productSize);
    } catch (error) {
      console.error("Update Product Size Error:", error);
      return sendResponse(res, 500, false, "Internal server error");
    }
};
  
export const deleteProductSize = async (req, res) => {
    try {
      const { id } = req.params;
      const sellerId = req.id;
  
      if (!mongoose.isValidObjectId(id)) {
        return sendResponse(res, 400, false, "Invalid product size ID");
      }
  
      const productSize = await ProductSize.findById(id);
      if (!productSize || productSize.isDeleted) {
        return sendResponse(res, 404, false, "Product size not found or is already deleted");
      }
  
      productSize.isDeleted = true;
      productSize.deletedBy = sellerId;
      await productSize.save();
  
      return sendResponse(res, 200, true, "Product size deleted", productSize);
    } catch (error) {
      console.error("Delete Product Size Error:", error);
      return sendResponse(res, 500, false, "Internal server error");
    }
};
  