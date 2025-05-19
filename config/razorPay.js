import Razorpay from 'razorpay';
console.log(process.env.RAZORPAY_KEY_ID,process.env.RAZORPAY_KEY_SECRET);

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default instance;
