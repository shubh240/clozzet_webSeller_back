import mongoose from "mongoose";

const returnProductSchema = new mongoose.Schema(
    {
        returnId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Return",
            required: true,
        },
        orderItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrderItem",
            required: true,
        }
    },
    {
        timestamps: true,
    }
);

export const ReturnProduct = mongoose.model("ReturnProduct", returnProductSchema);
