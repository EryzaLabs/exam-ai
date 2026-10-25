/**
 * PDF Processing Pipeline Types
 * Fully generalized types for any exam PDF processing
 */

// VLM Provider Configuration
export type VLMProvider = 'qwen' | 'nemotron';

export interface VLMConfig {
  provider: VLMProvider;
  apiKey?: string;
  endpoint?: string;
  model: string;
  translationModel?: string;
  maxTokens?: number;
  temperature?: number;
  translationTemperature?: number;
}

// Page Analysis Results from VLM
export interface PageAnalysis {
  pageNumber: number;
  documentType: DocumentType;
  languages: Language[];
  structureType: StructureType;
  detectedElements: PageElement[];
  confidence: number;
  metadata: PageMetadata;
}

export type DocumentType = 
  | 'exam_paper'
  | 'solution_key'
  | 'explanation'
  | 'cover_page'
  | 'index'
  | 'instructions'
  | 'mixed'
  | 'unknown';

export type Language = 'hindi' | 'english' | 'mixed' | 'other';

export type StructureType = 
  | 'questions_only'
  | 'questions_with_answers'
  | 'questions_with_explanations'
  | 'table_of_contents'
  | 'header_footer_only'
  | 'unstructured';

export interface PageElement {
  type: ElementType;
  content: string;
  boundingBox?: BoundingBox;
  confidence: number;
  metadata?: Record<string, any>;
}

export type ElementType = 
  | 'question'
  | 'question_number'
  | 'question_text'
  | 'option'
  | 'answer'
  | 'explanation'
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'table'
  | 'image'
  | 'formula'
  | 'diagram';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageMetadata {
  hasWatermark: boolean;
  hasHeader: boolean;
  hasFooter: boolean;
  pageQuality: 'high' | 'medium' | 'low';
  isScanned: boolean;
  orientation: 'portrait' | 'landscape';
}

// Document-level Understanding
export interface DocumentStructure {
  examName: string;
  examType: string; // UPSC, SSC, JEE, etc.
  year?: number;
  papers: PaperInfo[];
  totalPages: number;
  languages: Language[];
  confidence: number;
  metadata: DocumentMetadata;
}

export interface PaperInfo {
  paperId: string;
  paperName: string; // GS Paper I, CSAT Paper II, Physics, etc.
  paperType: string; // GS, CSAT, Mains, Prelims, etc.
  startPage: number;
  endPage: number;
  sections: SectionInfo[];
  subjects: string[];
  totalQuestions: number;
}

export interface SectionInfo {
  sectionId: string;
  sectionName: string;
  startPage: number;
  endPage: number;
  startQuestionNumber: number;
  endQuestionNumber: number;
  subject?: string;
}

export interface DocumentMetadata {
  fileName: string;
  fileSize: number;
  processingDate: Date;
  pdfMetadata?: Record<string, any>;
  publisher?: string;
  edition?: string;
  source?: string;
}

// Extracted Question Structure
export interface ExtractedQuestion {
  questionNumber: number;
  questionId: string;
  questionText: {
    original: string;
    language: Language;
    translated?: string;
  };
  options?: QuestionOption[];
  correctAnswer?: number | number[] | string;
  explanation?: {
    original: string;
    language: Language;
    translated?: string;
  };
  subject: string;
  topics?: string[];
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  marks?: number;
  negativeMarking?: number;
  timeToSolve?: number;
  metadata: QuestionMetadata;
}

export interface QuestionOption {
  optionNumber: number;
  text: {
    original: string;
    language: Language;
    translated?: string;
  };
}

export interface QuestionMetadata {
  pageNumber: number;
  paperId: string;
  paperName: string;
  sectionId?: string;
  examType: string;
  examName: string;
  year?: number;
  confidence: number;
  hasImage: boolean;
  hasFormula: boolean;
  extractedAt: Date;
}

// Processing Pipeline State
export interface ProcessingJob {
  jobId: string;
  status: JobStatus;
  filePath: string;
  fileName: string;
  currentStage: PipelineStage;
  progress: number;
  totalPages: number;
  processedPages: number;
  startTime: Date;
  endTime?: Date;
  errors: ProcessingError[];
  results?: ProcessingResults;
}

