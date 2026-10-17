"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDiscount = exports.COUPONS = void 0;
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const firebase_admin_1 = require("../firebase-admin");
const router = (0, express_1.Router)();
// Cashfree Gateway Configuration
const getCashfreeConfig = () => {
    const env = (process.env.CASHFREE_ENV || 'SANDBOX').toUpperCase();
    const isProd = env === 'PRODUCTION';
    const appId = isProd
        ? process.env.CASHFREE_PROD_APP_ID || process.env.CASHFREE_APP_ID || ''
        : process.env.CASHFREE_TEST_APP_ID || process.env.CASHFREE_APP_ID || '';
    const secretKey = isProd
        ? process.env.CASHFREE_PROD_SECRET_KEY || process.env.CASHFREE_SECRET_KEY || ''
        : process.env.CASHFREE_TEST_SECRET_KEY || process.env.CASHFREE_SECRET_KEY || '';
    const apiVersion = process.env.CASHFREE_API_VERSION || '2023-08-01';
    const baseUrl = isProd
        ? 'https://api.cashfree.com/pg'
        : 'https://sandbox.cashfree.com/pg';
    return {
        appId,
        secretKey,
        env,
        apiVersion,
        baseUrl,
    };
};
exports.COUPONS = {
    'ATROCIOUS2512': {
        code: 'Atrocious2512',
        discountType: 'free',
        value: 100,
        description: '100% OFF • VIP Lifetime Full Premium Access',
        active: true,
    },
    'EXAMAI50': {
        code: 'EXAMAI50',
        discountType: 'percent',
        value: 50,
        description: '50% OFF • Special Aspirant Discount',
        active: true,
    },
    'EARLYBIRD': {
        code: 'EARLYBIRD',
        discountType: 'flat',
        value: 200,
        description: 'Flat ₹200 OFF • Early Bird Offer',
        active: true,
    },
};
const calculateDiscount = (coupon, basePrice = 499) => {
    if (coupon.discountType === 'free') {
        return {
            discountAmount: basePrice,
            finalAmount: 0,
            isFree: true,
        };
    }
    if (coupon.discountType === 'percent') {
        const discount = Math.round((basePrice * coupon.value) / 100);
        return {
            discountAmount: discount,
            finalAmount: Math.max(1, basePrice - discount),
            isFree: false,
        };
    }
    if (coupon.discountType === 'flat') {
        const discount = Math.min(basePrice - 1, coupon.value);
        return {
            discountAmount: discount,
            finalAmount: Math.max(1, basePrice - discount),
            isFree: false,
        };
    }
    return { discountAmount: 0, finalAmount: basePrice, isFree: false };
};
exports.calculateDiscount = calculateDiscount;
/**
 * POST /api/payment/create-order
 * Creates an order on Cashfree Payment Gateway and returns the payment_session_id
 */
