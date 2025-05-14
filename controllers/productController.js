import { sendResponse } from "../common/index.js";
import { Product } from "../models/product.model.js";
import { ProductImage } from "../models/productImage.model.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import mongoose from "mongoose"

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      description,
      category,
      subcategory,
      sellingPrice,
      originalPrice,
      sizeChart,
      brandName
    } = req.body;
    const sellerId = req.id;

    // 🔍 Validate required fields
    if (
      !name ||
      !sku ||
      !description ||
      !category ||
      !subcategory ||
      !sellingPrice ||
      !brandName ||
      !sizeChart
    ) {
      return sendResponse(res, 400, false, 'All fields are required');
    }

    // Check for existing SKU
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      return sendResponse(res, 400, false, 'Product with this SKU already exists');
    }

    let primaryImageUrl = "";
    let productImages = [];

    // ✅ Primary image required check
    if (!req.files || !req.files['primaryImage']) {
      return sendResponse(res, 400, false, 'Primary image is required');
    }

    // Upload primary image
    const imagePath = req.files['primaryImage'][0].path;
    const imageResult = await cloudinary.uploader.upload(imagePath, {
      folder: "uploads/products/images",
      resource_type: "image",
    });
    primaryImageUrl = imageResult.secure_url;
    fs.unlinkSync(imagePath);

    // Upload additional images
    if (req.files['images']) {
      for (let file of req.files['images']) {
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

    // Create product
    const newProduct = await Product.create({
      name: name.trim(),
      sku: sku.trim(),
      brandName: brandName.trim(),
      description: description.trim(),
      category,
      subcategory,
      sellingPrice,
      originalPrice: originalPrice || 0,
      sizeChart,
      seller: sellerId,
      primaryImage: primaryImageUrl,
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

    return sendResponse(res, 201, true, 'Product created successfully', newProduct);
  } catch (error) {
    console.error('Create Product Error:', error);
    return sendResponse(res, 500, false, 'Error creating product');
  }
};

export const getProducts = async (req, res) => {
  try {
    const {
      search = "",
      category,
      brandName,
      page,
      limit,
    } = req.query;

    const matchStage = { isDeleted: false };
    const pipeline = [{ $match: matchStage }];

    if (search) {
      pipeline.push({
        $match: {
          name: { $regex: search, $options: "i" },
        },
      });
    }

    // Apply category filter BEFORE lookup using $toObjectId
    if (category) {
      pipeline.push({
        $match: {
          $expr: {
            $eq: ["$category", { $toObjectId: category }]
          }
        }
      });
    }

    // Category Lookup
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
    preserveNullAndEmptyArrays: true 
  } 
},
    );

    // Subcategory Lookup
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
  $unwind: {
    path: "$subcategory",
    preserveNullAndEmptyArrays: true
  }
}
    );

    // Brand Name Filter (string)
    if (brandName) {
      pipeline.push({
        $match: {
          brandName: brandName,
        },
      });
    }

    // Size Chart Lookup
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
        $unwind: {
          path: "$sizeChart",
          preserveNullAndEmptyArrays: true,
        },
      }
    );

    // Images Lookup
    pipeline.push(
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
      }
    );

    pipeline.push({ $sort: { createdAt: -1 } });

    // Pagination
    if (page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const limitNumber = parseInt(limit);
      pipeline.push({ $skip: skip }, { $limit: limitNumber });
    }

    const [products, total] = await Promise.all([
      Product.aggregate(pipeline),
      Product.countDocuments(matchStage),
    ]);

    return sendResponse(res, 200, true, "Products fetched successfully", {
      total,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : total,
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

    // Validate ObjectId string
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return sendResponse(res, 400, false, "Invalid Product ID");
    }

    const pipeline = [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ["$_id", { $toObjectId: productId }] },
              { $eq: ["$isDeleted", false] }
            ]
          }
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category"
        }
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "subcategories",
          localField: "subcategory",
          foreignField: "_id",
          as: "subcategory"
        }
      },
      {
        $unwind: {
          path: "$subcategory",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "sizecharts",
          localField: "sizeChart",
          foreignField: "_id",
          as: "sizeChart"
        }
      },
      {
        $unwind: {
          path: "$sizeChart",
          preserveNullAndEmptyArrays: true
        }
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
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            },
            {
              $project: {
                imageUrl: 1
              }
            }
          ],
          as: "images"
        }
      }
    ];

    const product = await Product.aggregate(pipeline);

    if (!product || product.length === 0) {
      return sendResponse(res, 404, false, "Product not found");
    }

    return sendResponse(res, 200, true, "Product fetched successfully", product[0]);
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
      sku,
      description,
      category,
      subcategory,
      sellingPrice,
      originalPrice,
      sizeChart,
      brandName,
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
      name,
      sku,
      description,
      category,
      subcategory,
      sellingPrice,
      originalPrice,
      sizeChart,
      brandName,
      updatedBy: sellerId,
    };

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

    product = await Product.findByIdAndUpdate(productId, updatedFields, { new: true });

    await ProductImage.deleteMany({ product: productId });

    if (productImages.length > 0) {
      for (const image of productImages) {
        await ProductImage.create({
          product: productId,
          imageUrl: image.imageUrl,
          createdBy: sellerId,
        });
      }
    }

    const updatedProduct = await Product.findById(productId).lean();
    const images = await ProductImage.find({ product: productId, isDeleted: false }).lean();

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
      return sendResponse(res, 404, false, "Product not found or already deleted");
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
      sortBy,
      sortOrder,
      random,
      page,
      limit
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
                  { $eq: ["$is_deleted", false] }
                ]
              }
            }
          }
        ],
        as: "cityMatch"
      }
    });

    pipeline.push({ $match: { cityMatch: { $ne: [] } } });

    pipeline.push({ $match: { isDeleted: false } });
  
    if (categories?.length) {
        const categoryObjectIds = categories.map(id => new mongoose.Types.ObjectId(id));

      pipeline.push({
        $match: {
          category: { $in: categoryObjectIds }
        }
      });
    }

    if (subcategories?.length) {
        const subcategoryObjectIds = subcategories.map(id => new mongoose.Types.ObjectId(id));

      pipeline.push({
        $match: {
          subcategory: { $in: subcategoryObjectIds }
        }
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category"
        }
      },
      {
        $unwind: { path: "$category", preserveNullAndEmptyArrays: true }
      }
    );

    pipeline.push(
      {
        $lookup: {
          from: "subcategories",
          localField: "subcategory",
          foreignField: "_id",
          as: "subcategory"
        }
      },
      {
        $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true }
      }
    );

    pipeline.push(
      {
        $lookup: {
          from: "sizecharts",
          localField: "sizeChart",
          foreignField: "_id",
          as: "sizeChart"
        }
      },
      {
        $unwind: { path: "$sizeChart", preserveNullAndEmptyArrays: true }
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
                  { $eq: ["$isDeleted", false] }
                ]
              }
            }
          },
          { $project: { imageUrl: 1 } }
        ],
        as: "images"
      }
    });

    if (random) {
      pipeline.push({
        $addFields: { randomSortKey: { $rand: {} } }
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
      pipeline.push(
        { $skip: skip },
        { $limit: parseInt(limit) }
      );
    }

    const products = await Product.aggregate(pipeline);

    return sendResponse(res, 200, true, "Products fetched successfully", {
      total: products.length,
      products
    });

  } catch (error) {
    console.error("Universal Product List Error:", error);
    return sendResponse(res, 500, false, "Server error", error.message);
  }
};


