import axios from "axios";

export const createPorterShipment = async (order, store, customerAddress) => {
  if (!process.env.PORTER_API_KEY || !process.env.PORTER_BASE_URL) {
    throw new Error("Missing Porter API configuration");
  }
  console.log('order : -------->' , order);
  console.log('store : -------->' , store);
  console.log('customerAddress : -------->' , customerAddress);
  
  try {
    const payload = {
      request_id: `porter_${order?._id}`,
      delivery_instructions: {
        instructions_list: [
          {
            type: "text",
            description: "handle with care",
          },
          {
            type: "text",
            description: `Order for ${store?.storeName}`,
          },
        ],
      },
      pickup_details: {
        address: {
          apartment_address: "N/A", // Optional
          street_address1: store?.storeAddress,
          street_address2: store?.city,
          landmark: "", // Optional
          city: store?.city,
          state: store?.state,
          pincode: store?.pincode,
          country: "India",
          lat: store?.position?.lat,
          lng: store?.position?.lng,
          contact_details: {
            name: store?.storeName,
            phone_number: `+91${store?.sellerAuthId?.userInfo?.mobileNo}`,
          },
        },
      },
      drop_details: {
        address: {
          apartment_address: customerAddress?.type,   //need to discuss with jatin
          street_address1: customerAddress?.address_line_1,
          street_address2: customerAddress?.address_line_2,
          landmark: customerAddress?.landmark || "",
          city: customerAddress?.city,
          state: customerAddress?.state,
          pincode: customerAddress?.pincode,
          country: "India",
          lat: customerAddress?.location?.coordinates[1], // lat
          lng: customerAddress?.location?.coordinates[0], // lng
          contact_details: {
            name: customerAddress?.customerId?.fullName,
            phone_number: `${customerAddress?.customerId?.countryCode}${customerAddress?.customerId?.mobileNo || customerAddress?.customerId?.altMobileNo}` ,
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
    console.log('resData : ',resData);
    
    return {
      tracking_id: resData.order_id || "",
      tracking_url: resData.tracking_url || "",
      raw: JSON.stringify(resData),
    };
  } catch (error) {
    // console.error(
    //   "Porter shipment error:",
    //   error.response?.data || error.message
    // );
    // throw new Error(error.response?.data);
    
    const porterErrorMessage =
      error?.response?.data?.message || // Porter usually sends message here
      error?.response?.data?.error ||   // fallback if structured differently
      error?.message ||                 // generic JS error
      "Unknown Porter API error";

    console.error("Porter shipment error:", porterErrorMessage);

    throw new Error(porterErrorMessage);
  }
};

export const createPorterReversePickup = async (order, returnRequest) => {
  const response = await fetch("https://api.porter.in/reverse-pickup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_PORTER_TOKEN"
    },
    body: JSON.stringify({
      pickup_address: returnRequest.pickupAddress,
      drop_address: "Your warehouse address",
      items: returnRequest.orderItemIds.map(id => ({
        name: "Product",
        quantity: 1
      })),
    }),
  });

  const data = await response.json();
  return {
    trackingId: data.tracking_id
  };
};
