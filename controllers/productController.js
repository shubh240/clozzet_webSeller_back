import { sendResponse } from "../common/index.js";
import { Product } from "../models/product.model.js";
import { Category } from "../models/category.model.js";
import { Subcategory } from "../models/subCategories.model.js";
import { ProductImage } from "../models/productImage.model.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import mongoose from "mongoose";
import { StoreInfo } from "../models/sellerStoreInfo.model.js";

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      subcategory,
      sellingPrice,
      originalPrice,
      sizeChart,
      brandName,
      colors,
    } = req.body;
    const sellerId = req.id;

    // 🔍 Validate required fields
    if (
      !name ||
      !description ||
      !category ||
      !subcategory ||
      !sellingPrice ||
      !brandName ||
      !sizeChart ||
      !colors
    ) {
      return sendResponse(res, 400, false, "All fields are required");
    }

    let primaryImageUrl = "";
    let productImages = [];

    // ✅ Primary image required check
    if (!req.files || !req.files["primaryImage"]) {
      return sendResponse(res, 400, false, "Primary image is required");
    }

    // Upload primary image
    const imagePath = req.files["primaryImage"][0].path;
    const imageResult = await cloudinary.uploader.upload(imagePath, {
      folder: "uploads/products/images",
      resource_type: "image",
    });
    primaryImageUrl = imageResult.secure_url;
    fs.unlinkSync(imagePath);

    // Upload additional images
    if (req.files["images"]) {
      for (let file of req.files["images"]) {
        const imagePath = file.path;
        const imageResult = await cloudinary.uploader.upload(imagePath, {
          folder: "uploads/products/images",
          resource_type: "image",
        });
        productImages.push({
          imageUrl: imageResult.secure_url,
        });
        fs.unlinkSync(imagePath);
      }
    }

    const store = await StoreInfo.findOne({
      sellerAuthId: new mongoose.Types.ObjectId(sellerId),
      is_deleted: false,
    }).select("_id");

    // Create product
    const newProduct = await Product.create({
      name: name.trim(),
      brandName: brandName.trim(),
      description: description.trim(),
      category,
      subcategory,
      sellingPrice,
      originalPrice: originalPrice || 0,
      sizeChart,
      seller: sellerId,
      storeId: store?._id,
      primaryImage: primaryImageUrl,
      colors,
      createdBy: sellerId,
    });

    // Save images
    if (productImages.length > 0) {
      for (const image of productImages) {
        await ProductImage.create({
          product: newProduct._id,
          imageUrl: image.imageUrl,
          createdBy: sellerId,
        });
      }
    }

    return sendResponse(
      res,
      201,
      true,
      "Product created successfully",
      newProduct
    );
  } catch (error) {
    console.error("Create Product Error:", error);
    return sendResponse(res, 500, false, "Error creating product");
  }
};

