import mongoose from "mongoose";

const CartSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  storeId: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

export const Cart = mongoose.model("Cart", CartSchema);
