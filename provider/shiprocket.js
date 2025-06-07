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
            sku: item.sku,
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

export const createShiprocketReversePickup = async (order, returnRequest) => {
  const response = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/return", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_SHIPROCKET_TOKEN"
    },
    body: JSON.stringify({
      order_id: order._id,
      pickup_location: returnRequest.pickupAddress,
      items: returnRequest.orderItemIds.map(id => ({
        name: "Product Name",
        quantity: 1
      })),
    }),
  });

  const data = await response.json();
  return {
    trackingId: data.shipment_id
  };
};