router.post('/create-order', async (req, res) => {
    try {
        const { amount, currency = 'INR', customer_id, uid, customer_name = 'Aspirant', customer_email = 'aspirant@exam-ai.com', customer_phone = '9999999999', return_url, coupon_code, } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid order amount is required' });
        }
        // Amount normalization:
        // If frontend sends in paise (>= 10000, e.g. 49900), convert to rupees (499.00)
        let finalAmount = Number(amount);
        if (finalAmount >= 10000) {
            finalAmount = Math.round((finalAmount / 100) * 100) / 100;
        }
        if (coupon_code) {
            const cleanCoupon = String(coupon_code).trim().toUpperCase();
            const coupon = exports.COUPONS[cleanCoupon];
            if (coupon && coupon.active) {
                const { finalAmount: calcAmount } = (0, exports.calculateDiscount)(coupon, finalAmount || 499);
                finalAmount = calcAmount;
            }
        }
        const { appId, secretKey, env, apiVersion, baseUrl } = getCashfreeConfig();
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 7);
        const orderId = `order_${timestamp}_${randomSuffix}`;
        const customerId = uid || customer_id || `cust_${timestamp}_${Math.random().toString(36).substring(2, 6)}`;
        const cleanPhone = (customer_phone || '').toString().replace(/\D/g, '').slice(-10);
        const validPhone = cleanPhone.length === 10 ? cleanPhone : '9999999999';
        // Prepare Cashfree API payload according to v2023-08-01 specs
        const orderPayload = {
            order_id: orderId,
            order_amount: finalAmount,
            order_currency: currency,
            customer_details: {
                customer_id: customerId,
                customer_phone: validPhone,
                customer_name: customer_name || 'Aspirant',
                customer_email: customer_email || 'aspirant@exam-ai.com',
            },
            order_meta: {
                return_url: return_url && return_url.startsWith('https://')
                    ? return_url
                    : env === 'PRODUCTION'
                        ? 'https://exambc.alaotach.com/premium?order_id={order_id}'
                        : 'https://payments-test.cashfree.com/return?order_id={order_id}',
            },
            order_note: 'UPSC Principal 2026 - Premium All-Access Pass',
        };
        console.log(`[Cashfree] Creating order ${orderId} for ₹${finalAmount} on ${baseUrl}`);
        const response = await fetch(`${baseUrl}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': appId,
                'x-client-secret': secretKey,
                'x-api-version': apiVersion,
            },
            body: JSON.stringify(orderPayload),
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('[Cashfree] Order creation error response:', data);
            // If credentials fail in Sandbox / Dev mode, provide sandbox test session
            if (data?.type === 'authentication_error' && env !== 'PRODUCTION') {
                console.warn('[Cashfree] Warning: Cashfree Sandbox returned authentication_error. Providing sandbox test fallback session. To use real Cashfree Sandbox, please set your CASHFREE_APP_ID and CASHFREE_SECRET_KEY in server/.env.');
                return res.json({
                    order_id: orderId,
                    payment_session_id: `sandbox_session_${timestamp}_${randomSuffix}`,
                    order_status: 'ACTIVE',
                    order_amount: finalAmount,
                    order_currency: currency,
                    is_sandbox_fallback: true,
                    message: 'Cashfree Sandbox session generated (Place your merchant CASHFREE_APP_ID & CASHFREE_SECRET_KEY in server/.env for live Cashfree transactions)',
                });
            }
            return res.status(response.status).json({
                error: data.message || 'Failed to create order with Cashfree',
                details: data,
            });
        }
        console.log(`[Cashfree] Order created successfully. Session ID: ${data.payment_session_id}`);
        const paymentLink = env === 'PRODUCTION'
            ? `https://payments.cashfree.com/order/#/${data.payment_session_id}`
            : `https://payments-test.cashfree.com/order/#/${data.payment_session_id}`;
        res.json({
            order_id: data.order_id,
            payment_session_id: data.payment_session_id,
            payment_link: paymentLink,
            order_status: data.order_status,
            order_amount: data.order_amount,
            order_currency: data.order_currency,
            cf_order_id: data.cf_order_id,
        });
    }
    catch (error) {
        console.error('[Cashfree] Exception in create-order:', error);
        res.status(500).json({ error: error.message || 'Internal server error creating payment order' });
    }
});
/**
 * POST /api/payment/verify
 * Verifies the status of an order on Cashfree and writes subscription to Firestore
 */
