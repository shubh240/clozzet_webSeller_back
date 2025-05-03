import { Store } from "../models/store.model.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

// Add Item API with Image and Video Upload
export const addStore = async (req, res) => {
  try {
    const { name, address, phoneNo } = req.body;
    const createdBy = req.id;
    console.log("Created by:", req.id);

 

    // Check if store name already exists
    let gotStore = await Store.findOne({ name });
    if (gotStore) {
      return res.status(400).json({
        message: "Store with this name already exists.",
        success: false,
      });
    }

    let logoUrl = "";
    let coverPhotoUrl = "";

    console.log("Files received:", req.files);

    // Upload logo if available

    if (req.files["logo"]) {
      const imagePath = req.files["logo"][0].path;
      const imageResult = await cloudinary.uploader.upload(imagePath, {
        folder: "uploads/stores/logos",
        resource_type: "image",
      });
      logoUrl = imageResult.secure_url;
      console.log(`Logo url : ${logoUrl}`);
      fs.unlinkSync(imagePath); // Delete local file after upload
    }
    // Upload cover photo if available

    if (req.files["coverPhoto"]) {
      const imagePath = req.files["coverPhoto"][0].path;
      const imageResult = await cloudinary.uploader.upload(imagePath, {
        folder: "uploads/stores/coverPhotos",
        resource_type: "image",
      });
      coverPhotoUrl = imageResult.secure_url;
      //console.log(`cover photo url : ${coverPhotoUrl}`);
      fs.unlinkSync(imagePath); // Delete local file after upload
    }

    // Create new store
    const newStore = await Store.create({
      name,
      address,
      phoneNo,
      logoUrl,
      coverPhotoUrl,
      createdBy,
    });

    return res.status(201).json({
      message: "Store added successfully.",
      success: true,
      newStore,
    });
  } catch (error) {
    console.error(`Add Store error: ${error}`);
    res.status(500).json({
      message: "Error adding store.",
      success: false,
    });
  }
};

// Get All Stores API
export const getAllStores = async (req, res) => {
  try {
    const allStores = await Store.find();
    return res.status(200).json({
      success: true,
      items: allStores,
    });
  } catch (error) {
    console.error(`Get all stores error: ${error}`);
    res.status(500).json({
      message: "Error fetching stores.",
      success: false,
    });
  }
};

// Edit Store API
export const editStore = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    let updatedItem = await Store.findById(id);
    if (!updatedItem) {
      return res.status(404).json({
        message: "Store not found.",
        success: false,
      });
    }

    // Upload new logo if available
    if (req.files["logo"]) {
      // Delete old logo from Cloudinary
      if (updatedItem.logoUrl) {
        const oldImagePublicId = updatedItem.logoUrl
          .split("/")
          .pop()
          .split(".")[0];
        await cloudinary.uploader.destroy(
          `uploads/stores/logos/${oldImagePublicId}`
        );
      }

      // Upload new logo
      const imagePath = req.files["logo"][0].path;
      const imageResult = await cloudinary.uploader.upload(imagePath, {
        folder: "uploads/stores/logos",
        resource_type: "image",
      });
      updateData.logoUrl = imageResult.secure_url;
      fs.unlinkSync(imagePath);
    }

    // Upload new cover photo if available
    if (req.files["coverPhoto"]) {
      // Delete old cover photo from Cloudinary
      if (updatedItem.coverPhotoUrl) {
        const oldImagePublicId = updatedItem.coverPhotoUrl
          .split("/")
          .pop()
          .split(".")[0];
        await cloudinary.uploader.destroy(
          `uploads/stores/coverPhotos/${oldImagePublicId}`
        );
      }

      // Upload new cover photo
      const imagePath = req.files["coverPhoto"][0].path;
      const imageResult = await cloudinary.uploader.upload(imagePath, {
        folder: "uploads/stores/coverPhotos",
        resource_type: "image",
      });
      updateData.coverPhotoUrl = imageResult.secure_url;
      fs.unlinkSync(imagePath);
    }

    // Update product with new data
    updatedItem = await Store.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      message: "Store updated successfully.",
      success: true,
      updatedItem,
    });
  } catch (error) {
    console.error(`Edit Store error: ${error}`);
    res.status(500).json({
      message: "Error updating Store.",
      success: false,
    });
  }
};

// Delete Item API
export const deleteStore = async (req, res) => {
  try {
    const { id } = req.params;

    // Find item by ID to get image and video URLs
    const deletedItem = await Store.findByIdAndDelete(id);

    if (!deletedItem) {
      return res.status(404).json({
        message: "Store not found.",
        success: false,
      });
    }

    // Delete image from Cloudinary if exists
    if (deletedItem.logoUrl) {
      const oldImagePublicId = deletedItem.logoUrl
        .split("/")
        .pop()
        .split(".")[0];
      await cloudinary.uploader.destroy(
        `uploads/stores/logos/${oldImagePublicId}`
      );
    }
    if (deletedItem.coverPhotoUrl) {
      const oldImagePublicId = deletedItem.coverPhotoUrl
        .split("/")
        .pop()
        .split(".")[0];
      await cloudinary.uploader.destroy(
        `uploads/stores/coverPhotos/${oldImagePublicId}`
      );
    }

    return res.status(200).json({
      message: "Store deleted successfully.",
      success: true,
      deletedItem,
    });
  } catch (error) {
    console.error(`Delete Store error: ${error}`);
    res.status(500).json({
      message: "Error deleting Store.",
      success: false,
    });
  }
};
