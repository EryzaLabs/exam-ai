declare const router: import("express-serve-static-core").Router;
export declare function addPaidAiCredit(userId: string, count?: number): void;
export declare function getPaidAiCredits(userId: string): number;
export declare function consumePaidAiCredit(userId: string): boolean;
export interface AiTestJob {
    id: string;
    userId: string;
    topic: string;
    title?: string;
    questionCount: number;
    durationMinutes: number;
    difficulty: string;
    status: 'queued' | 'generating' | 'completed' | 'failed';
    progress: number;
    step: string;
    etaSeconds: number;
    startTime: number;
    error?: string;
    testId?: string;
    filename?: string;
    paper?: any;
}
export default router;
//# sourceMappingURL=ai-tests.d.ts.map