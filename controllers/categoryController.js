import { Category } from "../models/category.model.js";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 4);

// Create a new category
export const createCategory = async (req, res) => {
  try {
    const {  categoryName, categoryStatus, featured } =
      req.body;
    const sellerId = req.id;
    console.log(`sellerId: ${sellerId}`);

    

    const category = new Category({
      categoryId: `CAT-${nanoid()}`,
      categoryName,
      categoryStatus,
      featured,
      sellerId,
    });
   

    const savedCategory = await category.save();
    res
      .status(201)
      .json({
        savedCategory,
        message: "Category created successfully.",
        success: true,
      });
  } catch (error) {
    console.log(`Create category error: ${error}`);

    res
      .status(500)
      .json({ error: "Failed to create category", details: error.message });
  }
};

// Get all categories (optionally filter by seller)
export const getAllCategories = async (req, res) => {
   try {
      //const sellerId = req.id;
      const allCategories = await Category.find();
      return res.status(200).json({
        success: true,
        items: allCategories,
      });
    } catch (error) {
      console.error(`Get all categories error: ${error}`);
      res.status(500).json({
        message: "Error fetching categories.",
        success: false,
      });
    }
};

// Get single category by ID
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.status(200).json({ category, success: true,});
  } catch (error) {
    console.log(`Get category error: ${error}`);
    res
      .status(500)
      .json({ error: "Failed to fetch category", details: error.message });
  }
};

// Update a category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const updatedCategory = await Category.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    res
      .status(200)
      .json({
        updatedCategory,
        message: "Category updated successfully.",
        success: true,
      });
  } catch (error) {
        console.log(`update category error: ${error}`);

    res
      .status(500)
      .json({ error: "Failed to update category", details: error.message });
  }
};

export const toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("categoryId", id);

    const category = await Category.findOne({ _id: id });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    category.categoryStatus = !category.categoryStatus; // Toggle boolean
    await category.save();

    res.status(200).json({
      message: "Category status updated",
      categoryStatus: category.categoryStatus,
      success: true,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating status", error: error.message });
  }
};

export const toggleCategoryFeatured = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findOne({ _id: id });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    category.featured = !category.featured; // Toggle boolean
    await category.save();

    res.status(200).json({
      message: "Category featured status updated",
      featured: category.featured,
      success: true,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating featured", error: error.message });
  }
};


// Delete a category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
        console.log(`Delete category error: ${error}`);

    res
      .status(500)
      .json({ error: "Failed to delete category", details: error.message });
  }
};
