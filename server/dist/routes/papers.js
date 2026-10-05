"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
// Adjust these paths as needed based on your actual directory structure
// Assuming server is at C:\Users\aloo\exam-ai\server
// and data is at C:\Users\Aryan\exam-ai\tests_json
const DATA_ROOT = path_1.default.resolve(__dirname, '../../../');
const TESTS_DIR = path_1.default.join(DATA_ROOT, 'tests_json');
const ANSWERS_DIR = path_1.default.join(DATA_ROOT, 'ai_generated_answers');
// GET /api/papers - List all available papers
router.get('/', (req, res) => {
    try {
        const fullMockDir = path_1.default.join(TESTS_DIR, 'full_mocks');
        const topicWiseDir = path_1.default.join(TESTS_DIR, 'topic_wise');
        let allFiles = [];
        if (fs_1.default.existsSync(fullMockDir)) {
            allFiles.push(...fs_1.default.readdirSync(fullMockDir).filter(f => f.endsWith('.json')).map(f => ({ filename: `full_mocks/${f}`, fullPath: path_1.default.join(fullMockDir, f) })));
        }
        if (fs_1.default.existsSync(topicWiseDir)) {
            allFiles.push(...fs_1.default.readdirSync(topicWiseDir).filter(f => f.endsWith('.json')).map(f => ({ filename: `topic_wise/${f}`, fullPath: path_1.default.join(topicWiseDir, f) })));
        }
        const papers = allFiles.map((fileObj) => {
            // Read the actual title from the JSON file!
            let title = "UPSC Principal Test";
            try {
                const fileData = JSON.parse(fs_1.default.readFileSync(fileObj.fullPath, 'utf8'));
                title = fileData.test_name || title;
            }
            catch (e) { }
            return {
                id: fileObj.filename,
                title: title,
                filename: fileObj.filename,
                hasAnswers: true // Answers are embedded in our new JSONs
            };
        });
        res.json(papers);
    }
    catch (error) {
        console.error('Error listing papers:', error);
        res.status(500).json({ error: error.message });
    }
});
// GET /api/papers/:folder/:filename - Get paper content
router.get('/:folder/:filename', (req, res) => {
    try {
        const filename = path_1.default.join(req.params.folder, req.params.filename);
        const filePath = path_1.default.join(TESTS_DIR, filename);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'Paper not found' });
        }
        // Stream the file
        res.setHeader('Content-Type', 'application/json');
        fs_1.default.createReadStream(filePath).pipe(res);
    }
    catch (error) {
        console.error('Error serving paper:', error);
        res.status(500).json({ error: error.message });
    }
});
// GET /api/papers/:folder/:filename/answers - Get answers content
router.get('/:folder/:filename/answers', (req, res) => {
    try {
        const filename = path_1.default.join(req.params.folder, req.params.filename);
        // In our new architecture, questions and answers are bundled in the same JSON file
        const filePath = path_1.default.join(TESTS_DIR, filename);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'Answers not found' });
        }
        res.setHeader('Content-Type', 'application/json');
        fs_1.default.createReadStream(filePath).pipe(res);
    }
    catch (error) {
        console.error('Error serving answers:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=papers.js.map