import express from "express";
import {
  add,
  getAll,
  edit,
  deleteOrder,
} from "../controllers/sellerDashboardController.js";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";

const router = express.Router();

router.post("/add", isUserAuthenticated, add);
router.get("/all", isUserAuthenticated, getAll);
router.put("/edit/:id", isUserAuthenticated, edit);
router.delete("/delete/:id", isUserAuthenticated, deleteOrder);

export default router;
