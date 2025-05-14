import mongoose from "mongoose";
import { sendResponse } from "../common/index.js";
import { SizeChart } from "../models/sizeChart.model.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

export const createSizeChart = async (req, res) => {
    try {
      const { name } = req.body;
      const sellerId = req.id;
  
      // Validate required fields
      if (!name || !req.files || !req.files['image']) {
        return sendResponse(res, 400, false, "Name and image file are required.");
      }
  
      // Upload image to Cloudinary
      const file = req.files['image'][0];
      const imagePath = file.path;
  
      const uploadResult = await cloudinary.uploader.upload(imagePath, {
        folder: "uploads/sizecharts",
        resource_type: "image",
      });
  
      // Clean up local file
      fs.unlinkSync(imagePath);
  
      // Save to database
      const sizeChart = await SizeChart.create({
        name,
        image: uploadResult.secure_url,
        sellerId,
        createdBy: sellerId,
      });
  
      return sendResponse(res, 201, true, "Size chart created", sizeChart);
    } catch (error) {
      console.error("Create SizeChart Error:", error);
      return sendResponse(res, 500, false, "Internal server error");
    }
};

export const getSizeCharts = async (req, res) => {
  try {
    const sellerId = req.id;

    const query = { isDeleted: false, sellerId };

    const sizeCharts =  await SizeChart.find(query).sort({ createdAt: -1 });
    return sendResponse(res, 200, true, "Size charts fetched",sizeCharts);

  } catch (error) {
    console.error("Get SizeCharts Error:", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
};



export const updateSizeChart = async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const sellerId = req.id;
  
      if (!mongoose.isValidObjectId(id)) {
        return sendResponse(res, 400, false, "Invalid size chart ID");
      }
  
      const sizeChart = await SizeChart.findById(id);
      if (!sizeChart || sizeChart.isDeleted) {
        return sendResponse(res, 404, false, "Size chart not found");
      }
  
      // Update name if provided
      if (name) {
        sizeChart.name = name;
      }
  
      // If image is provided via req.files
      if (req.files && req.files['image']) {
        const file = req.files['image'][0];
        const imagePath = file.path;
  
        const uploadResult = await cloudinary.uploader.upload(imagePath, {
          folder: "uploads/sizecharts",
          resource_type: "image",
        });
  
        sizeChart.image = uploadResult.secure_url;
        fs.unlinkSync(imagePath); // Remove temp file
      }
  
      sizeChart.updatedBy = sellerId;
  
      await sizeChart.save();
  
      return sendResponse(res, 200, true, "Size chart updated", sizeChart);
    } catch (error) {
      console.error("Update SizeChart Error:", error);
      return sendResponse(res, 500, false, "Internal server error");
    }
};
  

export const deleteSizeChart = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.id;

    if (!mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, false, "Invalid size chart ID");
    }

    const sizeChart = await SizeChart.findById(id);
    if (!sizeChart || sizeChart.isDeleted) {
      return sendResponse(res, 404, false, "Size chart not found");
    }

    sizeChart.isDeleted = true;
    sizeChart.deletedBy = sellerId;

    await sizeChart.save();

    return sendResponse(res, 200, true, "Size chart deleted successfully");
  } catch (error) {
    console.error("Delete SizeChart Error:", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
};
