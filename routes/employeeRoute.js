import express from "express";
import upload from "../middleware/multer.middleware.js";
import {
  addEmployee,
  getAllEmployees,
  editEmployee,
  deleteEmployee,
} from "../controllers/employeeController.js";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";

const router = express.Router();

// Upload Image and Video Middleware
router.post(
  "/addEmployee",
  isUserAuthenticated,

  upload.fields([{ name: "image", maxCount: 1 }]),
  addEmployee
); // Add new Employee with image & video

router.get("/allEmployees", isUserAuthenticated, getAllEmployees); // Get all Employees

router.put(
  "/editEmployee/:id",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  editEmployee
); // Edit Employee by ID with image & video

router.delete("/deleteEmployee/:id", isUserAuthenticated, deleteEmployee); // Delete Employee by ID

export default router;
