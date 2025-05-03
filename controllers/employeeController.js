import { Employee } from "../models/employee.model.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

// Add Employee API with Image Upload
export const addEmployee = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      role,
      email,
      password,
      confirmPassword,
    } = req.body;
    const employerId = req.id;

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Confirm password does not match with the password.",
        success: false,
      });
    }

    // Check if Employee firstName already exists
    let gotEmployee = await Employee.findOne({ email });
    if (gotEmployee) {
      return res.status(400).json({
        message: "Employee with this email already exists.",
        success: false,
      });
    }

    let employeeImageUrl = "";

    console.log("Files received:", req.files);

    // Upload image if available

    if (req.files["image"]) {
      const imagePath = req.files["image"][0].path;
      const imageResult = await cloudinary.uploader.upload(imagePath, {
        folder: "uploads/Employees/images",
        resource_type: "image",
      });
      employeeImageUrl = imageResult.secure_url;
      fs.unlinkSync(imagePath); // Delete local file after upload
    }

    // Create new Employee
    const newEmployee = await Employee.create({
      firstName,
      lastName,
      phone,
      role,
      employeeImageUrl,
      email,
      password,
      confirmPassword,
      employerId,
    });

    return res.status(201).json({
      message: "Employee added successfully.",
      success: true,
      newEmployee,
    });
  } catch (error) {
    console.error(`Add Employee error: ${error}`);
    res.status(500).json({
      message: "Error adding Employee.",
      success: false,
    });
  }
};

// Get All Employees API
export const getAllEmployees = async (req, res) => {
  try {
    const employerId = req.id;
    const allEmployees = await Employee.find({ employerId: employerId });
    return res.status(200).json({
      success: true,
      Employees: allEmployees,
    });
  } catch (error) {
    console.error(`Get all Employees error: ${error}`);
    res.status(500).json({
      message: "Error fetching Employees.",
      success: false,
    });
  }
};

// Edit Employee API with Image
export const editEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    let updatedEmployee = await Employee.findById(id);
    if (!updatedEmployee) {
      return res.status(404).json({
        message: "Employee not found.",
        success: false,
      });
    }

    // Upload new image if available
    if (req.files["image"]) {
      // Delete old image from Cloudinary
      if (updatedEmployee.employeeImageUrl) {
        const oldImagePublicId = updatedEmployee.employeeImageUrl
          .split("/")
          .pop()
          .split(".")[0];
        await cloudinary.uploader.destroy(
          `uploads/Employees/images/${oldImagePublicId}`
        );
      }

      // Upload new image
      const imagePath = req.files["image"][0].path;
      const imageResult = await cloudinary.uploader.upload(imagePath, {
        folder: "uploads/Employees/images",
        resource_type: "image",
      });
      updateData.employeeImageUrl = imageResult.secure_url;
      fs.unlinkSync(imagePath);
    }

    // Update Employee with new data
    updatedEmployee = await Employee.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      message: "Employee updated successfully.",
      success: true,
      updatedEmployee,
    });
  } catch (error) {
    console.error(`Edit Employee error: ${error}`);
    res.status(500).json({
      message: "Error updating Employee.",
      success: false,
    });
  }
};

// Delete Employee API with Image Deletion
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Find Employee by ID to get image URLs
    const deletedEmployee = await Employee.findByIdAndDelete(id);

    if (!deletedEmployee) {
      return res.status(404).json({
        message: "Employee not found.",
        success: false,
      });
    }

    // Delete image from Cloudinary if exists
    if (deletedEmployee.employeeImageUrl) {
      const oldImagePublicId = deletedEmployee.employeeImageUrl
        .split("/")
        .pop()
        .split(".")[0];
      await cloudinary.uploader.destroy(
        `uploads/Employees/images/${oldImagePublicId}`
      );
    }

    return res.status(200).json({
      message: "Employee deleted successfully.",
      success: true,
      deletedEmployee,
    });
  } catch (error) {
    console.error(`Delete Employee error: ${error}`);
    res.status(500).json({
      message: "Error deleting Employee.",
      success: false,
    });
  }
};
