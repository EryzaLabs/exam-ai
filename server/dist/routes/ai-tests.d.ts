declare const router: import("express-serve-static-core").Router;
export interface AiTestJob {
    id: string;
    userId: string;
    topic: string;
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