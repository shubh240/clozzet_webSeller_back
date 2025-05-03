import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { v4 as uuidv4 } from "uuid";

// Create an order
export const addOrder = async (req, res) => {
  try {
    const { productId, quantity, paymentMethod, deliveryAddress } = req.body;

    if (!productId || !quantity || !paymentMethod || !deliveryAddress) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const customerId = req.id; // from JWT middleware

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const price = product.sellingPrice;
    const sellerId = product.userId;
    const totalAmount = price * quantity;

    const order = await Order.create({
      orderNumber: uuidv4().slice(0, 8).toUpperCase(),
      orderStatus: "Confirmed",
      products: [
        {
          productId,
          quantity,
          price,
        },
      ],
      totalAmount,
      paymentStatus: paymentMethod === "COD" ? "Pending" : "Paid",
      paymentMethod,
      deliveryAddress,
      sellerId,
      customerId,
    });

    return res.status(201).json({
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    console.error("Create Order Error:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Get All Items API
export const getAllOrders = async (req, res) => {
  try {
    const sellerId = req.id; // Or wherever you store the seller's ID
   console.log(`sellerId: ${sellerId}`);
    // Step 1: Fetch all orders with populated products
    const allOrders = await Order.find()
      .populate("products.productId") // Populate productId inside products array
      .populate("customerId", "firstName lastName email") // Populate customer info
      .populate("sellerId", "firstName lastName email") // Populate seller info
      .lean();

      console.log(`allOrders: ${allOrders}`);

    // Step 2: Filter orders that include at least one product of this seller
    const filteredOrders = allOrders.filter((order) =>
      order.products.some((p) => p.productId?.userId?.toString() === sellerId)
    );
   console.log(`filteredOrders: ${filteredOrders}`);
    return res.status(200).json({
      success: true,
      items: filteredOrders,
      message: "fetching orders.",
      
    });
  } catch (error) {
    console.error(`Get all orders error: ${error}`);
    res.status(500).json({
      message: "Error fetching orders.",
      success: false,
    });
  }
};


// Edit Item API
export const editOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const updateData = req.body;
    // console.log(`Update data is ${updateData}`)

    // Find and update item by ID
    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, {
      new: true, // Return updated item
      runValidators: true, // Run validators on update
    });

    if (!updatedOrder) {
      return res.status(404).json({
        message: "Order not found.",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Order updated successfully.",
      success: true,
      updatedOrder,
    });
  } catch (error) {
    console.error(`Edit Item error: ${error}`);
    res.status(500).json({
      message: "Error updating item.",
      success: false,
    });
  }
};

// Delete Item API
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedOrder = await Order.findByIdAndDelete(id);

    if (!deletedOrder) {
      return res.status(404).json({
        message: "Order not found.",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Order deleted successfully.",
      success: true,
      deletedOrder,
    });
  } catch (error) {
    console.error(`Delete order error: ${error}`);
    res.status(500).json({
      message: "Error deleting order.",
      success: false,
    });
  }
};