export const getProducts = async (req, res) => {
  try {
    const {
      search = "",
      category,
      brandName,
      storeId,
      page,
      limit,
      colors,
    } = req.query;
    const matchStage = {
      seller: new mongoose.Types.ObjectId(req.id),
      isDeleted: false,
    };

    const pipeline = [{ $match: matchStage }];

    if (search) {
      pipeline.push({
        $match: {
          name: { $regex: search, $options: "i" },
        },
      });
    }

    if (category) {
      pipeline.push({
        $match: {
          $expr: {
            $eq: ["$category", { $toObjectId: category }],
          },
        },
      });
    }

    if (colors) {
      pipeline.push({
        $match: {
          colors: new mongoose.Types.ObjectId(colors),
        },
      });
    }

    if (storeId) {
      pipeline.push({
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
        },
      });
    }

    // Lookups
    pipeline.push(
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "subcategories",
          localField: "subcategory",
          foreignField: "_id",
          as: "subcategory",
        },
      },
      {
        $unwind: {
          path: "$subcategory",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "sizecharts",
          localField: "sizeChart",
          foreignField: "_id",
          as: "sizeChart",
        },
      },
      {
        $unwind: {
          path: "$sizeChart",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "productimages",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$product", "$$productId"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
            { $project: { imageUrl: 1 } },
          ],
          as: "images",
        },
      },
      {
        $lookup: {
          from: "storeinfos",
          let: { sellerId: "$seller" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$sellerAuthId", "$$sellerId"] },
                    { $eq: ["$is_deleted", false] },
                  ],
                },
              },
            },
            {
              $project: { _id: 1, storeName: 1 },
            },
          ],
          as: "storeInfo",
        },
      },
      {
        $lookup: {
          from: "colors",
          localField: "colors",
          foreignField: "_id",
          as: "colors",
        },
      },
      {
        $addFields: {
          storeId: { $arrayElemAt: ["$storeInfo._id", 0] },
          storeName: { $arrayElemAt: ["$storeInfo.storeName", 0] },
        },
      },
      {
        $project: {
          storeInfo: 0,
        },
      }
    );

    if (brandName) {
      pipeline.push({
        $match: {
          brandName: brandName,
        },
      });
    }

    pipeline.push({ $sort: { createdAt: -1 } });

    // Clone pipeline without pagination for count
    const countPipeline = pipeline.filter(
      (stage) => !stage.$skip && !stage.$limit
    );
    countPipeline.push({ $count: "total" });

    // Safe pagination
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    if (
      !isNaN(parsedPage) &&
      parsedPage > 0 &&
      !isNaN(parsedLimit) &&
      parsedLimit > 0
    ) {
      const skip = (parsedPage - 1) * parsedLimit;
      pipeline.push({ $skip: skip }, { $limit: parsedLimit });
    }

    const [products, countResult] = await Promise.all([
      Product.aggregate(pipeline),
      Product.aggregate(countPipeline),
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    return sendResponse(res, 200, true, "Products fetched successfully", {
      total,
      page: parsedPage || 1,
      limit: parsedLimit || total,
      products,
    });
  } catch (error) {
    console.error("Get Products Error:", error);
    return sendResponse(res, 500, false, "Error fetching products");
  }
};

