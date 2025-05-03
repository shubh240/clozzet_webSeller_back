import express from "express";
import isUserAuthenticated from "../middleware/isUserAuthenticated.js";
import {SellerUserAuth} from "../models/user.model.js";

const router = express.Router();

router.get("/verify", isUserAuthenticated, async (req, res) => {
  try {
    const user = await SellerUserAuth.findById(req.id).select("userInfo");
    return res.status(200).json({
      auth: true,
      user: user?.userInfo || null,
    });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ auth: false, message: "Error verifying user" });
  }
});

export default router;