export type JobStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type PipelineStage = 
  | 'ingestion'
  | 'page_rendering'
  | 'vlm_analysis'
  | 'structure_inference'
  | 'question_extraction'
  | 'translation'
  | 'validation'
  | 'export';

export interface ProcessingError {
  stage: PipelineStage;
  pageNumber?: number;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  timestamp: Date;
}

export interface ProcessingResults {
  documentStructure: DocumentStructure;
  extractedQuestions: ExtractedQuestion[];
  statistics: ProcessingStatistics;
  outputFiles: OutputFile[];
}

export interface ProcessingStatistics {
  totalPages: number;
  totalQuestions: number;
  questionsBySubject: Record<string, number>;
  questionsByDifficulty: Record<string, number>;
  averageConfidence: number;
  processingTimeMs: number;
  pagesWithErrors: number;
}

export interface OutputFile {
  format: 'json' | 'csv' | 'excel' | 'markdown';
  filePath: string;
  size: number;
  createdAt: Date;
}

// Translation Service Types
export interface TranslationRequest {
  text: string;
  sourceLanguage: Language;
  targetLanguage: Language;
  context?: string;
  preserveFormatting?: boolean;
}

export interface TranslationResponse {
  translatedText: string;
  confidence: number;
  detectedLanguage?: Language;
}

// VLM Prompt Templates
export interface PromptTemplate {
  name: string;
  template: string;
  variables: string[];
  description: string;
}

// Configuration
export interface ProcessorConfig {
  vlm: VLMConfig;
  processing: {
    batchSize: number;
    maxConcurrentPages: number;
    imageResolution: number;
    enableCaching: boolean;
    cacheDirectory?: string;
    enableResume: boolean;
  };
  translation: {
    enabled: boolean;
    sourceLanguage: Language;
    targetLanguages: Language[];
    useVLMForTranslation: boolean;
  };
  extraction: {
    minConfidenceScore: number;
    enableQuestionNumberValidation: boolean;
    enableCrossPageStitching: boolean;
    detectDifficulty: boolean;
    estimateTimeToSolve: boolean;
  };
  export: {
    formats: ('json' | 'csv' | 'excel' | 'markdown')[];
    outputDirectory: string;
    prettifyJson: boolean;
    includeMetadata: boolean;
  };
}

// App Integration Types
export interface QuestionDatabase {
  id: string;
  version: string;
  lastUpdated: Date;
  categories: QuestionCategory[];
  totalQuestions: number;
}

export interface QuestionCategory {
  id: string;
  name: string;
  type: CategoryType;
  description?: string;
  metadata: CategoryMetadata;
  questions: string[]; // Question IDs
  subcategories?: QuestionCategory[];
}

export type CategoryType = 
  | 'exam_type'      // UPSC, SSC, JEE, etc.
  | 'paper_type'     // GS, CSAT, Mains, etc.
  | 'subject'        // History, Geography, Science, etc.
  | 'topic'          // Ancient History, World Geography, etc.
  | 'year'           // 2020, 2021, 2022, etc.
  | 'difficulty'     // Easy, Medium, Hard
  | 'source'         // Previous Year, Practice, Mock Test, etc.
  | 'custom';

export interface CategoryMetadata {
  examType?: string;
  year?: number;
  paperName?: string;
  subject?: string;
  questionCount: number;
  averageDifficulty?: string;
  createdAt: Date;
  source: string;
}

// Test Generation Types
export interface TestGenerationRequest {
  testType: TestType;
  filters: TestFilters;
  count: number;
  duration?: number;
  randomize?: boolean;
}

export type TestType = 
  | 'previous_year'
  | 'subject_wise'
  | 'topic_wise'
  | 'mixed'
  | 'custom'
  | 'mock_test'
  | 'daily_practice';

export interface TestFilters {
  examTypes?: string[];
  subjects?: string[];
  topics?: string[];
  years?: number[];
  difficulties?: ('Easy' | 'Medium' | 'Hard')[];
  paperTypes?: string[];
  excludeAttempted?: boolean;
}
