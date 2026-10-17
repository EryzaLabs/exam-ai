import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue, Firestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

let isInitialized = false;
let hasExplicitCredentials = false;
let adminApp: App | null = null;
let firestoreDb: Firestore | null = null;

export function getFirebaseAdmin(): App | null {
  if (isInitialized) {
    return adminApp;
  }

  try {
    // 1. Check for service account JSON string in env
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountEnv) {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || 'exam-ai-a92e0',
      });
      isInitialized = true;
      hasExplicitCredentials = true;
      firestoreDb = getFirestore(adminApp);
      console.log('[Firebase Admin] Initialized with FIREBASE_SERVICE_ACCOUNT env');
      return adminApp;
    }

    // 2. Check for serviceAccountKey.json file in server/ or root
    const possiblePaths = [
      path.resolve(__dirname, '../serviceAccountKey.json'),
      path.resolve(__dirname, '../../serviceAccountKey.json'),
      path.resolve(process.cwd(), 'serviceAccountKey.json'),
      path.resolve(process.cwd(), '../serviceAccountKey.json'),
      path.resolve(process.cwd(), 'server/serviceAccountKey.json'),
    ];

    for (const keyPath of possiblePaths) {
      if (fs.existsSync(keyPath)) {
        const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        adminApp = initializeApp({
          credential: cert(keyData),
          projectId: keyData.project_id || 'exam-ai-a92e0',
        });
        isInitialized = true;
        hasExplicitCredentials = true;
        firestoreDb = getFirestore(adminApp);
        console.log(`[Firebase Admin] Initialized with key file: ${keyPath}`);
        return adminApp;
      }
    }

    // 3. If no explicit credentials, DO NOT initialize empty ADC on non-GCP servers
    isInitialized = true;
    hasExplicitCredentials = false;
    adminApp = null;
    firestoreDb = null;
    console.log('[Firebase Admin] No serviceAccountKey.json found. Operating with local subscription registry.');
    return null;
  } catch (error: any) {
    isInitialized = true;
    hasExplicitCredentials = false;
    adminApp = null;
    firestoreDb = null;
    console.warn('[Firebase Admin] Initialization warning:', error.message);
    return null;
  }
}

export function getFirestoreAdmin(): Firestore | null {
  try {
    getFirebaseAdmin();
    if (!hasExplicitCredentials || !firestoreDb) {
      return null;
    }
    return firestoreDb;
  } catch (e) {
    return null;
  }
}

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
    // 0. Always save immediately to local persistent disk registry
    saveLocalSubscription(uid, {
      orderId,
      amount,
      currency,
      customerEmail,
      customerPhone,
      periodDays,
      expiresAt: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString(),
    });

    console.log(`[Subscription Registry] Active subscription recorded for UID: ${uid}, Order: ${orderId}`);

    // 1. If explicit credentials exist, also sync to Firestore
    const db = getFirestoreAdmin();
    if (db) {
      try {
        const now = Date.now();
        const periodEnd = now + periodDays * 24 * 60 * 60 * 1000;
        const periodEndTimestamp = Timestamp.fromMillis(periodEnd);

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

        console.log(`[Firebase Admin] Successfully synced to Firestore for UID: ${uid}`);
      } catch (fErr: any) {
        console.warn(`[Firebase Admin] Firestore sync skipped: ${fErr.message}`);
      }
    }

    return true;
  } catch (err: any) {
    console.error(`[Firebase Admin] Error writing subscription:`, err);
    return true;
  }
}
