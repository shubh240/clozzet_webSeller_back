import { SellerCategory } from "../models/sellerCategory.model.js";
import { sendResponse } from "../common/index.js";
import mongoose from "mongoose";

export const createSellerCategory = async (req, res) => {
  try {
    const { sellerId, categoryId } = req.body;
    const createdBy = req.id;

    // Validate required fields
    if (!sellerId || !categoryId) {
      return sendResponse(res, 400, false, "sellerId and categoryId are required.");
    }

    // Check for duplicate
    const exists = await SellerCategory.findOne({
      sellerId,
      categoryId,
      isDeleted: false,
    });

    if (exists) {
      return sendResponse(res, 400, false, "Seller category already exists.");
    }

    const newEntry = new SellerCategory({
      sellerId,
      categoryId,
      createdBy,
    });

    const savedEntry = await newEntry.save();

    return sendResponse(res, 201, true, "Seller category created successfully", savedEntry);
  } catch (error) {
    console.error("Create SellerCategory error:", error);
    return sendResponse(res, 500, false, "Internal server error", { error: error.message });
  }
};

export const getSellerCategories = async (req, res) => {
  try {
    const { sellerId, categoryId } = req.query;

    const matchStage = { isDeleted: false };
    if (sellerId) matchStage.sellerId = new mongoose.Types.ObjectId(sellerId);
    if (categoryId) matchStage.categoryId = new mongoose.Types.ObjectId(categoryId);

    const data = await SellerCategory.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "selleruserauths",
          localField: "sellerId",
          foreignField: "_id",
          as: "seller",
        },
      },
      { $unwind: "$seller" },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $lookup: {
          from: "selleruserauths",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          sellerId: 1,
          categoryId: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
          "seller._id": 1,
          "seller.userInfo.firstName": 1,
          "seller.userInfo.lastName": 1,
          "category.name": 1,
          "createdBy.userInfo.firstName": 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return sendResponse(res, 200, true, "Seller categories fetched", data);
  } catch (error) {
    console.error("Get SellerCategories error:", error);
    return sendResponse(res, 500, false, "Internal server error", { error: error.message });
  }
};

export const updateSellerCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId } = req.body;
    const updatedBy = req.id;

    const entry = await SellerCategory.findById(id);
    if (!entry || entry.isDeleted) {
      return sendResponse(res, 404, false, "Seller category not found");
    }

    entry.categoryId = categoryId || entry.categoryId;
    entry.updatedBy = updatedBy;

    const updatedEntry = await entry.save();

    return sendResponse(res, 200, true, "Seller category updated", updatedEntry);
  } catch (error) {
    console.error("Update SellerCategory error:", error);
    return sendResponse(res, 500, false, "Internal server error", { error: error.message });
  }
};

export const deleteSellerCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.id;

    const entry = await SellerCategory.findById(id);
    if (!entry || entry.isDeleted) {
      return sendResponse(res, 404, false, "Seller category not found");
    }

    entry.isDeleted = true;
    entry.deletedBy = deletedBy;

    await entry.save();

    return sendResponse(res, 200, true, "Seller category deleted");
  } catch (error) {
    console.error("Delete SellerCategory error:", error);
    return sendResponse(res, 500, false, "Internal server error", { error: error.message });
  }
};
