import mongoose from "mongoose";
import { SellerSubCategory } from "../models/sellerSubCategory.model.js";
import { sendResponse } from "../common/index.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
export const createSellerSubCategory = async (req, res) => {
  try {
    const { sellerId, categoryId, sellerCategoryId, subCategoryId } = req.body;
    const createdBy = req.id;

    if (!sellerId || !categoryId || !sellerCategoryId || !subCategoryId) {
      return sendResponse(res, 400, false, "All fields are required.");
    }

    const exists = await SellerSubCategory.findOne({
      sellerId,
      categoryId,
      sellerCategoryId,
      subCategoryId,
      isDeleted: false,
    });

    if (exists) {
      return sendResponse(res, 400, false, "Seller SubCategory already exists.");
    }

    let imageUrl;

    // ✅ Upload image to Cloudinary if available
    if (req.files && req.files["image"] && req.files["image"][0]) {
      const imagePath = req.files["image"][0].path;
      const uploadResult = await cloudinary.uploader.upload(imagePath, {
        folder: "uploads/seller/subcategories",
        resource_type: "image",
      });
      imageUrl = uploadResult.secure_url;
      fs.unlinkSync(imagePath); // Delete local file after upload
    }

    const newEntry = new SellerSubCategory({
      sellerId,
      categoryId,
      sellerCategoryId,
      subCategoryId,
      createdBy,
      ...(imageUrl && { image: imageUrl }), 
    });

    const saved = await newEntry.save();
    return sendResponse(res, 201, true, "Seller SubCategory created", saved);
  } catch (error) {
    console.error("Create SellerSubCategory error:", error);
    return sendResponse(res, 500, false, "Internal server error", { error: error.message });
  }
};

export const getSellerSubCategories = async (req, res) => {
  try {
    const match = { isDeleted: false };
    const { sellerId, sellerCategoryId } = req.query;

    if (sellerId) match.sellerId = new mongoose.Types.ObjectId(sellerId);
    if (sellerCategoryId) match.sellerCategoryId = new mongoose.Types.ObjectId(sellerCategoryId);

    const result = await SellerSubCategory.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "sellercategories",
          localField: "sellerCategoryId",
          foreignField: "_id",
          as: "sellerCategory",
        },
      },
      { $unwind: { path: "$sellerCategory", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "subcategories",
          localField: "subCategoryId",
          foreignField: "_id",
          as: "subCategory",
        },
      },
      { $unwind: { path: "$subCategory", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          sellerId: 1,
          sellerCategoryId: 1,
          "sellerCategory.categoryId": 1,
          "subCategory.name": 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return sendResponse(res, 200, true, "Seller SubCategories fetched", result);
  } catch (error) {
    console.error("Get SellerSubCategories error:", error);
    return sendResponse(res, 500, false, "Internal server error", { error: error.message });
  }
};

export const updateSellerSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { sellerCategoryId, subCategoryId } = req.body;
    const updatedBy = req.id; 
    if (!sellerCategoryId || !subCategoryId) {
      return sendResponse(res, 400, false, "Both sellerCategoryId and subCategoryId are required.");
    }
    const existingSubCategory = await SellerSubCategory.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!existingSubCategory) {
      return sendResponse(res, 404, false, "SellerSubCategory not found.");
    }

    const duplicate = await SellerSubCategory.findOne({
      _id: { $ne: id },
      sellerCategoryId,
      subCategoryId,
      isDeleted: false,
    });

    if (duplicate) {
      return sendResponse(res, 400, false, "This subcategory already exists under the specified seller category.");
    }
    let imageUrl = existingSubCategory.image;

    // Handle image upload if a new image is provided
    if (req.files && req.files["image"] && req.files["image"][0]) {
      const imagePath = req.files["image"][0].path;
      const uploadResult = await cloudinary.uploader.upload(imagePath, {
        folder: "uploads/seller/subcategories",
        resource_type: "image",
      });
      imageUrl = uploadResult.secure_url;
      fs.unlinkSync(imagePath); // Delete temp image file
    }

    existingSubCategory.sellerCategoryId = sellerCategoryId;
    existingSubCategory.subCategoryId = subCategoryId;
    existingSubCategory.updatedBy = updatedBy;
    existingSubCategory.image = imageUrl;

    const updatedSubCategory = await existingSubCategory.save();

    return sendResponse(res, 200, true, "SellerSubCategory updated successfully.", updatedSubCategory);
  } catch (error) {
    console.error("Update SellerSubCategory error:", error);
    return sendResponse(res, 500, false, "Internal server error.", { error: error.message });
  }
};

export const deleteSellerSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.id;

    const result = await SellerSubCategory.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedBy },
      { new: true }
    );

    if (!result) {
      return sendResponse(res, 404, false, "Seller SubCategory not found");
    }

    return sendResponse(res, 200, true, "Seller SubCategory deleted", result);
  } catch (error) {
    console.error("Delete SellerSubCategory error:", error);
    return sendResponse(res, 500, false, "Internal server error", { error: error.message });
  }
};
