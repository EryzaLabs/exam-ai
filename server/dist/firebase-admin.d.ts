import { App } from 'firebase-admin/app';
import { Firestore } from 'firebase-admin/firestore';
export declare function getFirebaseAdmin(): App | null;
export declare function getFirestoreAdmin(): Firestore | null;
export declare function getLocalSubscriptions(): Record<string, any>;
export declare function saveLocalSubscription(uid: string, data: any): void;
/**
 * Backend function to write subscription status using Firebase Admin SDK.
 * Bypasses Firestore Security Rules completely.
 */
export declare function recordBackendSubscription({ uid, orderId, amount, currency, customerEmail, customerPhone, periodDays, planId, planName, }: {
    uid: string;
    orderId: string;
    amount: number;
    currency?: string;
    customerEmail?: string;
    customerPhone?: string;
    periodDays?: number;
    planId?: string;
    planName?: string;
}): Promise<boolean>;
//# sourceMappingURL=firebase-admin.d.ts.map