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
            phone_number: `${customerAddress?.customerId?.countryCode}+${customerAddress?.customerId?.mobileNo || customerAddress?.customerId?.altMobileNo}` ,
          },
        },
      },
    };
    // const payload2 = {
    //   request_id: "Porter test UAT_order_0001",
    //   delivery_instructions: {
    //     instructions_list: [
    //       {
    //         type: "text",
    //         description: "handle with care",
    //       },
    //       {
    //         type: "text",
    //         description: "Test order 52",
    //       },
    //     ],
    //   },
    //   pickup_details: {
    //     address: {
    //       apartment_address: "27",
    //       street_address1: "Sona Towers",
    //       street_address2: "Krishna Nagar Industrial Area",
    //       landmark: "Hosur Road",
    //       city: "Bengaluru",
    //       state: "Karnataka",
    //       pincode: "560029",
    //       country: "India",
    //       lat: 12.939391726766775,
    //       lng: 77.62629462844717,
    //       contact_details: {
    //         name: "Porter Test User",
    //         phone_number: "+911234567890",
    //       },
    //     },
    //   },
    //   drop_details: {
    //     address: {
    //       apartment_address: "this is apartment address",
    //       street_address1: "BTM Layout",
    //       street_address2: "Another street address",
    //       landmark: "BTM Layout",
    //       city: "Bengaluru",
    //       state: "Karnataka",
    //       pincode: "560029",
    //       country: "India",
    //       lat: 12.9165757,
    //       lng: 77.6101163,
    //       contact_details: {
    //         name: "Porter Test User",
    //         phone_number: "+911234567890",
    //       },
    //     },
    //   },
    // };


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
    console.error(
      "Porter shipment error:",
      error.response?.data || error.message
    );
    throw new Error("Failed to create shipment with Porter");
  }
};