export const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return sendResponse(res, 400, false, "Invalid Product ID");
    }

    const pipeline = [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ["$_id", { $toObjectId: productId }] },
              { $eq: ["$isDeleted", false] },
            ],
          },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "subcategories",
          localField: "subcategory",
          foreignField: "_id",
          as: "subcategory",
        },
      },
      {
        $unwind: {
          path: "$subcategory",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "sizecharts",
          localField: "sizeChart",
          foreignField: "_id",
          as: "sizeChart",
        },
      },
      {
        $unwind: {
          path: "$sizeChart",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "productimages",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$product", "$$productId"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
            {
              $project: {
                imageUrl: 1,
              },
            },
          ],
          as: "images",
        },
      },
      {
        $lookup: {
          from: "storeinfos",
          let: { sellerId: "$seller" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$sellerAuthId", "$$sellerId"] },
                    { $eq: ["$is_deleted", false] },
                  ],
                },
              },
            },
            {
              $project: { _id: 1, storeName: 1 },
            },
          ],
          as: "storeInfo",
        },
      },
      {
        $addFields: {
          storeId: { $arrayElemAt: ["$storeInfo._id", 0] },
          storeName: { $arrayElemAt: ["$storeInfo.storeName", 0] },
        },
      },
      {
        $lookup: {
          from: "colors",
          localField: "colors",
          foreignField: "_id",
          as: "colors",
        },
      },
      {
        $lookup: {
          from: "productsizes",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$productId", "$$productId"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
            {
              $project: {
                size: 1,
                quantity: 1,
              },
            },
          ],
          as: "productSizes",
        },
      },
      {
        $project: {
          storeInfo: 0,
        },
      },
    ];

    const product = await Product.aggregate(pipeline);

    if (!product || product.length === 0) {
      return sendResponse(res, 404, false, "Product not found");
    }

    return sendResponse(
      res,
      200,
      true,
      "Product fetched successfully",
      product[0]
    );
  } catch (error) {
    console.error("Get Product By ID Error:", error);
    return sendResponse(res, 500, false, "Error fetching product");
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const {
      name,
      description,
      category,
      subcategory,
      sellingPrice,
      originalPrice,
      sizeChart,
      brandName,
      colors,
    } = req.body;

    const sellerId = req.id;

    if (!mongoose.isValidObjectId(productId)) {
      return sendResponse(res, 400, false, "Invalid Product ID");
    }

    let product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return sendResponse(res, 404, false, "Product not found or is deleted");
    }

    const updatedFields = {
      updatedBy: sellerId,
    };

    if (name) updatedFields.name = name;

    if (description) updatedFields.description = description;
    if (mongoose.isValidObjectId(category)) updatedFields.category = category;
    if (mongoose.isValidObjectId(subcategory))
      updatedFields.subcategory = subcategory;
    if (sellingPrice != null) updatedFields.sellingPrice = sellingPrice;
    if (originalPrice != null) updatedFields.originalPrice = originalPrice;
    if (sizeChart) updatedFields.sizeChart = sizeChart;
    if (brandName) updatedFields.brandName = brandName;
    if (colors) updatedFields.colors = colors;

    if (req.files && req.files["primaryImage"]) {
      const imagePath = req.files["primaryImage"][0].path;
      const imageResult = await cloudinary.uploader.upload(imagePath, {
        folder: "uploads/products/images",
        resource_type: "image",
      });
      updatedFields.primaryImage = imageResult.secure_url;
      fs.unlinkSync(imagePath);
    }

    let productImages = [];
    if (req.files && req.files["images"]) {
      for (let file of req.files["images"]) {
        const imagePath = file.path;
        const imageResult = await cloudinary.uploader.upload(imagePath, {
          folder: "uploads/products/images",
          resource_type: "image",
        });
        productImages.push({ imageUrl: imageResult.secure_url });
        fs.unlinkSync(imagePath);
      }
    }

    if (category && !mongoose.isValidObjectId(category)) {
      return sendResponse(res, 400, false, "Invalid Category ID");
    }

    if (subcategory && !mongoose.isValidObjectId(subcategory)) {
      return sendResponse(res, 400, false, "Invalid Subcategory ID");
    }

    product = await Product.findByIdAndUpdate(productId, updatedFields, {
      new: true,
    });

    if (productImages.length > 0) {
      await ProductImage.deleteMany({ product: productId });

      for (const image of productImages) {
        await ProductImage.create({
          product: productId,
          imageUrl: image.imageUrl,
          createdBy: sellerId,
        });
      }
    }

    const updatedProduct = await Product.findById(productId).lean();
    const images = await ProductImage.find({
      product: productId,
      isDeleted: false,
    }).lean();

    return sendResponse(res, 200, true, "Product updated successfully", {
      ...updatedProduct,
      images,
    });
  } catch (error) {
    console.error("Update Product Error:", error);
    return sendResponse(res, 500, false, "Error updating product");
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const sellerId = req.id;

    if (!mongoose.isValidObjectId(productId)) {
      return sendResponse(res, 400, false, "Invalid Product ID");
    }

    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return sendResponse(
        res,
        404,
        false,
        "Product not found or already deleted"
      );
    }

    product.isDeleted = true;
    product.deletedBy = sellerId;
    await product.save();

    await ProductImage.updateMany(
      { product: productId },
      { $set: { isDeleted: true, deletedBy: sellerId } }
    );

    return sendResponse(res, 200, true, "Product deleted successfully");
  } catch (error) {
    console.error("Delete Product Error:", error);
    return sendResponse(res, 500, false, "Error deleting product");
  }
};

export const statusProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return sendResponse(res, 400, false, "Invalid Product ID");
    }

    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return sendResponse(res, 404, false, "Product not found or is deleted");
    }

    product.status = !product.status;
    await product.save();

    return sendResponse(res, 200, true, "Product status toggled successfully", {
      productId: product._id,
      status: product.status,
    });
  } catch (error) {
    console.error("Toggle Product Status Error:", error);
    return sendResponse(res, 500, false, "Error toggling product status");
  }
};

