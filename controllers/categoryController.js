import { sendResponse } from "../common/index.js";
import { AdminAuth } from "../models/admin.model.js";
import { Category } from "../models/category.model.js";

export const listCategories = async (req, res) => {
  try {
    const { search = "", page, limit } = req.query;

    const matchStage = {
      isDeleted: false,
    };

    if (search) {
      matchStage.name = { $regex: search, $options: "i" };
    }

    const aggregationPipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "adminauths",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      {
        $lookup: {
          from: "adminauths",
          localField: "updatedBy",
          foreignField: "_id",
          as: "updatedBy",
        },
      },
      { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$updatedBy", preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
    ];

    const totalCategories = await Category.aggregate([
      { $match: matchStage },
      { $count: "total" },
    ]);
    const total = totalCategories[0]?.total || 0;

    // Apply pagination
    if (page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      aggregationPipeline.push({ $skip: skip }, { $limit: parseInt(limit) });
    }

    const categories = await Category.aggregate(aggregationPipeline);

    return sendResponse(res, 200, true, "Categories fetched successfully", {
      categories,
      total,
      ...(page && limit && {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      }),
    });
  } catch (error) {
    console.error("List categories error (aggregation):", error);
    return sendResponse(res, 500, false, "Internal server error", {
      error: error.message,
    });
  }
};
