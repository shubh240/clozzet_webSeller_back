import { SellerDashboard } from "../models/sellerDashboard.model.js";
import { v4 as uuidv4 } from "uuid";

// Create an order


export const add = async (req, res) => {
  try {
    const placedOrder = req.body;
    const { _id: orderId, products, totalAmount } = placedOrder;

    console.log(`Placed Order ID: ${orderId}`);
    console.log(`Total Amount: ${totalAmount}`);
    console.log(`Products: ${JSON.stringify(products)}`);

    // Commission slab logic
    let commissionRate = 0;
    let commissionSlab = "";

    if (totalAmount < 700) {
      commissionRate = 5;
      commissionSlab = "Below ₹700";
    } else if (totalAmount >= 700 && totalAmount <= 2200) {
      commissionRate = 10;
      commissionSlab = "Between ₹700 - ₹2200";
    } else {
      commissionRate = 15;
      commissionSlab = "Above ₹2200";
    }

    // For each product, create a SellerDashboard entry
    const dashboardEntries = await Promise.all(
      products.map(async (item) => {
        const price = item.productId?.sellingPrice || 0;
        const quantity = item.quantity || 1;
        const totalEarnings = price * quantity;
        const commissionAmount = (totalEarnings * commissionRate) / 100;
        const netEarnings = totalEarnings - commissionAmount;

        const newEntry = new SellerDashboard({
          orderId,
          productDetails: item.productId._id, // assuming populated
          netEarnings,
          commissionSlab,
          commissionPercent: `${commissionRate}%`,
        });

        return await newEntry.save();
      })
    );

    return res.status(201).json({
      message: "Order placed successfully in Seller Dashboard",
      entries: dashboardEntries,
    });
  } catch (error) {
    console.error("Create Order Error:", error.message);
    return res.status(500).json({ message: error.message });
  }
};


// Get All Items API
export const getAll = async (req, res) => {
  try {
    const sellerId = req.id; // Or wherever you store the seller's ID
   console.log(`sellerId: ${sellerId}`);
    // Step 1: Fetch all orders with populated products
   const placedOrders = await SellerDashboard.find()
     .populate({
       path: "productDetails",
       model: "Product",
       populate: {
         path: "userId",
         model: "User",
       },
     })
     .lean();

   const filteredOrders = placedOrders.filter(
     (order) => order.productDetails?.userId?._id?.toString() === sellerId
   );


   console.log(`filteredOrders: ${filteredOrders}`);
    return res.status(200).json({
      success: true,
      items: filteredOrders,
      message: "fetching placed orders.",
    });
  } catch (error) {
    console.error(`Get all placed orders error: ${error}`);
    res.status(500).json({
      message: "Error fetching placed orders.",
      success: false,
    });
  }
};


// Edit Item API
export const edit = async (req, res) => {
  try {
    const { id } = req.params;

    const updateData = req.body;
    // console.log(`Update data is ${updateData}`)

    // Find and update item by ID
    const updatedOrder = await SellerDashboard.findByIdAndUpdate(id, updateData, {
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

    const deletedOrder = await SellerDashboard.findByIdAndDelete(id);

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
