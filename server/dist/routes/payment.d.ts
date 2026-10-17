declare const router: import("express-serve-static-core").Router;
export interface SubscriptionPlan {
    id: 'daily' | 'weekly' | 'monthly' | 'lifetime';
    name: string;
    tagline: string;
    price: number;
    originalPrice: number;
    durationLabel: string;
    periodDays: number;
    badge?: string;
    popular?: boolean;
    bestValue?: boolean;
}
export declare const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan>;
export declare function resolvePlanAndPeriod(planId?: string, amount?: number): {
    plan: SubscriptionPlan;
    periodDays: number;
};
export declare const orderPlansCache: Record<string, {
    plan: SubscriptionPlan;
    periodDays: number;
    uid?: string;
}>;
export interface CouponDefinition {
    code: string;
    discountType: 'free' | 'percent' | 'flat' | 'fixed_price';
    value: number;
    description: string;
    active: boolean;
}
export declare const COUPONS: Record<string, CouponDefinition>;
export declare const calculateDiscount: (coupon: CouponDefinition, basePrice?: number) => {
    discountAmount: number;
    finalAmount: number;
    isFree: boolean;
};
export default router;
//# sourceMappingURL=payment.d.ts.map