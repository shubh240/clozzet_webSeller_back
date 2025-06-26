import dotenv from "dotenv";
dotenv.config();
import twilio from "twilio";

console.log(
  "process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN",
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
  process.env.TWILIO_PHONE_NUMBER
);
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendOtp = async (mobileNo, otp) => {
  const formattedNumber = `+91${mobileNo}`;
  console.log("formattedNumber", formattedNumber);
  const message = `Your OTP from Clozzet India is: ${otp}. It is valid for 10 minutes.`;

  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedNumber,
    });


    console.log(`✅ OTP sent to ${formattedNumber}: SID ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (err) {
    console.error(`❌ Failed to send OTP to ${formattedNumber}:`, err.message);
    return { success: false, error: err.message };
  }
};
// import AWS from "aws-sdk";

// AWS.config.update({
//   region: 'us-east-1',
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
// });

// export const sns = new AWS.SNS({ apiVersion: '2010-03-31' });

// export const sendOtp = async (mobileNo, otp) => {
//   const formattedNumber = `+91${mobileNo}`;

//   const message = `Your OTP from Clozzet India is: ${otp}. It is valid for 10 minutes.`;

//   const params = {
//     Message: message,
//     PhoneNumber: formattedNumber,
//     MessageAttributes: {
//       'AWS.SNS.SMS.SMSType': {
//         DataType: 'String',
//         StringValue: 'Transactional',
//       },
//     },
//   };

//   try {
//     const result = await sns.publish(params).promise();
//     console.log(`OTP sent to ${formattedNumber}:`, result.MessageId);
//     return { success: true, messageId: result.MessageId };
//   } catch (err) {
//     console.error(`❌ Failed to send OTP to ${formattedNumber}:`, err);
//     return { success: false, error: err };
//   }
// };
