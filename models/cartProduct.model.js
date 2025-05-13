import mongoose from "mongoose";

const CartProductSchema = new mongoose.Schema({
  cartId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sizeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Size', required: true },
  quantity: { type: Number, required: true }
}, { timestamps: true });

export const CartProduct = mongoose.model("CartProduct", CartProductSchema);
