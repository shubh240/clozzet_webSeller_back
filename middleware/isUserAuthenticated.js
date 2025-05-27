import jwt from "jsonwebtoken";
import { Customer } from "../models/customer.model.js";
import { SellerUserAuth } from "../models/sellerUserInfo.model.js";
import { sendResponse } from "../common/index.js";

const isUserAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return sendResponse(res, 400, false, "Token missing");
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (!decoded || !decoded.userId) {
      return sendResponse(res, 401, false, "Invalid token");
    }
    /**
     * Customer-Seller Token Check
     */
    const customer = await Customer.findById(decoded.userId);
    const seller = await SellerUserAuth.findById(decoded.userId);
    if(customer) req.id = customer._id;
    if(seller) req.id = seller._id;
    next();
  } catch (error) {
    console.error("JWT verify error:", error.message);
    return sendResponse(res, 401, false, error.message);
  }
};


export default isUserAuthenticated;
