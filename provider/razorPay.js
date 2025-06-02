import { razorpay } from "../config/razorPay.js";

export const rezerpayRefundPayment = async(paymentId, amountInRupees, reason = 'Requested by customer')=> {
  const refund = await razorpay.payments.refund(paymentId, {
    amount: amountInRupees * 100,
    notes: {
      reason,
    },
  });

  return refund;
}