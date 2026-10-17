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
let adminApp = null;
let firestoreDb = null;
function getFirebaseAdmin() {
    if (isInitialized) {
        return adminApp;
    }
    try {
        // 1. Check for service account JSON string in env
        const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (serviceAccountEnv) {
            const serviceAccount = JSON.parse(serviceAccountEnv);
            adminApp = (0, app_1.initializeApp)({
                credential: (0, app_1.cert)(serviceAccount),
                projectId: serviceAccount.project_id || 'exam-ai-a92e0',
            });
            isInitialized = true;
            hasExplicitCredentials = true;
            firestoreDb = (0, firestore_1.getFirestore)(adminApp);
            console.log('[Firebase Admin] Initialized with FIREBASE_SERVICE_ACCOUNT env');
            return adminApp;
        }
        // 2. Check for serviceAccountKey.json file in server/ or root
        const possiblePaths = [
            path_1.default.resolve(__dirname, '../serviceAccountKey.json'),
            path_1.default.resolve(__dirname, '../../serviceAccountKey.json'),
            path_1.default.resolve(process.cwd(), 'serviceAccountKey.json'),
            path_1.default.resolve(process.cwd(), '../serviceAccountKey.json'),
            path_1.default.resolve(process.cwd(), 'server/serviceAccountKey.json'),
        ];
        for (const keyPath of possiblePaths) {
            if (fs_1.default.existsSync(keyPath)) {
                const keyData = JSON.parse(fs_1.default.readFileSync(keyPath, 'utf8'));
                adminApp = (0, app_1.initializeApp)({
                    credential: (0, app_1.cert)(keyData),
                    projectId: keyData.project_id || 'exam-ai-a92e0',
                });
                isInitialized = true;
                hasExplicitCredentials = true;
                firestoreDb = (0, firestore_1.getFirestore)(adminApp);
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
    }
    catch (error) {
        isInitialized = true;
        hasExplicitCredentials = false;
        adminApp = null;
        firestoreDb = null;
        console.warn('[Firebase Admin] Initialization warning:', error.message);
        return null;
    }
}
function getFirestoreAdmin() {
    try {
        getFirebaseAdmin();
        if (!hasExplicitCredentials || !firestoreDb) {
            return null;
        }
        return firestoreDb;
    }
    catch (e) {
        return null;
    }
}
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
/**
 * Backend function to write subscription status using Firebase Admin SDK.
 * Bypasses Firestore Security Rules completely.
 */
async function recordBackendSubscription({ uid, orderId, amount, currency = 'INR', customerEmail, customerPhone, periodDays = 365, planId = 'lifetime', planName = 'Lifetime Pass', }) {
    try {
        const now = Date.now();
        const periodEnd = now + periodDays * 24 * 60 * 60 * 1000;
        const expiresAt = new Date(periodEnd).toISOString();
        // 0. Always save immediately to local persistent disk registry
        saveLocalSubscription(uid, {
            orderId,
            amount,
            currency,
            customerEmail,
            customerPhone,
            periodDays,
            planId,
            planName,
            expiresAt,
        });
        console.log(`[Subscription Registry] Active subscription recorded for UID: ${uid}, Order: ${orderId}`);
        // 1. If explicit credentials exist, also sync to Firestore
        const db = getFirestoreAdmin();
        if (db) {
            try {
                const now = Date.now();
                const periodEnd = now + periodDays * 24 * 60 * 60 * 1000;
                const periodEndTimestamp = firestore_1.Timestamp.fromMillis(periodEnd);
                await db.doc(`subscriptions/${uid}`).set({
                    uid,
                    status: 'active',
                    isSubscribed: true,
                    orderId,
                    amount,
                    currency,
                    planId,
                    planName,
                    periodDays,
                    currentPeriodEnd: periodEndTimestamp,
                    customerEmail: customerEmail || '',
                    customerPhone: customerPhone || '',
                    paymentGateway: 'cashfree',
                    activatedAt: firestore_1.FieldValue.serverTimestamp(),
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                }, { merge: true });
                await db.doc(`users/${uid}`).set({
                    isSubscribed: true,
                    subscriptionStatus: 'active',
                    subscriptionPlanId: planId,
                    subscriptionPlanName: planName,
                    subscriptionOrderId: orderId,
                    subscriptionPeriodEnd: periodEndTimestamp,
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                }, { merge: true });
                console.log(`[Firebase Admin] Successfully synced to Firestore for UID: ${uid}`);
            }
            catch (fErr) {
                console.warn(`[Firebase Admin] Firestore sync skipped: ${fErr.message}`);
            }
        }
        return true;
    }
    catch (err) {
        console.error(`[Firebase Admin] Error writing subscription:`, err);
        return true;
    }
}
//# sourceMappingURL=firebase-admin.js.map