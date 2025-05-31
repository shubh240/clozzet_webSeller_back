import mongoose from "mongoose";

const returnRequestSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
        },
        orderItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrderItem",
            required: true,
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        images: [
            {
                type: String,
            },
        ],
        /**
         * "Requested": When the customer submits the return.
         * "Approved": When admin/seller reviews and approves the return.
         * "Pickup Initiated": Reverse shipment created (Porter/Shiprocket).
         * "Picked Up": The product has been picked up.
         * "Rejected": The return request was rejected.
         * "Completed": Refund issued and return closed.
         */
        status: {
            type: String,
            enum: ["Requested", "Approved", "Pickup Initiated", "Picked Up", "Rejected", "Completed"],
            default: "Requested",
        },
        /**
         * "Pending": Return not processed yet.
         * "Processing": Refund transaction initiated (Razorpay, wallet, etc.).
         * "Completed": Refund successful.
         * "Failed": Refund attempt failed (retry may be needed).
         */
        refundStatus: {
            type: String,
            enum: ["Pending", "Processing", "Completed", "Failed"],
            default: "Pending",
        },
        refundId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Refund",
        },
        shipmentProviderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ShipmentProvider",
        },
        trackingId: {
            type: String,
        },
        pickupAddress: {
            type: String,
        },
        pickupDate: {
            type: Date,
        },
        response: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

export const ReturnRequest = mongoose.model("ReturnRequest", returnRequestSchema);
