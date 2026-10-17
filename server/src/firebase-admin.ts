import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let isInitialized = false;

export function getFirebaseAdmin() {
  if (isInitialized) {
    return admin;
  }

  try {
    // 1. Check for service account JSON string in env
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountEnv) {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || 'exam-ai-a92e0',
      });
      isInitialized = true;
      console.log('[Firebase Admin] Initialized with FIREBASE_SERVICE_ACCOUNT env');
      return admin;
    }

    // 2. Check for serviceAccountKey.json file in server/ or root
    const possiblePaths = [
      path.resolve(__dirname, '../serviceAccountKey.json'),
      path.resolve(__dirname, '../../serviceAccountKey.json'),
      path.resolve(process.cwd(), 'serviceAccountKey.json'),
    ];

    for (const keyPath of possiblePaths) {
      if (fs.existsSync(keyPath)) {
        const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(keyData),
          projectId: keyData.project_id || 'exam-ai-a92e0',
        });
        isInitialized = true;
        console.log(`[Firebase Admin] Initialized with key file: ${keyPath}`);
        return admin;
      }
    }

    // 3. Fallback: Initialize with project ID
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'exam-ai-a92e0',
    });
    isInitialized = true;
    console.log('[Firebase Admin] Initialized with default project config (exam-ai-a92e0)');
    return admin;
  } catch (error: any) {
    console.warn('[Firebase Admin] Initialization warning:', error.message);
    if (!admin.apps.length) {
      try {
        admin.initializeApp({ projectId: 'exam-ai-a92e0' });
        isInitialized = true;
      } catch (e) {}
    }
    return admin;
  }
}

/**
 * Backend function to write subscription status using Firebase Admin SDK.
 * Bypasses Firestore Security Rules completely.
 */
export async function recordBackendSubscription({
  uid,
  orderId,
  amount,
  currency = 'INR',
  customerEmail,
  customerPhone,
  periodDays = 365,
}: {
  uid: string;
  orderId: string;
  amount: number;
  currency?: string;
  customerEmail?: string;
  customerPhone?: string;
  periodDays?: number;
}): Promise<boolean> {
  try {
    const adminInstance = getFirebaseAdmin();
    const db = adminInstance.firestore();

    const now = Date.now();
    const periodEnd = now + periodDays * 24 * 60 * 60 * 1000;
    const periodEndTimestamp = admin.firestore.Timestamp.fromMillis(periodEnd);

    console.log(`[Firebase Admin] Writing active subscription for UID: ${uid}, Order: ${orderId}`);

    // 1. Write to subscriptions/{uid} (strict rule: read: if auth.uid == uid; write: if false)
    await db.doc(`subscriptions/${uid}`).set(
      {
        uid,
        status: 'active',
        isSubscribed: true,
        orderId,
        amount,
        currency,
        currentPeriodEnd: periodEndTimestamp,
        customerEmail: customerEmail || '',
        customerPhone: customerPhone || '',
        paymentGateway: 'cashfree',
        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 2. Also update users/{uid} for dual-sync and profile queries
    await db.doc(`users/${uid}`).set(
      {
        isSubscribed: true,
        subscriptionStatus: 'active',
        subscriptionOrderId: orderId,
        subscriptionPeriodEnd: periodEndTimestamp,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`[Firebase Admin] Successfully activated subscription for UID: ${uid}`);
    return true;
  } catch (err: any) {
    console.error(`[Firebase Admin] Error writing subscription to Firestore:`, err);
    return false;
  }
}
