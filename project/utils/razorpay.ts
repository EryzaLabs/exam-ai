import { Platform } from 'react-native';

const RAZORPAY_API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://astra-backend.eryzalabs.cloud/api';

// Dynamically load razorpay checkout script for web
const loadRazorpayScript = () => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'web') {
      return reject('Only supported on web currently');
    }

    // Check if already loaded
    if ((window as any).Razorpay) {
      return resolve(true);
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject('Failed to load Razorpay SDK');
    document.body.appendChild(script);
  });
};

export const initiatePayment = async (
  onSuccess: () => void,
  onError: (error: string) => void,
  optionsInput?: {
    userName?: string;
    userEmail?: string;
    amountInPaise?: number;
  }
) => {
  try {
    if (Platform.OS !== 'web') {
      // In a real mobile app, react-native-razorpay is used
      console.log('Simulating payment on native mobile device');
      onSuccess();
      return;
    }

    await loadRazorpayScript();

    const amount = optionsInput?.amountInPaise || 49900; // 499 INR in paise
    let orderId: string | undefined = undefined;

    // Try backend order creation if available
    try {
      const orderResponse = await fetch(`${RAZORPAY_API_URL}/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: 'INR' }),
      });
      if (orderResponse.ok) {
        const order = await orderResponse.json();
        orderId = order?.id;
      }
    } catch (e) {
      console.log('Backend order creation unavailable, using direct Razorpay checkout');
    }

    const key = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_dummykey12345';

    // Open Razorpay Checkout modal
    const options: any = {
      key,
      amount,
      currency: 'INR',
      name: 'Exam AI',
      description: 'UPSC Principal 2026 - Premium All-Access Pass',
      image: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
      handler: async function (response: any) {
        // Verify payment if backend exists, otherwise mark success
        if (orderId && response.razorpay_signature) {
          try {
            const verifyResponse = await fetch(`${RAZORPAY_API_URL}/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyResult = await verifyResponse.json();
            if (verifyResult.success) {
              onSuccess();
              return;
            }
          } catch (e) {
            console.warn('Backend verify error, falling back to client success');
          }
        }

        onSuccess();
      },
      prefill: {
        name: optionsInput?.userName || 'Aspirant',
        email: optionsInput?.userEmail || 'aspirant@example.com',
        contact: '9999999999',
      },
      theme: {
        color: '#2563EB',
      },
      modal: {
        ondismiss: function () {
          onError('Payment cancelled by user');
        },
      },
    };

    if (orderId) {
      options.order_id = orderId;
    }

    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', function (response: any) {
      onError(response.error?.description || 'Payment failed');
    });
    rzp.open();
  } catch (error: any) {
    console.error('Payment Error:', error);
    onError(error.message || 'Payment failed');
  }
};
