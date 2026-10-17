export declare function getFirebaseAdmin(): import("firebase-admin/app").App;
export declare function getFirestoreAdmin(): FirebaseFirestore.Firestore | null;
export declare function getLocalSubscriptions(): Record<string, any>;
export declare function saveLocalSubscription(uid: string, data: any): void;
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