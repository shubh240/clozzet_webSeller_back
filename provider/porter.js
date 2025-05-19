export const createPorterShipment =  async(order, store, customerAddress)=> {

  if (!process.env.PORTER_CLIENT_ID || !process.env.PORTER_CLIENT_SECRET || !process.env.PORTER_BASE_URL) {
    throw new Error('Porter credentials not found in environment variables');
  }
  try {
        const payload = {
        client_id: process.env.PORTER_CLIENT_ID,
        client_secret: process.env.PORTER_CLIENT_SECRET,
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

    const response = await axios.post(`${process.env.PORTER_BASE_URL}/v1/orders/create`, payload);

    const resData = response.data;

    return {
        tracking_id: resData.order_id || '',
        tracking_url: resData.tracking_url || '',
        raw: JSON.stringify(resData),
    }; 
  } catch (error) {
    console.error('Porter shipment error:', err.response?.data || err.message);
    throw new Error('Failed to create shipment with Porter'); 
  }
}