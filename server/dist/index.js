"use strict";
/**
 * Main Server Entry Point
 * PDF Processing & Question Database API Server
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
// Load environment variables
dotenv_1.default.config();
// Import routes
const upload_1 = __importDefault(require("./routes/upload"));
const questions_1 = __importDefault(require("./routes/questions"));
const tests_1 = __importDefault(require("./routes/tests"));
const stats_1 = __importDefault(require("./routes/stats"));
const processing_1 = __importDefault(require("./routes/processing"));
const papers_1 = __importDefault(require("./routes/papers"));
const testseries_1 = __importDefault(require("./routes/testseries"));
const answer_generation_1 = __importDefault(require("./routes/answer-generation"));
const reports_1 = __importDefault(require("./routes/reports"));
const payment_1 = __importDefault(require("./routes/payment"));
// Initialize Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5670;
// Ensure required directories exist
const dirs = [
    process.env.UPLOAD_DIR || './uploads',
    process.env.OUTPUT_DIR || './output',
    process.env.CACHE_DIR || './cache',
    process.env.TEMP_DIR || './temp',
    './data',
    './logs',
];
dirs.forEach((dir) => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
});
// Middleware
app.use((0, helmet_1.default)());
const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : '*';
app.use((0, cors_1.default)({
    origin: corsOrigin,
    credentials: true,
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, morgan_1.default)(process.env.LOG_LEVEL || 'dev'));
// API Routes
app.use('/api/upload', upload_1.default);
app.use('/api/questions', questions_1.default);
app.use('/api/tests', tests_1.default);
app.use('/api/stats', stats_1.default);
app.use('/api/processing', processing_1.default);
app.use('/api/papers', papers_1.default);
app.use('/api/testseries', testseries_1.default);
app.use('/api/answers', answer_generation_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/payment', payment_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Exam AI - PDF Processing Server',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            upload: '/api/upload',
            questions: '/api/questions',
            tests: '/api/tests',
            stats: '/api/stats',
            processing: '/api/processing',
        },
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal server error',
            status: err.status || 500,
        },
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 VLM Provider: ${process.env.VLM_PROVIDER || 'qwen'}`);
    console.log(`📁 Upload directory: ${process.env.UPLOAD_DIR || './uploads'}`);
    console.log(`💾 Database: ${process.env.DB_PATH || './data/questions.db'}`);
    console.log(`\n✅ Server ready to process PDFs!\n`);
});
exports.default = app;
//# sourceMappingURL=index.js.map