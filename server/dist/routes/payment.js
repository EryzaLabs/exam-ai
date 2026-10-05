"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
// Function to get Razorpay instance with current env keys
const getRazorpayInstance = () => {
    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummykey12345';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'dummysecret1234567890123';
    return new razorpay_1.default({ key_id, key_secret });
};
// POST /api/payment/create-order
router.post('/create-order', async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt = 'receipt_order_1' } = req.body;
        if (!amount || amount < 100) {
            return res.status(400).json({ error: 'Amount must be at least 100 paise' });
        }
        const options = {
            amount: amount, // Assuming frontend sends paise
            currency,
            receipt,
        };
        const instance = getRazorpayInstance();
        const order = await instance.orders.create(options);
        if (!order)
            return res.status(500).json({ error: 'Failed to create order' });
        res.json(order);
    }
    catch (error) {
        console.error('Error creating order:', error);
        // Handle auth failures (return 401)
        if (error.statusCode === 401) {
            return res.status(401).json({ error: 'Authentication failed with Razorpay API' });
        }
        res.status(500).json({ error: error.message });
    }
});
// POST /api/payment/verify
router.post('/verify', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const key_secret = process.env.RAZORPAY_KEY_SECRET || 'dummysecret1234567890123';
        const expectedSignature = crypto_1.default
            .createHmac('sha256', key_secret)
            .update(body.toString())
            .digest('hex');
        const isAuthentic = expectedSignature === razorpay_signature;
        if (isAuthentic) {
            // Payment is successful
            res.json({ success: true, message: 'Payment verified successfully' });
        }
        else {
            // Signature mismatch: return 400
            res.status(400).json({ success: false, message: 'Invalid signature' });
        }
    }
    catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=payment.js.map