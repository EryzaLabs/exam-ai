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
  onError: (error: string) => void
) => {
  try {
    if (Platform.OS !== 'web') {
      // In a real app, you would use react-native-razorpay here
      // For this demo which focuses on the website, we fallback to a mock success
      console.log('Simulating payment on native app');
      onSuccess();
      return;
    }

    // Bypass Razorpay for local development to allow easy testing/restoring of purchases
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      console.log('Simulating payment success on localhost');
      onSuccess();
      return;
    }

    await loadRazorpayScript();

    // 1. Create order on the server
    const orderResponse = await fetch(`${RAZORPAY_API_URL}/payment/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 50000, currency: 'INR' }) // 50000 paise = 500 INR
    });
    
    if (!orderResponse.ok) {
      throw new Error('Failed to create order');
    }
    
    const order = await orderResponse.json();

    // 2. Open Razorpay Checkout
    const options = {
      key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_dummykey12345', 
      amount: order.amount,
      currency: order.currency,
      name: 'UPSC Principal Exam',
      description: 'Unlimited Mock Tests Series',
      order_id: order.id,
      handler: async function (response: any) {
        // 3. Verify Payment
        try {
          const verifyResponse = await fetch(`${RAZORPAY_API_URL}/payment/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
          });
          
          const verifyResult = await verifyResponse.json();
          if (verifyResult.success) {
            onSuccess();
          } else {
            onError('Payment verification failed');
          }
        } catch (e) {
          onError('Server verification error');
        }
      },
      prefill: {
        name: 'Scholar',
        email: 'scholar@example.com',
        contact: '9999999999'
      },
      theme: {
        color: '#4A90E2'
      },
      modal: {
        ondismiss: function() {
          onError('Payment cancelled by user');
        }
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', function (response: any){
      onError(response.error.description);
    });
    rzp.open();
    
  } catch (error: any) {
    console.error('Payment Error:', error);
    onError(error.message || 'Payment failed');
  }
};
