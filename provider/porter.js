import axios from "axios";

export const createPorterShipment = async (order, store, customerAddress) => {
  if (!process.env.PORTER_API_KEY || !process.env.PORTER_BASE_URL) {
    throw new Error("Missing Porter API configuration");
  }

  try {
    const payload2 = {
      requestId: "123", // ✅ FIXED: Changed to camelCase
      deliveryDetails: {
        // ✅ Also fix inner keys to camelCase
        pickup: {
          name: store.storeName,
          addressLine1: store.storeAddress,
          pincode: store.pincode,
          city: store.city,
          state: store.state,
          lat: store.lat,
          lng: store.lng,
        },
        drop: {
          name: customerAddress.name,
          addressLine1: customerAddress.addressLine1,
          pincode: customerAddress.pincode,
          city: customerAddress.city,
          state: customerAddress.state,
          lat: customerAddress.lat,
          lng: customerAddress.lng,
          phoneNumber: customerAddress.phone,
        },
      },
      packageDetails: {
        weight: 1,
        description: "E-commerce package",
      },
      orderReferenceId: order.order_number,
      paymentMode: "prepaid",
    };

    const payload = {
      request_id: "Porter test UAT_order_0001",
      delivery_instructions: {
        instructions_list: [
          {
            type: "text",
            description: "handle with care",
          },
          {
            type: "text",
            description: "Test order 52",
          },
        ],
      },
      pickup_details: {
        address: {
          apartment_address: "27",
          street_address1: "Sona Towers",
          street_address2: "Krishna Nagar Industrial Area",
          landmark: "Hosur Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560029",
          country: "India",
          lat: 12.939391726766775,
          lng: 77.62629462844717,
          contact_details: {
            name: "Porter Test User",
            phone_number: "+911234567890",
          },
        },
      },
      drop_details: {
        address: {
          apartment_address: "this is apartment address",
          street_address1: "BTM Layout",
          street_address2: "Another street address",
          landmark: "BTM Layout",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560029",
          country: "India",
          lat: 12.9165757,
          lng: 77.6101163,
          contact_details: {
            name: "Porter Test User",
            phone_number: "+911234567890",
          },
        },
      },
    };
    console.log(payload);
    // return ('hi');
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
      tracking_id: resData.order_id || "",
      tracking_url: resData.tracking_url || "",
      raw: JSON.stringify(resData),
    };
  } catch (error) {
    console.error(
      "Porter shipment error:",
      error.response?.data || error.message
    );
    throw new Error("Failed to create shipment with Porter");
  }
};
