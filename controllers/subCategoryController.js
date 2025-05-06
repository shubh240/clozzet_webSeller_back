import { sendResponse } from "../common/index.js";
import { Subcategory } from "../models/subCategories.model.js";


export const getAllSubCategories = async (req, res) => {
  try {
    const { search = "", page, limit, categoryId = "" } = req.query;

    const matchStage = { isDeleted: false };

    if (search) {
      matchStage.name = { $regex: search, $options: "i" };
    }

    if (categoryId) {
      matchStage.category = categoryId;
    }

    const aggregationPipeline = [
      { $match: matchStage },

      // JOIN category
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },

      // JOIN createdBy
      {
        $lookup: {
          from: "adminauths",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },

      // JOIN updatedBy
      {
        $lookup: {
          from: "adminauths",
          localField: "updatedBy",
          foreignField: "_id",
          as: "updatedBy",
        },
      },
      { $unwind: { path: "$updatedBy", preserveNullAndEmptyArrays: true } },

      // JOIN deletedBy
      {
        $lookup: {
          from: "adminauths",
          localField: "deletedBy",
          foreignField: "_id",
          as: "deletedBy",
        },
      },
      { $unwind: { path: "$deletedBy", preserveNullAndEmptyArrays: true } },

      // Sort by newest first
      { $sort: { createdAt: -1 } },
    ];

    // Count total before pagination
    const totalSubcategories = await Subcategory.aggregate([
      { $match: matchStage },
      { $count: "total" },
    ]);
    const total = totalSubcategories[0]?.total || 0;

    // Pagination
    if (page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      aggregationPipeline.push({ $skip: skip }, { $limit: parseInt(limit) });
    }

    const subcategories = await Subcategory.aggregate(aggregationPipeline);

    return sendResponse(res, 200, true, "Subcategories fetched successfully", {
      subcategories,
      total,
      ...(page && limit && {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      }),
    });
  } catch (error) {
    console.error("List subcategories error:", error);
    return sendResponse(res, 500, false, "Internal server error", {
      error: error.message,
    });
  }
};

