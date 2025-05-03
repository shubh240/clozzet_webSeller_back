import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import { SubCategory } from "../models/subCategories.model.js";
import { Category } from "../models/category.model.js";
import { nanoid } from "nanoid";

export const addSubCategory = async (req, res) => {
  try {
   const {
     subCategoryName,
     subCategoryStatus,
     subCategorySizeChart, // structured
     mainCategoryName,
     gender,
     categoryType,
   } = req.body;


    const sellerId = req.id;
    console.log(`sellerId: ${sellerId}`);
    console.log(`subCategoryName: ${subCategoryName}`);
    console.log(`mainCategoryName: ${mainCategoryName}`);
    console.log(`gender: ${gender}`);

    if (!mainCategoryName) {
      return res.status(400).json({
        success: false,
        message: "Select a Main category.",
      });
    }

    const mainCategory = await Category.findOne({
      categoryName: mainCategoryName,
    });

    if (!mainCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    

    // Check if product name already exists
    const existing = await SubCategory.findOne({ subCategoryName });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Sub Category with this name already exists.",
      });
    }

    let parsedSizeChart = [];
    if (subCategorySizeChart) {
      try {
        parsedSizeChart = JSON.parse(subCategorySizeChart);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid size chart format",
        });
      }
    }


    const prefix = (mainCategory.categoryName || "").slice(0, 3).toUpperCase();
    const subCategoryId = `${prefix}-${nanoid(4)}`;


    let imageUrl = "";
    let subCategorySizeChartUrl= "";

    console.log("Files received:", req.files);

    // Upload image if available

    if (req.files["image"]) {
      const imagePath = req.files["image"][0].path;
      const imageResult = await cloudinary.uploader.upload(imagePath, {
        folder: "uploads/subCategories/images",
        resource_type: "image",
      });
      imageUrl = imageResult.secure_url;
      fs.unlinkSync(imagePath); // Delete local file after upload
    }
    // Upload image if available

    if (req.files["sizeChart"]) {
      const imagePath = req.files["sizeChart"][0].path;
      const imageResult = await cloudinary.uploader.upload(imagePath, {
        folder: "uploads/subCategories/sizeCharts",
        resource_type: "image",
      });
      subCategorySizeChartUrl = imageResult.secure_url;
      fs.unlinkSync(imagePath); // Delete local file after upload
    }

    const newItem = await SubCategory.create({
      subCategoryId,
      subCategoryName,
      subCategoryStatus,
      subCategorySizeChart: parsedSizeChart, // store structured chart
      subCategorySizeChartUrl,
      mainCategoryId: mainCategory._id,
      subCategoryImageUrl: imageUrl,
      sellerId,
      gender,
      categoryType,
    });
    
    return res.status(201).json({
      success: true,
      message: "Sub Category added successfully.",
      newItem,
    });
  } catch (error) {
    console.error("Sub Category error:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding Sub Category.",
    });
  }
};

export const getAllSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find().populate(
      "mainCategoryId",
      "categoryName customId"
    );
    res.status(200).json({
      success: true,
      count: subCategories.length,
      subCategories,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sub categories",
    });
  }
};

export const getSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const subCategory = await SubCategory.findById(id).populate(
      "mainCategoryId",
      "categoryName customId"
    );

    if (!subCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Sub category not found" });
    }

    res.status(200).json({ success: true, subCategory });
  } catch (error) {
    console.error("Get by ID error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch sub category" });
  }
};

export const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log("files received:", req.body);
     const mainCategory = await Category.findOne({
       categoryName: updateData.mainCategoryName,
     });

     if (!mainCategory) {
       return res.status(404).json({ message: "Category not found" });
     }

     updateData.mainCategoryId = mainCategory._id;

    let updatedItem = await SubCategory.findById(id);
       if (!updatedItem) {
         return res.status(404).json({
           message: "Sub Category not found.",
           success: false,
         });
       }
       console.log("files received:", req.files);
       // 📷 Upload new image if available
       if (req.files["image"]) {
         if (updatedItem.subCategoryImageUrl && updatedItem.subCategoryImageUrl.length > 0) {
           const oldImagePublicId = updatedItem.subCategoryImageUrl[0]
             .split("/")
             .pop()
             .split(".")[0];
   
           await cloudinary.uploader.destroy(
             `uploads/subCategories/images/${oldImagePublicId}`
           );
         }
   
         const imagePath = req.files["image"][0].path;
         const imageResult = await cloudinary.uploader.upload(imagePath, {
           folder: "uploads/subCategories/images",
           resource_type: "image",
         });
   
         updateData.subCategoryImageUrl = [imageResult.secure_url];
         fs.unlinkSync(imagePath);
       }

       if (req.files["sizeChart"]) {
         if (
           updatedItem.subCategorySizeChartUrl &&
           updatedItem.subCategorySizeChartUrl.length > 0
         ) {
           const oldImagePublicId = updatedItem.subCategorySizeChartUrl[0]
             .split("/")
             .pop()
             .split(".")[0];

           await cloudinary.uploader.destroy(
             `uploads/subCategories/sizeCharts/${oldImagePublicId}`
           );
         }

         const imagePath = req.files["sizeChart"][0].path;
         const imageResult = await cloudinary.uploader.upload(imagePath, {
           folder: "uploads/subCategories/sizeCharts",
           resource_type: "image",
         });

         updateData.subCategorySizeChartUrl = [imageResult.secure_url];
         fs.unlinkSync(imagePath);
       }
  
       // ✅ Update the product with new data
       updatedItem = await SubCategory.findByIdAndUpdate(id, updateData, {
         new: true,
         runValidators: true,
       });
   
       return res.status(200).json({
         message: "Sub Category updated successfully.",
         success: true,
         updatedItem,
       });
  } catch (error) {
    console.error("Update error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update sub category" });
  }
};

export const toggleSubCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("subCategoryId", id);

    const subCategory = await SubCategory.findOne({ _id: id });
    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    subCategory.subCategoryStatus = !subCategory.subCategoryStatus;
    await subCategory.save();

    res.status(200).json({
      message: "SubCategory status updated",
      subCategoryStatus: subCategory.subCategoryStatus,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating subCategory status",
      error: error.message,
    });
  }
};

export const toggleSubCategoryFeatured = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("subCategoryId", id);

    const subCategory = await SubCategory.findOne({ _id: id });
    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    subCategory.featured = !subCategory.featured;
    await subCategory.save();

    res.status(200).json({
      message: "SubCategory featured status updated",
      featured: subCategory.featured,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating subCategory featured status",
      error: error.message,
    });
  }
};


export const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await SubCategory.findByIdAndDelete(id);

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Sub category not found" });
    }

    res.status(200).json({ success: true, message: "Sub category deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete sub category" });
  }
};

export const getSubCategoriesByMainCategory = async (req, res) => {
  try {
    const { mainCategoryId } = req.params;

    const subCategories = await SubCategory.find({ mainCategoryId });

    res.status(200).json({
      success: true,
      count: subCategories.length,
      subCategories,
    });
  } catch (error) {
    console.error("Fetch by main category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sub categories by main category",
    });
  }
};


