/**
 * Question Database Service (Server-side)
 * JSON-based storage for questions (no native dependencies)
 */
export declare class QuestionDatabase {
    private dbPath;
    private questions;
    private loaded;
    constructor();
    private loadData;
    private saveData;
    private saveDataSync;
    importQuestions(results: any): Promise<void>;
    getQuestions(filters: any): Promise<any[]>;
    getQuestionById(id: string): Promise<any>;
    searchQuestions(query: string, filters?: any): Promise<any[]>;
    countQuestions(filters: any): Promise<number>;
    getExamTypes(): Promise<string[]>;
    getSubjects(examType?: string): Promise<string[]>;
    getYears(examType?: string): Promise<number[]>;
    generateTest(request: any): Promise<any>;
    getStatistics(): Promise<any>;
    getExamStatistics(examType: string): Promise<any>;
    getSubjectStatistics(subject: string): Promise<any>;
    private formatQuestion;
    private generateTestName;
    private estimateDuration;
    close(): void;
}
//# sourceMappingURL=database.d.ts.map