router.post('/verify', async (req, res) => {
    try {
        const { order_id, uid } = req.body;
        if (!order_id) {
            return res.status(400).json({ success: false, message: 'order_id is required' });
        }
        const { appId, secretKey, env, apiVersion, baseUrl } = getCashfreeConfig();
        console.log(`[Cashfree] Verifying order ${order_id} on ${baseUrl}`);
        const response = await fetch(`${baseUrl}/orders/${encodeURIComponent(order_id)}`, {
            method: 'GET',
            headers: {
                'x-client-id': appId,
                'x-client-secret': secretKey,
                'x-api-version': apiVersion,
            },
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('[Cashfree] Verification failed:', data);
            if (data?.type === 'authentication_error' && env !== 'PRODUCTION') {
                console.log(`[Cashfree] Sandbox verification simulated for ${order_id}`);
                if (uid) {
                    await (0, firebase_admin_1.recordBackendSubscription)({
                        uid,
                        orderId: order_id,
                        amount: 499,
                    });
                }
                return res.json({
                    success: true,
                    order_id,
                    order_status: 'PAID',
                    message: 'Cashfree Sandbox payment verified (test mode)',
                });
            }
            return res.status(response.status).json({
                success: false,
                message: data.message || 'Unable to fetch order status',
                data,
            });
        }
        console.log(`[Cashfree] Order ${order_id} status: ${data.order_status}`);
        const isPaid = data.order_status === 'PAID';
        if (isPaid) {
            const targetUid = uid || data.customer_details?.customer_id;
            if (targetUid) {
                await (0, firebase_admin_1.recordBackendSubscription)({
                    uid: targetUid,
                    orderId: data.order_id,
                    amount: data.order_amount,
                    currency: data.order_currency,
                    customerEmail: data.customer_details?.customer_email,
                    customerPhone: data.customer_details?.customer_phone,
                });
            }
        }
        res.json({
            success: isPaid,
            order_id: data.order_id,
            order_status: data.order_status,
            order_amount: data.order_amount,
            order_currency: data.order_currency,
            message: isPaid ? 'Payment verified successfully' : `Order status: ${data.order_status}`,
            details: data,
        });
    }
    catch (error) {
        console.error('[Cashfree] Exception in verify order:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * GET /api/payment/status/:orderId
 * Fetch full order and payment details for a given order ID
 */
router.get('/status/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }
        const { appId, secretKey, apiVersion, baseUrl } = getCashfreeConfig();
        const orderRes = await fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}`, {
            method: 'GET',
            headers: {
                'x-client-id': appId,
                'x-client-secret': secretKey,
                'x-api-version': apiVersion,
            },
        });
        const orderData = await orderRes.json();
        // Fetch payments for the order as well
        const paymentsRes = await fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}/payments`, {
            method: 'GET',
            headers: {
                'x-client-id': appId,
                'x-client-secret': secretKey,
                'x-api-version': apiVersion,
            },
        });
        const paymentsData = paymentsRes.ok ? await paymentsRes.json() : [];
        res.json({
            order: orderData,
            payments: paymentsData,
        });
    }
    catch (error) {
        console.error('[Cashfree] Exception in get status:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/payment/validate-coupon
 * Verifies coupon validity and calculates discount
 */
router.post('/validate-coupon', (req, res) => {
    try {
        const { code } = req.body;
        if (!code || typeof code !== 'string') {
            return res.status(400).json({ valid: false, error: 'Please enter a coupon code' });
        }
        const cleanCode = code.trim().toUpperCase();
        const coupon = exports.COUPONS[cleanCode];
        if (!coupon || !coupon.active) {
            return res.status(404).json({ valid: false, error: 'Invalid or expired coupon code' });
        }
        const { discountAmount, finalAmount, isFree } = (0, exports.calculateDiscount)(coupon, 499);
        return res.json({
            valid: true,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.value,
            discountAmount,
            finalAmount,
            isFree,
            description: coupon.description,
        });
    }
    catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({ valid: false, error: error.message });
    }
});
/**
 * POST /api/payment/redeem-coupon
 * Direct redemption for 100% free / VIP coupons (e.g. Atrocious2512)
 */
router.post('/redeem-coupon', async (req, res) => {
    try {
        const { code, uid, customer_email, customer_phone } = req.body;
        if (!uid) {
            return res.status(400).json({ success: false, error: 'Please log in to redeem your coupon code' });
        }
        if (!code || typeof code !== 'string') {
            return res.status(400).json({ success: false, error: 'Coupon code is required' });
        }
        const cleanCode = code.trim().toUpperCase();
        const coupon = exports.COUPONS[cleanCode];
        if (!coupon || !coupon.active) {
            return res.status(404).json({ success: false, error: 'Invalid or expired coupon code' });
        }
        const { discountAmount, finalAmount, isFree } = (0, exports.calculateDiscount)(coupon, 499);
        if (isFree) {
            // 100% Free VIP activation directly in Firestore via Admin SDK
            const orderId = `coupon_${cleanCode.toLowerCase()}_${Date.now()}`;
            const activated = await (0, firebase_admin_1.recordBackendSubscription)({
                uid,
                orderId,
                amount: 0,
                currency: 'INR',
                customerEmail: customer_email || '',
                customerPhone: customer_phone || '',
                periodDays: 3650, // 10 years / Lifetime
            });
            if (!activated) {
                return res.status(500).json({ success: false, error: 'Failed to activate coupon subscription' });
            }
            console.log(`[Coupon] User ${uid} redeemed 100% free coupon ${coupon.code}`);
            return res.json({
                success: true,
                isFree: true,
                code: coupon.code,
                message: `🎉 Coupon '${coupon.code}' applied! 100% Full Lifetime Premium Access activated.`,
            });
        }
        // For partial discount coupons, return discounted price info
        return res.json({
            success: true,
            isFree: false,
            code: coupon.code,
            discountAmount,
            finalAmount,
            message: `Coupon '${coupon.code}' applied. New amount: ₹${finalAmount}`,
        });
    }
    catch (error) {
        console.error('Error redeeming coupon:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * POST /api/payment/webhook
 * Cashfree webhook handler for real-time order/payment notifications
 */
router.post('/webhook', async (req, res) => {
    try {
        const signature = req.headers['x-webhook-signature'];
        const timestamp = req.headers['x-webhook-timestamp'];
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const { secretKey } = getCashfreeConfig();
        if (signature && timestamp && rawBody) {
            const signatureData = timestamp + rawBody;
            const computedSignature = crypto_1.default
                .createHmac('sha256', secretKey)
                .update(signatureData)
                .digest('base64');
            if (computedSignature !== signature) {
                console.warn('[Cashfree Webhook] Signature mismatch');
                return res.status(400).json({ error: 'Invalid webhook signature' });
            }
            console.log('[Cashfree Webhook] Verified signature for event:', req.body?.type || req.body?.event);
        }
        // Process webhook event payload
        console.log('[Cashfree Webhook] Received payload:', JSON.stringify(req.body));
        const eventType = req.body?.type || req.body?.event;
        const orderData = req.body?.data?.order || req.body?.data;
        const paymentData = req.body?.data?.payment;
        const isPaidEvent = eventType === 'PAYMENT_SUCCESS_WEBHOOK' ||
            eventType === 'ORDER_PAID' ||
            paymentData?.payment_status === 'SUCCESS' ||
            orderData?.order_status === 'PAID';
        if (isPaidEvent) {
            const targetUid = req.body?.data?.customer_details?.customer_id ||
                orderData?.customer_details?.customer_id;
            const orderId = orderData?.order_id || paymentData?.order_id;
            const amount = orderData?.order_amount || paymentData?.payment_amount || 499;
            if (targetUid && orderId) {
                await (0, firebase_admin_1.recordBackendSubscription)({
                    uid: targetUid,
                    orderId,
                    amount,
                    customerEmail: req.body?.data?.customer_details?.customer_email,
                    customerPhone: req.body?.data?.customer_details?.customer_phone,
                });
            }
        }
        res.status(200).json({ status: 'ok', received: true });
    }
    catch (error) {
        console.error('[Cashfree Webhook] Error processing webhook:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=payment.js.map