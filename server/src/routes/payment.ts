import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { recordBackendSubscription, getLocalSubscriptions, saveLocalSubscription, getFirebaseAdmin, getFirestoreAdmin } from '../firebase-admin';


const router = Router();

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

// ==============================================================================
// SUBSCRIPTION PLANS CONFIGURATION
// ==============================================================================
export interface SubscriptionPlan {
  id: 'daily' | 'weekly' | 'monthly' | 'lifetime';
  name: string;
  tagline: string;
  price: number;
  originalPrice: number;
  durationLabel: string;
  periodDays: number;
  badge?: string;
  popular?: boolean;
  bestValue?: boolean;
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  daily: {
    id: 'daily',
    name: 'Daily Pass',
    tagline: '24 Hours Full Access',
    price: 9,
    originalPrice: 49,
    durationLabel: '1 Day',
    periodDays: 1,
    badge: 'Quick Revision',
  },
  weekly: {
    id: 'weekly',
    name: 'Weekly Pass',
    tagline: '7 Days Intensive Prep',
    price: 49,
    originalPrice: 149,
    durationLabel: '7 Days',
    periodDays: 7,
    badge: 'Sprint Week',
  },
  monthly: {
    id: 'monthly',
    name: 'Monthly Pass',
    tagline: '30 Days Complete Access',
    price: 199,
    originalPrice: 399,
    durationLabel: '30 Days',
    periodDays: 30,
    badge: 'Most Popular',
    popular: true,
  },
  lifetime: {
    id: 'lifetime',
    name: 'Lifetime Pass',
    tagline: 'Forever Access · Never Pay Again',
    price: 499,
    originalPrice: 1999,
    durationLabel: 'Forever',
    periodDays: 36500,
    badge: 'Best Value',
    bestValue: true,
  },
};

export function resolvePlanAndPeriod(planId?: string, amount?: number): { plan: SubscriptionPlan; periodDays: number } {
  if (planId && SUBSCRIPTION_PLANS[planId.toLowerCase()]) {
    const plan = SUBSCRIPTION_PLANS[planId.toLowerCase()];
    return { plan, periodDays: plan.periodDays };
  }
  const amt = Math.round(Number(amount) || 0);
  if (amt === 9) return { plan: SUBSCRIPTION_PLANS.daily, periodDays: 1 };
  if (amt === 49) return { plan: SUBSCRIPTION_PLANS.weekly, periodDays: 7 };
  if (amt === 199) return { plan: SUBSCRIPTION_PLANS.monthly, periodDays: 30 };
  if (amt === 499) return { plan: SUBSCRIPTION_PLANS.lifetime, periodDays: 36500 };
  return { plan: SUBSCRIPTION_PLANS.lifetime, periodDays: 36500 };
}

// In-memory cache for recent order plan metadata
export const orderPlansCache: Record<string, { plan: SubscriptionPlan; periodDays: number; uid?: string }> = {};

// ==============================================================================
// COUPON CODES CONFIGURATION
// ==============================================================================
export interface CouponDefinition {
  code: string;
  discountType: 'free' | 'percent' | 'flat' | 'fixed_price';
  value: number; // 100 for 100%, or flat amount in INR
  description: string;
  active: boolean;
}

