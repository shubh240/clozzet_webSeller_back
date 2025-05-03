import mongoose from "mongoose";

const sellerDashboardModel = new mongoose.Schema(
  {
    orderId: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "Order",
       required: true,
    },
    productDetails: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "Product",
       required: true,
    },
   netEarnings: {
      type: Number,
      required: true,
    },
    commissionSlab: {
      type: String,
      required: true,
    },
    commissionPercent: {
      type: String,
      required: true,
    },
    

  },
  { timestamps: true }
);

export const SellerDashboard = mongoose.model("SellerDashboard", sellerDashboardModel);