export const universalProductList = async (req, res) => {
  try {
    const {
      city,
      categories,
      subcategories,
      sizes,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
      random,
      page,
      limit,
      colors,
      storeId,
    } = req.body;

    if (!city) {
      return sendResponse(res, 400, false, "City is required");
    }

    const pipeline = [];

    pipeline.push({
      $lookup: {
        from: "customeraddresses",
        let: { productCity: city },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$city", "$$productCity"] },
                  { $eq: ["$is_deleted", false] },
                ],
              },
            },
          },
        ],
        as: "cityMatch",
      },
    });

    pipeline.push({ $match: { cityMatch: { $ne: [] } } });

    pipeline.push({ $match: { isDeleted: false } });

    if (categories?.length) {
      const categoryObjectIds = categories.map(
        (id) => new mongoose.Types.ObjectId(id)
      );

      pipeline.push({
        $match: {
          category: { $in: categoryObjectIds },
        },
      });
    }

    if (subcategories?.length) {
      const subcategoryObjectIds = subcategories.map(
        (id) => new mongoose.Types.ObjectId(id)
      );

      pipeline.push({
        $match: {
          subcategory: { $in: subcategoryObjectIds },
        },
      });
    }

    if (colors) {
      pipeline.push({
        $match: {
          colors: new mongoose.Types.ObjectId(colors),
        },
      });
    }

    if (storeId) {
      const storeIdObjectIds = storeId.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      pipeline.push({
        $match: {
          storeId: { $in: storeIdObjectIds },
        },
      });
    }

    if (minPrice !== undefined && maxPrice !== undefined) {
      pipeline.push({
        $match: {
          sellingPrice: { $gte: minPrice, $lte: maxPrice },
        },
      });
    } else if (minPrice !== undefined) {
      pipeline.push({ $match: { sellingPrice: { $gte: minPrice } } });
    } else if (maxPrice !== undefined) {
      pipeline.push({ $match: { sellingPrice: { $lte: maxPrice } } });
    }

    pipeline.push(
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: { path: "$category", preserveNullAndEmptyArrays: true },
      }
    );

    pipeline.push(
      {
        $lookup: {
          from: "subcategories",
          localField: "subcategory",
          foreignField: "_id",
          as: "subcategory",
        },
      },
      {
        $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true },
      }
    );

    pipeline.push(
      {
        $lookup: {
          from: "sizecharts",
          localField: "sizeChart",
          foreignField: "_id",
          as: "sizeChart",
        },
      },
      {
        $unwind: { path: "$sizeChart", preserveNullAndEmptyArrays: true },
      }
    );

    pipeline.push({
      $lookup: {
        from: "productimages",
        let: { productId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$product", "$$productId"] },
                  { $eq: ["$isDeleted", false] },
                ],
              },
            },
          },
          { $project: { imageUrl: 1 } },
        ],
        as: "images",
      },
    });

    pipeline.push({
      $lookup: {
        from: "colors",
        localField: "colors",
        foreignField: "_id",
        as: "colors",
      },
    });

    pipeline.push({
      $lookup: {
        from: "productsizes",
        localField: "_id",
        foreignField: "productId",
        as: "productSizes",
      },
    });

    pipeline.push({
      $addFields: {
        productSizes: {
          $filter: {
            input: "$productSizes",
            as: "ps",
            cond: { $eq: ["$$ps.isDeleted", false] },
          },
        },
      },
    });

    pipeline.push(
      {
        $lookup: {
          from: "storeinfos",
          let: { sellerId: "$seller" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$sellerAuthId", "$$sellerId"] },
                    { $eq: ["$is_deleted", false] },
                    { $eq: ["$isActive", true] },
                  ],
                },
              },
            },
            {
              $project: { _id: 1, storeName: 1 },
            },
          ],
          as: "storeInfo",
        },
      },
      {
        $addFields: {
          storeId: { $arrayElemAt: ["$storeInfo._id", 0] },
          storeName: { $arrayElemAt: ["$storeInfo.storeName", 0] },
        },
      },
      {
        $project: {
          storeInfo: 0,
        },
      }
    );
    if (sizes?.length) {
      pipeline.push({
        $match: {
          "productSizes.size": { $in: sizes },
        },
      });
    }
    if (random) {
      pipeline.push({
        $addFields: { randomSortKey: { $rand: {} } },
      });
      pipeline.push({ $sort: { randomSortKey: 1 } });
    } else {
      let sortField = "createdAt";

      if (sortBy === "price") {
        sortField = "sellingPrice";
      } else if (sortBy) {
        sortField = sortBy;
      }

      const order = sortOrder === "asc" ? 1 : -1;
      pipeline.push({ $sort: { [sortField]: order } });
    }

    // Pagination logic
    if (!random && page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });
    }

    const products = await Product.aggregate(pipeline);

    return sendResponse(res, 200, true, "Products fetched successfully", {
      total: products.length,
      products,
    });
  } catch (error) {
    console.error("Universal Product List Error:", error);
    return sendResponse(res, 500, false, error.message);
  }
};

