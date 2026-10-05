/**
 * PDF Processor Configuration
 * Configuration file for VLM-based PDF processing
 */
export declare const PDF_PROCESSOR_CONFIG: {
    vlm: {
        provider: string;
        models: {
            qwen: string;
            nemotron: string;
        };
        translationModel: string;
        apiKey: string;
        endpoints: {
            qwen: string;
            nemotron: string;
            translation: string;
        };
        maxTokens: number;
        temperature: number;
        translationTemperature: number;
    };
    processing: {
        batchSize: number;
        maxConcurrentPages: number;
        imageResolution: number;
        enableCaching: boolean;
        cacheDirectory: string;
        enableResume: boolean;
    };
    translation: {
        enabled: boolean;
        sourceLanguage: string;
        targetLanguages: string[];
        useVLMForTranslation: boolean;
        translationModel: string;
    };
    rephrasing: {
        enabled: boolean;
        model: string;
        style: string;
        preserveTechnicalTerms: boolean;
    };
    extraction: {
        minConfidenceScore: number;
        enableQuestionNumberValidation: boolean;
        enableCrossPageStitching: boolean;
        detectDifficulty: boolean;
        estimateTimeToSolve: boolean;
    };
    export: {
        formats: string[];
        outputDirectory: string;
        prettifyJson: boolean;
        includeMetadata: boolean;
    };
    database: {
        path: string;
        autoSave: boolean;
        createBackups: boolean;
        backupDirectory: string;
    };
};
/**
 * Environment-specific configuration
 */
export declare const getConfig: (environment?: "development" | "production") => {
    vlm: {
        provider: string;
        models: {
            qwen: string;
            nemotron: string;
        };
        translationModel: string;
        apiKey: string;
        endpoints: {
            qwen: string;
            nemotron: string;
            translation: string;
        };
        maxTokens: number;
        temperature: number;
        translationTemperature: number;
    };
    processing: {
        batchSize: number;
        maxConcurrentPages: number;
        imageResolution: number;
        enableCaching: boolean;
        cacheDirectory: string;
        enableResume: boolean;
    };
    translation: {
        enabled: boolean;
        sourceLanguage: string;
        targetLanguages: string[];
        useVLMForTranslation: boolean;
        translationModel: string;
    };
    rephrasing: {
        enabled: boolean;
        model: string;
        style: string;
        preserveTechnicalTerms: boolean;
    };
    extraction: {
        minConfidenceScore: number;
        enableQuestionNumberValidation: boolean;
        enableCrossPageStitching: boolean;
        detectDifficulty: boolean;
        estimateTimeToSolve: boolean;
    };
    export: {
        formats: string[];
        outputDirectory: string;
        prettifyJson: boolean;
        includeMetadata: boolean;
    };
    database: {
        path: string;
        autoSave: boolean;
        createBackups: boolean;
        backupDirectory: string;
    };
};
/**
 * Validate configuration
 */
export declare const validateConfig: (config: typeof PDF_PROCESSOR_CONFIG) => string[];
//# sourceMappingURL=config.d.ts.map