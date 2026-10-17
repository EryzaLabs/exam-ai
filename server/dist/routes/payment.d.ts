declare const router: import("express-serve-static-core").Router;
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