import mongoose from "mongoose";

const sellerNotificationSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SellerUserAuth",
    required: true,
  },
  title: String,
  body: String,
  image: String,
  data: Object,
  fcmResponse : {
    type : String
  },
  isSend : {
    type : Boolean,
    default:false
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

export const SellerNotification = mongoose.model("SellerNotification", sellerNotificationSchema);
