"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFirebaseAdmin = getFirebaseAdmin;
exports.getFirestoreAdmin = getFirestoreAdmin;
exports.getLocalSubscriptions = getLocalSubscriptions;
exports.saveLocalSubscription = saveLocalSubscription;
exports.recordBackendSubscription = recordBackendSubscription;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let isInitialized = false;
let hasExplicitCredentials = false;
function getFirebaseAdmin() {
    if (isInitialized && (0, app_1.getApps)().length > 0) {
        return (0, app_1.getApps)()[0];
    }
    try {
        // 1. Check for service account JSON string in env
        const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (serviceAccountEnv) {
            const serviceAccount = JSON.parse(serviceAccountEnv);
            const app = (0, app_1.initializeApp)({
                credential: (0, app_1.cert)(serviceAccount),
                projectId: serviceAccount.project_id || 'exam-ai-a92e0',
            });
            isInitialized = true;
            hasExplicitCredentials = true;
            console.log('[Firebase Admin] Initialized with FIREBASE_SERVICE_ACCOUNT env');
            return app;
        }
        // 2. Check for serviceAccountKey.json file in server/ or root
        const possiblePaths = [
            path_1.default.resolve(__dirname, '../serviceAccountKey.json'),
            path_1.default.resolve(__dirname, '../../serviceAccountKey.json'),
            path_1.default.resolve(process.cwd(), 'serviceAccountKey.json'),
            path_1.default.resolve(process.cwd(), '../serviceAccountKey.json'),
        ];
        for (const keyPath of possiblePaths) {
            if (fs_1.default.existsSync(keyPath)) {
                const keyData = JSON.parse(fs_1.default.readFileSync(keyPath, 'utf8'));
                const app = (0, app_1.initializeApp)({
                    credential: (0, app_1.cert)(keyData),
                    projectId: keyData.project_id || 'exam-ai-a92e0',
                });
                isInitialized = true;
                hasExplicitCredentials = true;
                console.log(`[Firebase Admin] Initialized with key file: ${keyPath}`);
                return app;
            }
        }
        // 3. Fallback: Initialize with project ID
        const app = (0, app_1.initializeApp)({
            projectId: process.env.FIREBASE_PROJECT_ID || 'exam-ai-a92e0',
        });
        isInitialized = true;
        hasExplicitCredentials = false;
        console.log('[Firebase Admin] Initialized with default project config (exam-ai-a92e0)');
        return app;
    }
    catch (error) {
        if ((0, app_1.getApps)().length > 0) {
            isInitialized = true;
            return (0, app_1.getApps)()[0];
        }
        console.warn('[Firebase Admin] Initialization warning:', error.message);
        const app = (0, app_1.initializeApp)({ projectId: 'exam-ai-a92e0' });
        isInitialized = true;
        hasExplicitCredentials = false;
        return app;
    }
}
function getFirestoreAdmin() {
    try {
        getFirebaseAdmin();
        if (!hasExplicitCredentials) {
            return null;
        }
        return (0, firestore_1.getFirestore)();
    }
    catch (e) {
        return null;
    }
}
/**
 * Backend function to write subscription status using Firebase Admin SDK.
 * Bypasses Firestore Security Rules completely.
 */
const LOCAL_SUB_FILE = path_1.default.resolve(process.cwd(), 'data/subscriptions.json');
function getLocalSubscriptions() {
    try {
        if (fs_1.default.existsSync(LOCAL_SUB_FILE)) {
            return JSON.parse(fs_1.default.readFileSync(LOCAL_SUB_FILE, 'utf8'));
        }
    }
    catch (e) { }
    return {};
}
function saveLocalSubscription(uid, data) {
    try {
        const dir = path_1.default.dirname(LOCAL_SUB_FILE);
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        const subs = getLocalSubscriptions();
        subs[uid] = {
            uid,
            isSubscribed: true,
            status: 'active',
            updatedAt: new Date().toISOString(),
            ...data,
        };
        fs_1.default.writeFileSync(LOCAL_SUB_FILE, JSON.stringify(subs, null, 2), 'utf8');
        console.log(`[Subscription Registry] Saved subscription for ${uid} to local disk`);
    }
    catch (e) {
        console.error('[Subscription Registry] Error saving to disk:', e);
    }
}
async function recordBackendSubscription({ uid, orderId, amount, currency = 'INR', customerEmail, customerPhone, periodDays = 365, }) {
    try {
        getFirebaseAdmin();
        const db = (0, firestore_1.getFirestore)();
        const now = Date.now();
        const periodEnd = now + periodDays * 24 * 60 * 60 * 1000;
        const periodEndTimestamp = firestore_1.Timestamp.fromMillis(periodEnd);
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
        await db.doc(`subscriptions/${uid}`).set({
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
            activatedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        // 2. Also update users/{uid} for dual-sync and profile queries
        await db.doc(`users/${uid}`).set({
            isSubscribed: true,
            subscriptionStatus: 'active',
            subscriptionOrderId: orderId,
            subscriptionPeriodEnd: periodEndTimestamp,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`[Firebase Admin] Successfully activated subscription for UID: ${uid}`);
        return true;
    }
    catch (err) {
        console.error(`[Firebase Admin] Error writing subscription to Firestore:`, err);
        // In local development environment without GCP service account credentials, allow activation to succeed
        if (process.env.NODE_ENV !== 'production' || !process.env.FIREBASE_SERVICE_ACCOUNT) {
            console.log(`[Firebase Admin] Allowing development subscription activation for UID: ${uid}`);
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=firebase-admin.js.map