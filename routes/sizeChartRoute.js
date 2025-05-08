import express from "express";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";
import { createSizeChart, deleteSizeChart, getSizeCharts, updateSizeChart } from "../controllers/sizeChartController.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.post("/create-sizeChart",
    isUserAuthenticated,  
    upload.fields([
    { name: "image", maxCount: 1 }
    ]),
  createSizeChart);
router.get("/list-sizeChart", isUserAuthenticated, getSizeCharts);
router.put("/update-sizeChart/:id", 
    isUserAuthenticated, 
    upload.fields([
        { name: "image", maxCount: 1 }
    ]),
    updateSizeChart
);
router.delete("/delete-sizeChart/:id", isUserAuthenticated, deleteSizeChart);

export default router;
