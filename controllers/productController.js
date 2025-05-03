import { Product } from "../models/product.model.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

// Add Item API with Image and Video Upload

// Controller: uploadProductMedia.js
export const uploadProductMedia = async (req, res) => {
  try {
    let imageUrls = [];
    let videoUrl = "";

    // ✅ Parse old media for deletion (if editing)
    const oldImageUrls = req.body.oldImageUrls
      ? JSON.parse(req.body.oldImageUrls)
      : [];
    const oldVideoUrl = req.body.oldVideoUrl || "";

    // 🧹 Delete old images if new ones are uploaded
    if (req.files["images"] && oldImageUrls.length > 0) {
      for (const imageUrl of oldImageUrls) {
        const publicId = imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(
          `uploads/products/images/${publicId}`
        );
      }
    }

    // 🧹 Delete old video if a new one is uploaded
    if (req.files["video"] && oldVideoUrl) {
      const oldVideoPublicId = oldVideoUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(
        `uploads/products/videos/${oldVideoPublicId}`,
        {
          resource_type: "video",
        }
      );
    }

    // 📤 Upload new images
    if (req.files["images"]) {
      for (let file of req.files["images"]) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "uploads/products/images",
          resource_type: "image",
        });
        imageUrls.push(result.secure_url);
        fs.unlinkSync(file.path);
      }
    }

    // 📤 Upload new video
    if (req.files["video"]) {
      const videoPath = req.files["video"][0].path;
      const result = await cloudinary.uploader.upload(videoPath, {
        folder: "uploads/products/videos",
        resource_type: "video",
      });
      videoUrl = result.secure_url;
      fs.unlinkSync(videoPath);
    }

    return res.status(200).json({
      success: true,
      imageUrls,
      videoUrl,
    });
  } catch (error) {
    console.error("Upload media error:", error);
    return res.status(500).json({ success: false, message: "Upload failed." });
  }
};



export const addItem = async (req, res) => {
  try {
    const {
      name,
      category,
      subcategory,
      shortDesc,
      detailedDesc,
      tags,
      brand,
      sku,
      sellingPrice,
      originalPrice,
      discountType,
      discountValue,
      taxIncluded,
      taxValue,
      stock,
      stockStatus,
      returnPolicy,
      visibility,
      seoKeywords,
      buyerNotes,
      status,
    } = req.body;

    const userId = req.id;

    // Check if product name already exists
    const existing = await Product.findOne({ name });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Item with this name already exists.",
      });
    }

   const imageUrls = Array.isArray(req.body.imageUrls)
     ? req.body.imageUrls
     : [req.body.imageUrls];

   const videoUrl = req.body.videoUrl || "";

    const newItem = await Product.create({
      name,
      category,
      subcategory,
      shortDesc,
      detailedDesc,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      brand,
      sku,
      sellingPrice,
      originalPrice,
      discountType,
      discountValue,
      taxIncluded: taxIncluded === "true" || taxIncluded === true,
      taxValue,
      stock: stock ? JSON.parse(stock) : {},
      stockStatus,
      imageUrls, // ✅ Array of image URLs
      videoUrl,
      returnPolicy,
      visibility: visibility ? JSON.parse(visibility) : {},
      seoKeywords,
      buyerNotes,
      status,
      userId,
    });

    return res.status(201).json({
      success: true,
      message: "Item added successfully.",
      newItem,
    });
  } catch (error) {
    console.error("Add item error:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding item.",
    });
  }
};



// Get All Items API
export const getAllItems = async (req, res) => {
  try {
    const userId = req.id;
    const allItems = await Product.find({ userId: userId });
    return res.status(200).json({
      success: true,
      items: allItems,
    });
  } catch (error) {
    console.error(`Get all Items error: ${error}`);
    res.status(500).json({
      message: "Error fetching items.",
      success: false,
      error
    });
  }
};

// Edit Item API with Image and Video Upload

export const editItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    let updatedItem = await Product.findById(id);
    if (!updatedItem) {
      return res.status(404).json({
        message: "Item not found.",
        success: false,
      });
    }

    // ✅ Parse stock, visibility, tags
    if (typeof updateData.stock === "string") {
      try {
        updateData.stock = JSON.parse(updateData.stock);
      } catch {
        return res
          .status(400)
          .json({ message: "Invalid stock format.", success: false });
      }
    }

    if (typeof updateData.visibility === "string") {
      try {
        updateData.visibility = JSON.parse(updateData.visibility);
      } catch {
        return res
          .status(400)
          .json({ message: "Invalid visibility format.", success: false });
      }
    }

    if (typeof updateData.tags === "string") {
      updateData.tags = updateData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    // 🔁 Final update
    updatedItem = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      message: "Item updated successfully.",
      success: true,
      updatedItem,
    });
  } catch (error) {
    console.error(`Edit Item error: ${error}`);
    res.status(500).json({
      message: "Error updating item.",
      success: false,
    });
  }
};

export const toggleVisibility = async (req, res) => {
  const { id } = req.params;
  const { field, value } = req.body;

  if (!["newArrival", "trending", "hidden"].includes(field)) {
    return res.status(400).json({ message: "Invalid field" });
  }

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.visibility[field] = value;
    await product.save();

    res.status(200).json({ message: "Visibility updated", product });
  } catch (error) {
    console.log("Error in toggleVisibility:", error)
    res.status(500).json({ message: "Server error", error });
  }
};



// Delete Item API with Image and Video Deletion
export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    // Find item by ID to get image and video URLs
    const deletedItem = await Product.findByIdAndDelete(id);

    if (!deletedItem) {
      return res.status(404).json({
        message: "Item not found.",
        success: false,
      });
    }

    // Delete image from Cloudinary if exists
   if (Array.isArray(deletedItem.imageUrl)) {
     for (const url of deletedItem.imageUrl) {
       if (typeof url === "string") {
         const publicId = url.split("/").pop().split(".")[0];

         await cloudinary.uploader.destroy(
           `uploads/products/images/${publicId}`
         );
       }
     }
   }


    // Delete video from Cloudinary if exists
    if (deletedItem.videoUrl) {
      const oldVideoPublicId = deletedItem.videoUrl
        .split("/")
        .pop()
        .split(".")[0];
      await cloudinary.uploader.destroy(
        `uploads/products/videos/${oldVideoPublicId}`,
        {
          resource_type: "video",
        }
      );
    }

    return res.status(200).json({
      message: "Item deleted successfully.",
      success: true,
      deletedItem,
    });
  } catch (error) {
    console.error(`Delete Item error: ${error}`);
    res.status(500).json({
      message: "Error deleting item.",
      success: false,
    });
  }
};
