import axios from "axios"

export const createPorterShipment =  async(order, store, customerAddress)=> {

    if (!process.env.PORTER_API_KEY || !process.env.PORTER_BASE_URL) {
      throw new Error("Missing Porter API configuration");
    }
  try {
        const payload = {
          delivery_details: {
          pickup: {
              name: store.storeName,
              address_line_1: store.storeAddress,
              pincode: store.pincode,
              city: store.city,
              state: store.state,
              lat: store.lat,
              lng: store.lng,
          },
          drop: {
              name: customerAddress.name,
              address_line_1: customerAddress.addressLine1,
              pincode: customerAddress.pincode,
              city: customerAddress.city,
              state: customerAddress.state,
              lat: customerAddress.lat,
              lng: customerAddress.lng,
              phone_number: customerAddress.phone,
          },
          },
          package_details: {
          weight: 1,
          description: 'E-commerce package',
          },
          order_reference_id: order.order_number,
          payment_mode: 'prepaid',
        };

    const response = await axios.post(
      `${process.env.PORTER_BASE_URL}/v1/orders/create`,
      payload,
      {
        headers: {
          "x-api-key": process.env.PORTER_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    const resData = response.data;

    return {
        tracking_id: resData.order_id || '',
        tracking_url: resData.tracking_url || '',
        raw: JSON.stringify(resData),
    }; 
  } catch (error) {
    console.error('Porter shipment error:', error.response?.data || error.message);
    throw new Error('Failed to create shipment with Porter'); 
  }
}