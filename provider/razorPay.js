import { razorpay } from "../config/razorPay.js";


export async function refundPayment(paymentId, amountInRupees, reason = 'Requested by customer') {
  const refund = await razorpay.payments.refund(paymentId, {
    amount: amountInRupees * 100, // convert to paisa
    notes: {
      reason,
    },
  });

  return refund;
}