export const homePageProductList = async (req, res) => {
  try {
    const { page, limit, category } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    const matchStage = {
      isDeleted: false,
    };

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      matchStage.category = new mongoose.Types.ObjectId(category);
    }

    const pipeline = [
      { $match: matchStage },
      { $sample: { size: 1000000 } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "subcategories",
          localField: "subcategory",
          foreignField: "_id",
          as: "subcategory",
        },
      },
      {
        $unwind: {
          path: "$subcategory",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "sizecharts",
          localField: "sizeChart",
          foreignField: "_id",
          as: "sizeChart",
        },
      },
      {
        $unwind: {
          path: "$sizeChart",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "productimages",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$product", "$$productId"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
            { $project: { imageUrl: 1 } },
          ],
          as: "images",
        },
      },
      {
        $lookup: {
          from: "storeinfos",
          let: { sellerId: "$seller" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$sellerAuthId", "$$sellerId"] },
                    { $eq: ["$is_deleted", false] },
                    { $eq: ["$isActive", true] },
                  ],
                },
              },
            },
            {
              $project: { _id: 1, storeName: 1 },
            },
          ],
          as: "storeInfo",
        },
      },
      {
        $lookup: {
          from: "colors",
          localField: "colors",
          foreignField: "_id",
          as: "colors",
        },
      },
      {
        $addFields: {
          storeId: { $arrayElemAt: ["$storeInfo._id", 0] },
          storeName: { $arrayElemAt: ["$storeInfo.storeName", 0] },
        },
      },
      {
        $project: {
          storeInfo: 0,
        },
      },
    ];

    const paginatedPipeline = [...pipeline];
    if (
      !isNaN(parsedPage) &&
      parsedPage > 0 &&
      !isNaN(parsedLimit) &&
      parsedLimit > 0
    ) {
      const skip = (parsedPage - 1) * parsedLimit;
      paginatedPipeline.push({ $skip: skip }, { $limit: parsedLimit });
    }

    const [products, totalCount] = await Promise.all([
      Product.aggregate(paginatedPipeline),
      Product.countDocuments(matchStage),
    ]);

    return sendResponse(res, 200, true, "Products fetched successfully", {
      total: totalCount,
      page: parsedPage || null,
      limit: parsedLimit || null,
      products,
    });
  } catch (error) {
    console.error("Home Page Product List Error:", error);
    return sendResponse(res, 500, false, "Something went wrong");
  }
};

