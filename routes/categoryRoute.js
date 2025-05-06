import express from "express";
import {
  listCategories
} from "../controllers/categoryController.js";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";


const router = express.Router();

router.get("/list-category", isUserAuthenticated, listCategories);

export default router;
