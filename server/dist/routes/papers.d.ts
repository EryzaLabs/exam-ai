declare const router: import("express-serve-static-core").Router;
export declare function invalidatePapersCache(): void;
export declare const TOPIC_METADATA: Record<string, {
    name: string;
    category: string;
}>;
export declare function formatTopicDisplayName(rawSlug: string): string;
export declare function formatPaperTitle(rawTitle: string | undefined, filename: string, topic?: string): string;
export default router;
//# sourceMappingURL=papers.d.ts.map