export const COUPONS: Record<string, CouponDefinition> = {
  'ATROCIOUS2512': {
    code: 'Atrocious2512',
    discountType: 'free',
    value: 100,
    description: '100% OFF • VIP Lifetime Full Premium Access',
    active: true,
  },
  'ATROCIOUS1': {
    code: 'Atrocious1',
    discountType: 'fixed_price',
    value: 1,
    description: 'Special ₹1 Access Pass • Pay ₹1 to Unlock Full Access',
    active: true,
  },
  'TEST1RS': {
    code: 'TEST1RS',
    discountType: 'fixed_price',
    value: 1,
    description: 'Special ₹1 Access Pass • Pay ₹1 to Unlock Full Access',
    active: true,
  },
  'RUPEE1': {
    code: 'RUPEE1',
    discountType: 'fixed_price',
    value: 1,
    description: 'Special ₹1 Access Pass • Pay ₹1 to Unlock Full Access',
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

export const calculateDiscount = (coupon: CouponDefinition, basePrice: number = 499) => {
  if (coupon.discountType === 'free') {
    return {
      discountAmount: basePrice,
      finalAmount: 0,
      isFree: true,
    };
  }
  if (coupon.discountType === 'fixed_price') {
    const finalAmount = Math.max(1, coupon.value);
    return {
      discountAmount: Math.max(0, basePrice - finalAmount),
      finalAmount,
      isFree: false,
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

/**
 * POST /api/payment/create-order
 * Creates an order on Cashfree Payment Gateway and returns the payment_session_id
 */

/**
 * GET /api/payment/plans
 * Returns available subscription plans
 */
router.get('/plans', (_req: Request, res: Response) => {
  res.json({
    success: true,
    plans: Object.values(SUBSCRIPTION_PLANS),
  });
});

router.post('/create-order', async (req: Request, res: Response) => {
  try {
    const {
      amount,
      currency = 'INR',
      customer_id,
      uid,
      customer_name = 'Aspirant',
      customer_email = 'aspirant@exam-ai.com',
      customer_phone = '9999999999',
      return_url,
      coupon_code,
      plan_id = 'lifetime',
    } = req.body;

    const { plan, periodDays } = resolvePlanAndPeriod(plan_id, amount);
    let finalAmount = Number(amount) || plan.price;

    if (finalAmount <= 0) {
      return res.status(400).json({ error: 'Valid order amount is required' });
    }

    // Amount normalization:
    // If frontend sends in paise (>= 10000, e.g. 49900), convert to rupees (499.00)
    if (finalAmount >= 10000) {
      finalAmount = Math.round((finalAmount / 100) * 100) / 100;
    }

    if (coupon_code) {
      const cleanCoupon = String(coupon_code).trim().toUpperCase();
      const coupon = COUPONS[cleanCoupon];
      if (coupon && coupon.active) {
        const { finalAmount: calcAmount } = calculateDiscount(coupon, finalAmount || plan.price);
        finalAmount = calcAmount;
      }
    }

    const { appId, secretKey, env, apiVersion, baseUrl } = getCashfreeConfig();

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const orderId = `order_${timestamp}_${randomSuffix}`;
    const customerId =
      uid || customer_id || `cust_${timestamp}_${Math.random().toString(36).substring(2, 6)}`;

    orderPlansCache[orderId] = {
      plan,
      periodDays: plan.periodDays,
      uid: customerId,
    };

    const cleanPhone = (customer_phone || '').toString().replace(/\D/g, '').slice(-10);
    const validPhone = cleanPhone.length === 10 ? cleanPhone : '9999999999';

    // Prepare Cashfree API payload according to v2023-08-01 specs
    const orderPayload: any = {
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
        return_url:
          return_url && return_url.startsWith('https://')
            ? return_url
            : env === 'PRODUCTION'
            ? 'https://exambc.alaotach.com/premium?order_id={order_id}'
            : 'https://payments-test.cashfree.com/return?order_id={order_id}',
      },
      order_note: `${plan.name} - Astra Exam AI Premium Pass`,
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

    const data: any = await response.json();

    if (!response.ok) {
      console.error('[Cashfree] Order creation error response:', data);

      // If credentials fail in Sandbox / Dev mode, provide sandbox test session
      if (data?.type === 'authentication_error' && env !== 'PRODUCTION') {
        console.warn(
          '[Cashfree] Warning: Cashfree Sandbox returned authentication_error. Providing sandbox test fallback session. To use real Cashfree Sandbox, please set your CASHFREE_APP_ID and CASHFREE_SECRET_KEY in server/.env.'
        );
        return res.json({
          order_id: orderId,
          payment_session_id: `sandbox_session_${timestamp}_${randomSuffix}`,
          order_status: 'ACTIVE',
          order_amount: finalAmount,
          order_currency: currency,
          is_sandbox_fallback: true,
          message:
            'Cashfree Sandbox session generated (Place your merchant CASHFREE_APP_ID & CASHFREE_SECRET_KEY in server/.env for live Cashfree transactions)',
        });
      }

      return res.status(response.status).json({
        error: data.message || 'Failed to create order with Cashfree',
        details: data,
      });
    }

    console.log(`[Cashfree] Order created successfully. Session ID: ${data.payment_session_id}`);

    const paymentLink =
      env === 'PRODUCTION'
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
  } catch (error: any) {
    console.error('[Cashfree] Exception in create-order:', error);
    res.status(500).json({ error: error.message || 'Internal server error creating payment order' });
  }
});

/**
 * POST /api/payment/verify
 * Verifies the status of an order on Cashfree and writes subscription to Firestore
 */
router.post('/verify', async (req: Request, res: Response) => {
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

    const data: any = await response.json();

    if (!response.ok) {
      console.error('[Cashfree] Verification failed:', data);

      if (data?.type === 'authentication_error' && env !== 'PRODUCTION') {
        console.log(`[Cashfree] Sandbox verification simulated for ${order_id}`);
        if (uid) {
          const cachedPlan = orderPlansCache[order_id];
          const { plan, periodDays } = cachedPlan || resolvePlanAndPeriod(req.body.plan_id, 499);
          await recordBackendSubscription({
            uid,
            orderId: order_id,
            amount: plan.price,
            periodDays,
            planId: plan.id,
            planName: plan.name,
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
        const cachedPlan = orderPlansCache[data.order_id];
        const { plan, periodDays } = cachedPlan || resolvePlanAndPeriod(req.body.plan_id, data.order_amount);

        await recordBackendSubscription({
          uid: targetUid,
          orderId: data.order_id,
          amount: data.order_amount,
          currency: data.order_currency,
          customerEmail: data.customer_details?.customer_email,
          customerPhone: data.customer_details?.customer_phone,
          periodDays,
          planId: plan.id,
          planName: plan.name,
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
  } catch (error: any) {
    console.error('[Cashfree] Exception in verify order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/payment/status/:orderId
 * Fetch full order and payment details for a given order ID
 */
router.get('/status/:orderId', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('[Cashfree] Exception in get status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payment/validate-coupon
 * Verifies coupon validity and calculates discount
 */
router.post('/validate-coupon', (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ valid: false, error: 'Please enter a coupon code' });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = COUPONS[cleanCode];

    if (!coupon || !coupon.active) {
      return res.status(404).json({ valid: false, error: 'Invalid or expired coupon code' });
    }

    const { amount, plan_id } = req.body;
    let basePrice = 499;
    if (amount) basePrice = Number(amount);
    else if (plan_id && SUBSCRIPTION_PLANS[String(plan_id).toLowerCase()]) {
      basePrice = SUBSCRIPTION_PLANS[String(plan_id).toLowerCase()].price;
    }
    const { discountAmount, finalAmount, isFree } = calculateDiscount(coupon, basePrice);

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
  } catch (error: any) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ valid: false, error: error.message });
  }
});

/**
 * POST /api/payment/redeem-coupon
 * Direct redemption for 100% free / VIP coupons (e.g. Atrocious2512)
 */
router.post('/redeem-coupon', async (req: Request, res: Response) => {
  try {
    const { code, uid, customer_email, customer_phone, plan_id } = req.body;

    if (!uid) {
      return res.status(400).json({ success: false, error: 'Please log in to redeem your coupon code' });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Coupon code is required' });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = COUPONS[cleanCode];

    if (!coupon || !coupon.active) {
      return res.status(404).json({ success: false, error: 'Invalid or expired coupon code' });
    }

    const { plan, periodDays } = resolvePlanAndPeriod(plan_id, 499);
    const { discountAmount, finalAmount, isFree } = calculateDiscount(coupon, plan.price);

    if (isFree) {
      // 100% Free VIP activation directly in Firestore via Admin SDK
      const orderId = `coupon_${cleanCode.toLowerCase()}_${Date.now()}`;
      const activated = await recordBackendSubscription({
        uid,
        orderId,
        amount: 0,
        currency: 'INR',
        customerEmail: customer_email || '',
        customerPhone: customer_phone || '',
        periodDays: plan.id === 'lifetime' ? 36500 : periodDays,
        planId: plan.id,
        planName: plan.name,
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
  } catch (error: any) {
    console.error('Error redeeming coupon:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/payment/webhook
 * Cashfree webhook handler for real-time order/payment notifications
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const { secretKey } = getCashfreeConfig();

    if (signature && timestamp && rawBody) {
      const signatureData = timestamp + rawBody;
      const computedSignature = crypto
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

    const isPaidEvent =
      eventType === 'PAYMENT_SUCCESS_WEBHOOK' ||
      eventType === 'ORDER_PAID' ||
      paymentData?.payment_status === 'SUCCESS' ||
      orderData?.order_status === 'PAID';

    if (isPaidEvent) {
      const targetUid =
        req.body?.data?.customer_details?.customer_id ||
        orderData?.customer_details?.customer_id;
      const orderId = orderData?.order_id || paymentData?.order_id;
      const amount = orderData?.order_amount || paymentData?.payment_amount || 499;

      if (targetUid && orderId) {
        const cachedPlan = orderPlansCache[orderId];
        const { plan, periodDays } = cachedPlan || resolvePlanAndPeriod(undefined, amount);

        await recordBackendSubscription({
          uid: targetUid,
          orderId,
          amount,
          customerEmail: req.body?.data?.customer_details?.customer_email,
          customerPhone: req.body?.data?.customer_details?.customer_phone,
          periodDays,
          planId: plan.id,
          planName: plan.name,
        });
      }
    }

    res.status(200).json({ status: 'ok', received: true });
  } catch (error: any) {
    console.error('[Cashfree Webhook] Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
});


/**
 * GET /api/payment/subscription-status/:uid
 * Checks subscription status across local disk registry and Firestore
 */
router.get('/subscription-status/:uid', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    if (!uid) {
      return res.status(400).json({ isSubscribed: false, error: 'UID required' });
    }

    // 1. Check local persistent disk registry
    const localSubs = getLocalSubscriptions();
    if (localSubs[uid] && (localSubs[uid].isSubscribed || localSubs[uid].status === 'active')) {
      return res.json({
        isSubscribed: true,
        status: 'active',
        source: 'local',
        subscription: localSubs[uid],
      });
    }

    // 2. Check Firestore if initialized
    try {
      const db = getFirestoreAdmin();
      if (db) {
        const docSnap = await db.doc(`subscriptions/${uid}`).get();
        if (docSnap.exists) {
          const d = docSnap.data();
          if (d?.status === 'active' || d?.isSubscribed === true) {
            saveLocalSubscription(uid, d);
            return res.json({
              isSubscribed: true,
              status: 'active',
              source: 'firestore',
              subscription: d,
            });
          }
        }
      }
    } catch (e) {}

    return res.json({ isSubscribed: false, status: 'inactive' });
  } catch (error: any) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({ isSubscribed: false, error: error.message });
  }
});

export default router;
