import { OrderItem } from "../models/orderItems.model.js";
import axios from "axios";
import { ReturnProduct } from "../models/returnProduct.model.js";
import mongoose from "mongoose";

let tokenCache = null;

export const getShiprocketToken =  async()=> {

  if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD || !process.env.SHIPROCKET_BASE_URL) {
    throw new Error('Shiprocket credentials not found in environment variables');
  }

  if (tokenCache) return tokenCache;

  try {
    const response = await axios.post(`${process.env.SHIPROCKET_BASE_URL}/auth/login`, {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
    });

    tokenCache = response.data.token;
    return tokenCache;
  } catch (error) {
    console.error('Shiprocket token error:', error.response?.data || error.message);
    throw new Error('Failed to get Shiprocket token');
  }
}

export const createShiprocketShipment=  async(order, store, customerAddress)=> {
    try {
        const token = await getShiprocketToken();

        const shipmentData = {
            order_id: order.order_number,
            order_date: new Date(order.createdAt).toISOString().split('T')[0],
            pickup_location: store.storeName,
            billing_customer_name: customerAddress.name,
            billing_address: customerAddress.addressLine1,
            billing_city: customerAddress.city,
            billing_pincode: customerAddress.pincode,
            billing_state: customerAddress.state,
            billing_country: 'India',
            billing_email: customerAddress.email || 'test@example.com',
            billing_phone: customerAddress.phone || '9999999999',
            shipping_is_billing: true,
            order_items: order.order_items.map(item => ({
            name: item.productName,
            sku: item.productSizeId ? ( ProductSize.findById(item.productSizeId)).sku : item.sku,
            units: item.quantity,
            selling_price: item.amount_per_unit,
            })),
            payment_method: order.paymentTypeId === 1 ? 'COD' : 'Prepaid',
            sub_total: order.sub_total_amount,
            length: 10,
            breadth: 10,
            height: 10,
            weight: 1,
        };

        const response = await axios.post(
            `${process.env.SHIPROCKET_BASE_URL}/orders/create/adhoc`,
            shipmentData,
            {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            }
        );

        const resData = response.data;
        return {
            tracking_id: resData.order_id || '',
            tracking_url: resData.shipment_id ? `https://app.shiprocket.in/orders/view/${resData.shipment_id}` : '',
            raw: JSON.stringify(resData),
        };
        
    } catch (error) {
        console.error('Shiprocket shipment error:', error.response?.data || error.message);
        throw new Error('Failed to create shipment with Shiprocket');   
    }
}

export const createShiprocketReversePickup = async (order, returnRequest,customerAddress,parsedOrderItemIds) => {
  try {
    const token = await getShiprocketToken();

    const allOrderItems = await OrderItem.find({
      orderId: new mongoose.Types.ObjectId(order._id),
      _id: { $in: parsedOrderItemIds.map(id => new mongoose.Types.ObjectId(id)) },
    });

    if (!allOrderItems?.length) {
      throw new Error("No order items found for reverse pickup.");
    }

    // Step 2: Build the order_items array
    const orderItemsData = allOrderItems.map((item) => ({
      name: item.productName || "Item",
      sku: item.productSizeId ? ( ProductSize.findById(item.productSizeId)).sku : "SKU",// Fallback to SKU if productSizeId not found
      units: item.quantity || 1,
      selling_price: item.amountPerUnit || 100,
    }));
    
    const shipmentData = {
      order_id: `RETURN-${order.order_number}`,
      order_date: new Date().toISOString().split("T")[0],
      pickup_location: returnRequest.pickupAddress, // This should be the pickup location name, not full address

      billing_customer_name: returnRequest.customerId?.fullName || "Customer",
      billing_address: customerAddress?.address_line_1 || "Address Line 1",
      billing_city: customerAddress?.city || "City",
      billing_pincode: customerAddress?.pincode || "000000",
      billing_state: customerAddress?.state || "State",
      billing_country: "India",
      billing_email: returnRequest.customerId?.email || "test@example.com",
      billing_phone: `${returnRequest.customerId?.countryCode}${returnRequest.customerId?.mobileNo}` || "9999999999",

      shipping_is_billing: true,
      order_items: orderItemsData,

      payment_method: order.paymentTypeId === 1 ? "COD" : "Prepaid",
      sub_total: order.sub_total_amount || 100,

      length: 10,
      breadth: 10,
      height: 10,
      weight: 1,
    };

    console.log('shipmentData' ,shipmentData);

    const response = await axios.post(
      `${process.env.SHIPROCKET_BASE_URL}/orders/create/return`,
      shipmentData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = response.data;

    return {
      success: true,
      trackingId: data.shipment_id,
      pickupAddress: shipmentData.pickup_location,
      pickupDate: new Date().toISOString(),
    };

  } catch (error) {
    console.error("Shiprocket reverse pickup error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};


