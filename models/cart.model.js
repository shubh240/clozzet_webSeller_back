import mongoose from "mongoose";

const CartSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  storeId: { type: mongoose.Schema.Types.ObjectId, required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  customerAddressId: { type: mongoose.Schema.Types.ObjectId,ref: "CustomerAddress" },
  sub_total_amount: { type: Number, default: 0 },
  platform_fee: { type: Number, default: 0 },
  delivery_fee: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  couponCode: { type: String, default: null }, 
  total_amount: { type: Number, default: 0 }
}, { timestamps: true });

export const Cart = mongoose.model("Cart", CartSchema);
