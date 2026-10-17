export declare function getFirebaseAdmin(): import("firebase-admin/app").App;
export declare function getFirestoreAdmin(): FirebaseFirestore.Firestore | null;
/**
 * Backend function to write subscription status using Firebase Admin SDK.
 * Bypasses Firestore Security Rules completely.
 */
export declare function recordBackendSubscription({ uid, orderId, amount, currency, customerEmail, customerPhone, periodDays, }: {
    uid: string;
    orderId: string;
    amount: number;
    currency?: string;
    customerEmail?: string;
    customerPhone?: string;
    periodDays?: number;
}): Promise<boolean>;
//# sourceMappingURL=firebase-admin.d.ts.map