export const globalSearch = async (req, res) => {
  try {
    const { search, page, limit, city } = req.body;

    if (!search || search.trim() === "") {
      return sendResponse(res, 400, false, "search is required");
    }

    const regex = new RegExp(search.trim(), "i");
    const skip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : 0;
    const pagination = page && limit;

    const productPipeline = [
      { $match: { isDeleted: false, name: { $regex: regex } } },
      ...(city
        ? [
            {
              $lookup: {
                from: "customeraddresses",
                let: { productCity: city },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$city", "$$productCity"] },
                          { $eq: ["$is_deleted", false] },
                        ],
                      },
                    },
                  },
                ],
                as: "cityMatch",
              },
            },
            { $match: { cityMatch: { $ne: [] } } },
          ]
        : []),

      { $match: { isDeleted: false } },

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

      // JOIN subcategory
      {
        $lookup: {
          from: "subcategories",
          localField: "subcategory",
          foreignField: "_id",
          as: "subcategory",
        },
      },
      { $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },

      // JOIN size chart
      {
        $lookup: {
          from: "sizecharts",
          localField: "sizeChart",
          foreignField: "_id",
          as: "sizeChart",
        },
      },
      { $unwind: { path: "$sizeChart", preserveNullAndEmptyArrays: true } },

      // JOIN images
      {
        $lookup: {
          from: "productimages",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$product", "$$productId"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
            { $project: { imageUrl: 1 } },
          ],
          as: "images",
        },
      },

      // JOIN colors
      {
        $lookup: {
          from: "colors",
          localField: "colors",
          foreignField: "_id",
          as: "colors",
        },
      },

      // JOIN sizes
      {
        $lookup: {
          from: "productsizes",
          localField: "_id",
          foreignField: "productId",
          as: "productSizes",
        },
      },
      {
        $addFields: {
          productSizes: {
            $filter: {
              input: "$productSizes",
              as: "ps",
              cond: { $eq: ["$$ps.isDeleted", false] },
            },
          },
        },
      },

      // JOIN store info
      {
        $lookup: {
          from: "storeinfos",
          let: { sellerId: "$seller" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$sellerAuthId", "$$sellerId"] },
                    { $eq: ["$is_deleted", false] },
                    { $eq: ["$isActive", true] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                storeName: 1,
                storeLogo: 1,
                coverPhoto: 1,
                city: 1,
              },
            },
          ],
          as: "storeInfo",
        },
      },
      {
        $addFields: {
          storeId: { $arrayElemAt: ["$storeInfo._id", 0] },
          storeName: { $arrayElemAt: ["$storeInfo.storeName", 0] },
          storeLogo: { $arrayElemAt: ["$storeInfo.storeLogo", 0] },
          coverPhoto: { $arrayElemAt: ["$storeInfo.coverPhoto", 0] },
          storeCity: { $arrayElemAt: ["$storeInfo.city", 0] },
        },
      },
      {
        $project: {
          storeInfo: 0,
        },
      },

      // Pagination
      ...(pagination ? [{ $skip: skip }, { $limit: parseInt(limit) }] : []),
    ];

    const [products, categories, subcategories, stores] = await Promise.all([
      Product.aggregate(productPipeline).then((res) =>
        res.map((p) => ({ ...p, productType: "Product" }))
      ),

      Category.find({ isDeleted: false, name: { $regex: regex } })
        .lean()
        .then((res) =>
          pagination ? res.slice(skip, skip + parseInt(limit)) : res
        )
        .then((res) => res.map((c) => ({ ...c, productType: "Category" }))),

      Subcategory.find({ isDeleted: false, name: { $regex: regex } })
        .lean()
        .then((res) =>
          pagination ? res.slice(skip, skip + parseInt(limit)) : res
        )
        .then((res) => res.map((s) => ({ ...s, productType: "Subcategory" }))),

      StoreInfo.find({
        is_deleted: false,
        isActive: true,
        storeName: { $regex: regex },
      })
        .select(
          "_id storeName storeLogo coverPhoto city address phone email isOpen"
        )
        .lean()
        .then((res) =>
          pagination ? res.slice(skip, skip + parseInt(limit)) : res
        )
        .then((res) => res.map((s) => ({ ...s, productType: "Store" }))),
    ]);

    const results = [...products, ...categories, ...subcategories, ...stores];

    return sendResponse(res, 200, true, "Search results", {
      total: results.length,
      ...(pagination && { page: parseInt(page), limit: parseInt(limit) }),
      results,
    });
  } catch (error) {
    console.error("Global Search Error:", error);
    return sendResponse(res, 500, false, "Something went wrong");
  }
};

