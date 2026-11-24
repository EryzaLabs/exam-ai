/**
 * PDF Processor Configuration
 * Configuration file for VLM-based PDF processing
 */

export const PDF_PROCESSOR_CONFIG = {
  // VLM Configuration
  vlm: {
    // Provider: 'qwen' or 'nemotron'
    provider: process.env.VLM_PROVIDER || 'qwen',
    
    // Model names
    models: {
      qwen: 'qwen/qwen3-vl-235b-a22b-instruct',
      nemotron: 'nvidia/nemotron-nano-12b-v2-vl',
    },
    
    // Translation & Rephrasing Model
    translationModel: 'openai/gpt-oss-120b',
    
    // API Configuration
    apiKey: process.env.VLM_API_KEY || '',
    
    // Endpoints
    endpoints: {
      qwen: 'https://ai.hackclub.com/proxy/v1/chat/completions',
      nemotron: 'https://integrate.api.nvidia.com/v1/chat/completions',
      translation: 'https://ai.hackclub.com/proxy/v1/chat/completions',
    },
    
    // Generation parameters
    maxTokens: 4096,
    temperature: 0.1,
    translationTemperature: 0.3, // Slightly higher for natural translation
  },

  // Processing Configuration
  processing: {
    // Batch size for page processing
    batchSize: 10,
    
    // Maximum concurrent VLM requests
    maxConcurrentPages: 5,
    
    // Image resolution (DPI) for PDF rendering
    imageResolution: 300,
    
    // Enable caching of intermediate results
    enableCaching: true,
    cacheDirectory: './cache/pdf-processor',
    
    // Enable resumable processing for large PDFs
    enableResume: true,
  },

  // Translation Configuration
  translation: {
    // Enable automatic translation
    enabled: true,
    
    // Source language (auto-detected if not specified)
    sourceLanguage: 'hindi',
    
    // Target languages for translation
    targetLanguages: ['english'],
    
    // Use dedicated translation model (GPT-OSS-120B)
    useVLMForTranslation: false,
    translationModel: 'openai/gpt-oss-120b',
  },

  // Rephrasing Configuration (to avoid copyright)
  rephrasing: {
    // Enable automatic rephrasing of explanations
    enabled: true,
    
    // Model for rephrasing
    model: 'openai/gpt-oss-120b',
    
    // Rephrasing style
    style: 'academic', // 'academic', 'simple', 'detailed'
    
    // Preserve technical terms
    preserveTechnicalTerms: true,
  },

  // Extraction Configuration
  extraction: {
    // Minimum confidence score for accepting extracted questions
    minConfidenceScore: 0.6,
    
    // Validate question numbering and fix gaps
    enableQuestionNumberValidation: true,
    
    // Stitch questions that span multiple pages
    enableCrossPageStitching: true,
    
    // Automatically detect difficulty level
    detectDifficulty: true,
    
    // Estimate time to solve each question
    estimateTimeToSolve: true,
  },

  // Export Configuration
  export: {
    // Output formats: 'json', 'csv', 'excel', 'markdown'
    formats: ['json'],
    
    // Output directory for processed data
    outputDirectory: './output',
    
    // Prettify JSON output
    prettifyJson: true,
    
    // Include metadata in exports
    includeMetadata: true,
  },

  // Database Configuration
  database: {
    // Local database path
    path: './data/question_database.json',
    
    // Auto-save after import
    autoSave: true,
    
    // Backup before modifications
    createBackups: true,
    backupDirectory: './data/backups',
  },
};

/**
 * Environment-specific configuration
 */
export const getConfig = (environment: 'development' | 'production' = 'development') => {
  const baseConfig = PDF_PROCESSOR_CONFIG;

  if (environment === 'production') {
    return {
      ...baseConfig,
      processing: {
        ...baseConfig.processing,
        maxConcurrentPages: 10,
        enableCaching: true,
      },
      extraction: {
        ...baseConfig.extraction,
        minConfidenceScore: 0.7,
      },
    };
  }

  return baseConfig;
};

/**
 * Validate configuration
 */
export const validateConfig = (config: typeof PDF_PROCESSOR_CONFIG): string[] => {
  const errors: string[] = [];

  if (!config.vlm.apiKey) {
    errors.push('VLM API key is required');
  }

  if (config.processing.maxConcurrentPages > 20) {
    errors.push('maxConcurrentPages should not exceed 20 to avoid rate limits');
  }

  if (config.extraction.minConfidenceScore < 0 || config.extraction.minConfidenceScore > 1) {
    errors.push('minConfidenceScore must be between 0 and 1');
  }

  return errors;
};
