import axios from "axios";

export const createPorterShipment = async (order, store, customerAddress) => {
  if (!process.env.PORTER_API_KEY || !process.env.PORTER_BASE_URL) {
    throw new Error("Missing Porter API configuration");
  }
  // console.log('order : -------->' , order);
  // console.log('store : -------->' , store);
  // console.log('customerAddress : -------->' , customerAddress);

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
          apartment_address: customerAddress?.type, //need to discuss with jatin
          street_address1: customerAddress?.address_line_1,
          street_address2: customerAddress?.address_line_2,
          landmark: customerAddress?.landmark || "",
          city: customerAddress?.city,
          state: customerAddress?.state,
          pincode: customerAddress?.pincode,
          country: "India",
          lat: customerAddress?.location?.coordinates[0], // lat
          lng: customerAddress?.location?.coordinates[1], // lng
          contact_details: {
            name: customerAddress?.customerId?.fullName,
            phone_number: `${customerAddress?.customerId?.countryCode}${
              customerAddress?.customerId?.mobileNo ||
              customerAddress?.customerId?.altMobileNo
            }`,
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
    // console.log('resData : ',resData);

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
    // console.log(error?.response)
    const porterErrorMessage =
      error?.response?.data?.message || // Porter usually sends message here
      error?.response?.data?.error || // fallback if structured differently
      error?.message || // generic JS error
      "Unknown Porter API error";

    console.error("Porter shipment error:", porterErrorMessage);

    throw new Error(porterErrorMessage);
  }
};

export const createPorterReversePickup = async (
  order,
  returnRequest,
  shipment
) => {
  if (!process.env.PORTER_API_KEY || !process.env.PORTER_BASE_URL) {
    throw new Error("Missing Porter API configuration");
  }

  try {
    const payload = {
      request_id: `reverse_${order._id}`,
      delivery_instructions: {
        instructions_list: [
          {
            type: "text",
            description: "Return pickup - Handle carefully",
          },
        ],
      },
      pickup_details: {
        address: {
          apartment_address: shipment.dropAddressType || "N/A",
          street_address1: shipment.dropAddressLine1,
          street_address2: shipment.dropAddressLine2 || "",
          landmark: shipment.dropLandmark || "",
          city: shipment.dropCity,
          state: shipment.dropState,
          pincode: shipment.dropPincode,
          country: "India",
          lat: shipment.dropLat,
          lng: shipment.dropLng,
          contact_details: {
            name: returnRequest?.customerId?.fullName || "Customer",
            phone_number: `${returnRequest?.customerId?.countryCode}${returnRequest?.customerId?.mobileNo}`,
          },
        },
      },
      drop_details: {
        address: {
          apartment_address: order.storeId?.storeName || "Warehouse",
          street_address1: order.storeId?.storeAddress,
          street_address2: order.storeId?.city,
          landmark: "",
          city: order.storeId?.city,
          state: order.storeId?.state,
          pincode: order.storeId?.pincode,
          country: "India",
          lat: order.storeId?.position?.lat,
          lng: order.storeId?.position?.lng,
          contact_details: {
            name: `${order.sellerId?.userInfo?.firstName} ${order.sellerId?.userInfo?.lastName}`,
            phone_number: `+91${order.sellerId?.userInfo?.mobileNo}`,
          },
        },
      },
    };

    console.log("Porter Reverse Pickup Payload:", payload);

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

    const data = response.data;

    return {
      success: true,
      trackingId: data.order_id,
      pickupAddress: payload.pickup_details.address,
      pickupDate: new Date().toISOString(),
      data: JSON.stringify(data),
    };
  } catch (error) {
    const porterErrorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Unknown Porter reverse pickup error";

    return {
      success: false,
      error: porterErrorMessage,
    };
  }
};

export const getPorterLiveTrackingDetails = async (trackingId) => {
  try {
    const response = await axios.get(
      `${process.env.PORTER_BASE_URL}/v1/orders/${trackingId}`,
      {
        headers: {
          "x-api-key": process.env.PORTER_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(response.data)
    return response.data;
  } catch (error) {
    console.error("Porter Live Tracking API Error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Failed to fetch Porter tracking details"
    );
  }
};