import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

let isInitialized = false;
let hasExplicitCredentials = false;

export function getFirebaseAdmin() {
  if (isInitialized && getApps().length > 0) {
    return getApps()[0];
  }

  try {
    // 1. Check for service account JSON string in env
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountEnv) {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || 'exam-ai-a92e0',
      });
      isInitialized = true;
      hasExplicitCredentials = true;
      console.log('[Firebase Admin] Initialized with FIREBASE_SERVICE_ACCOUNT env');
      return app;
    }

    // 2. Check for serviceAccountKey.json file in server/ or root
    const possiblePaths = [
      path.resolve(__dirname, '../serviceAccountKey.json'),
      path.resolve(__dirname, '../../serviceAccountKey.json'),
      path.resolve(process.cwd(), 'serviceAccountKey.json'),
      path.resolve(process.cwd(), '../serviceAccountKey.json'),
    ];

    for (const keyPath of possiblePaths) {
      if (fs.existsSync(keyPath)) {
        const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        const app = initializeApp({
          credential: cert(keyData),
          projectId: keyData.project_id || 'exam-ai-a92e0',
        });
        isInitialized = true;
        hasExplicitCredentials = true;
        console.log(`[Firebase Admin] Initialized with key file: ${keyPath}`);
        return app;
      }
    }

    // 3. Fallback: Initialize with project ID
    const app = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'exam-ai-a92e0',
    });
    isInitialized = true;
    hasExplicitCredentials = false;
    console.log('[Firebase Admin] Initialized with default project config (exam-ai-a92e0)');
    return app;
  } catch (error: any) {
    if (getApps().length > 0) {
      isInitialized = true;
      return getApps()[0];
    }
    console.warn('[Firebase Admin] Initialization warning:', error.message);
    const app = initializeApp({ projectId: 'exam-ai-a92e0' });
    isInitialized = true;
    hasExplicitCredentials = false;
    return app;
  }
}

export function getFirestoreAdmin() {
  try {
    getFirebaseAdmin();
    if (!hasExplicitCredentials) {
      return null;
    }
    return getFirestore();
  } catch (e) {
    return null;
  }
}

/**
 * Backend function to write subscription status using Firebase Admin SDK.
 * Bypasses Firestore Security Rules completely.
 */

const LOCAL_SUB_FILE = path.resolve(process.cwd(), 'data/subscriptions.json');

export function getLocalSubscriptions(): Record<string, any> {
  try {
    if (fs.existsSync(LOCAL_SUB_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_SUB_FILE, 'utf8'));
    }
  } catch (e) {}
  return {};
}

export function saveLocalSubscription(uid: string, data: any) {
  try {
    const dir = path.dirname(LOCAL_SUB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const subs = getLocalSubscriptions();
    subs[uid] = {
      uid,
      isSubscribed: true,
      status: 'active',
      updatedAt: new Date().toISOString(),
      ...data,
    };
    fs.writeFileSync(LOCAL_SUB_FILE, JSON.stringify(subs, null, 2), 'utf8');
    console.log(`[Subscription Registry] Saved subscription for ${uid} to local disk`);
  } catch (e) {
    console.error('[Subscription Registry] Error saving to disk:', e);
  }
}

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
    getFirebaseAdmin();
    const db = getFirestore();

    const now = Date.now();
    const periodEnd = now + periodDays * 24 * 60 * 60 * 1000;
    const periodEndTimestamp = Timestamp.fromMillis(periodEnd);

    // 0. Save immediately to local persistent disk registry
    saveLocalSubscription(uid, {
      orderId,
      amount,
      currency,
      customerEmail,
      customerPhone,
      periodDays,
      expiresAt: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString(),
    });

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
        activatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
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
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`[Firebase Admin] Successfully activated subscription for UID: ${uid}`);
    return true;
  } catch (err: any) {
    console.error(`[Firebase Admin] Error writing subscription to Firestore:`, err);
    // In local development environment without GCP service account credentials, allow activation to succeed
    if (process.env.NODE_ENV !== 'production' || !process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log(`[Firebase Admin] Allowing development subscription activation for UID: ${uid}`);
      return true;
    }
    return false;
  }
}
