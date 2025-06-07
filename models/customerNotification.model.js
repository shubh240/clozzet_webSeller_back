import mongoose from "mongoose";

const customerNotificationSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
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

export const CustomerNotification = mongoose.model("CustomerNotification", customerNotificationSchema);
