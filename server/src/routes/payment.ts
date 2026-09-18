import { Router, Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const router = Router();

// Ensure keys are present or provide fallbacks for development/testing
const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummykey12345';
const key_secret = process.env.RAZORPAY_KEY_SECRET || 'dummysecret1234567890123';

const instance = new Razorpay({
  key_id,
  key_secret,
});

// POST /api/payment/create-order
router.post('/create-order', async (req: Request, res: Response) => {
  try {
    const { amount = 500, currency = 'INR', receipt = 'receipt_order_1' } = req.body;

    // amount should be in paise for INR (500 INR = 50000 paise)
    const options = {
      amount: amount * 100,
      currency,
      receipt,
      payment_capture: 1, // Auto capture
    };

    const order = await instance.orders.create(options);
    if (!order) return res.status(500).json({ error: 'Failed to create order' });

    res.json(order);
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payment/verify
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Payment is successful
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
