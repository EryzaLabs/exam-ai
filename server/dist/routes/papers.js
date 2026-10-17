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
            const files = fs_1.default.readdirSync(fullMockDir).filter(f => f.endsWith('.json'));
            files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            allFiles.push(...files.map(f => ({ filename: `full_mocks/${f}`, fullPath: path_1.default.join(fullMockDir, f) })));
        }
        if (fs_1.default.existsSync(topicWiseDir)) {
            const files = fs_1.default.readdirSync(topicWiseDir).filter(f => f.endsWith('.json'));
            files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            allFiles.push(...files.map(f => ({ filename: `topic_wise/${f}`, fullPath: path_1.default.join(topicWiseDir, f) })));
        }
        const papers = allFiles.map((fileObj) => {
            // Read the actual title and test_id from the JSON file!
            let title = "UPSC Principal Test";
            let testId = fileObj.filename;
            try {
                const fileData = JSON.parse(fs_1.default.readFileSync(fileObj.fullPath, 'utf8'));
                title = fileData.test_name || title;
                if (fileData.test_id) {
                    testId = fileData.test_id;
                }
            }
            catch (e) { }
            return {
                id: fileObj.filename,
                testId: testId,
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
const CUSTOM_MOCKS_DIR = path_1.default.join(TESTS_DIR, 'custom_mocks');
if (!fs_1.default.existsSync(CUSTOM_MOCKS_DIR)) {
    try {
        fs_1.default.mkdirSync(CUSTOM_MOCKS_DIR, { recursive: true });
    }
    catch (e) { }
}
const TOPIC_METADATA = {
    'nep-2020': { name: 'NEP 2020 (National Education Policy)', category: 'Policies & Acts' },
    'ncf-2023': { name: 'NCF 2023 (School Education)', category: 'Policies & Acts' },
    'ncf-2005': { name: 'NCF 2005', category: 'Policies & Acts' },
    'pocso': { name: 'POCSO Act 2012 & Child Rights', category: 'Policies & Acts' },
    'cbse': { name: 'CBSE Affiliation & Examination Bye-Laws', category: 'Institutions & Boards' },
    'ncert': { name: 'NCERT Structure & Mandate', category: 'Institutions & Boards' },
    'kvs': { name: 'Kendriya Vidyalaya Sangathan (KVS)', category: 'Institutions & Boards' },
    'navodaya-jnv': { name: 'Jawahar Navodaya Vidyalaya (JNV)', category: 'Institutions & Boards' },
    'emrs': { name: 'Eklavya Model Residential Schools (EMRS)', category: 'Institutions & Boards' },
    'cabe': { name: 'Central Advisory Board of Education (CABE)', category: 'Institutions & Boards' },
    'scert': { name: 'SCERT & DIET Structure', category: 'Institutions & Boards' },
    'ugc': { name: 'University Grants Commission (UGC)', category: 'Institutions & Boards' },
    'nios': { name: 'National Institute of Open Schooling (NIOS)', category: 'Institutions & Boards' },
    'open-university': { name: 'Open & Distance Learning Universities', category: 'Institutions & Boards' },
    'parakh': { name: 'PARAKH (National Assessment Centre)', category: 'Pedagogy & Assessment' },
    'nipun-bharat': { name: 'NIPUN Bharat (FLN Mission)', category: 'Pedagogy & Assessment' },
    'assessment': { name: 'School Assessment & Evaluation', category: 'Pedagogy & Assessment' },
    'evaluation': { name: 'Continuous & Comprehensive Evaluation (CCE)', category: 'Pedagogy & Assessment' },
    'measurement': { name: 'Educational Measurement, Testing & Psychometrics', category: 'Pedagogy & Assessment' },
    'inclusive-education': { name: 'Inclusive Education & CWSN', category: 'Pedagogy & Assessment' },
    'specially-abled-children': { name: 'Rights of Persons with Disabilities (RPwD)', category: 'Pedagogy & Assessment' },
    'pm-poshan': { name: 'PM POSHAN Scheme (Mid-Day Meal)', category: 'Schemes & Initiatives' },
    'pm-shri-cm-shri': { name: 'PM SHRI & CM SHRI Exemplary Schools', category: 'Schemes & Initiatives' },
    'pm-vidya-laxmi': { name: 'PM Vidya Laxmi Education Scheme', category: 'Schemes & Initiatives' },
    'ai-in-education': { name: 'AI & ICT in Modern Classrooms', category: 'Schemes & Initiatives' },
    'vidyanjali': { name: 'Vidyanjali 2.0 Community Participation', category: 'Schemes & Initiatives' },
    'yuva-sangam': { name: 'Yuva Sangam (Ek Bharat Shreshtha Bharat)', category: 'Schemes & Initiatives' },
    'smc-2026': { name: 'School Management Committees (SMC) & PTA', category: 'Administration & Governance' },
    'kasturba-gandhi-balika-vidyalaya': { name: 'Kasturba Gandhi Balika Vidyalaya (KGBV)', category: 'Schemes & Initiatives' },
    'sadhana-saptah-2026': { name: 'Sadhana Saptah Pedagogical Week', category: 'Schemes & Initiatives' },
    'sakura-science-2026': { name: 'Sakura Science High School Exchange', category: 'Schemes & Initiatives' },
    'nasha-mukt-abhiyan': { name: 'Nasha Mukt Bharat Abhiyan in Schools', category: 'Schemes & Initiatives' },
    'bharat-innovates-2026': { name: 'Bharat Innovates Science & Innovation', category: 'Schemes & Initiatives' },
    'bhartiya-bhasha-summer-camp': { name: 'Bhartiya Bhasha Summer Camps', category: 'Schemes & Initiatives' },
    'career-cards': { name: 'Career Cards & Vocational Guidance', category: 'Pedagogy & Assessment' },
    'pmrc': { name: 'PMRC Administrative Guidelines', category: 'Administration & Governance' },
};
// GET /api/papers/custom/topics - List all topics with question counts and categories
router.get('/custom/topics', (req, res) => {
    try {
        const topicWiseDir = path_1.default.join(TESTS_DIR, 'topic_wise');
        if (!fs_1.default.existsSync(topicWiseDir)) {
            return res.json({ topics: [], categories: [], totalTopics: 0, totalQuestions: 0 });
        }
        const files = fs_1.default.readdirSync(topicWiseDir).filter(f => f.endsWith('.json'));
        const topicMap = {};
        let totalQuestionsCount = 0;
        for (const f of files) {
            const match = f.match(/^(.*?)_test_\d+\.json$/);
            const slug = match ? match[1] : f.replace('.json', '');
            let qCount = 20; // default estimated
            try {
                const data = JSON.parse(fs_1.default.readFileSync(path_1.default.join(topicWiseDir, f), 'utf8'));
                if (Array.isArray(data.questions)) {
                    qCount = data.questions.length;
                }
            }
            catch (e) { }
            totalQuestionsCount += qCount;
            if (!topicMap[slug]) {
                const meta = TOPIC_METADATA[slug];
                const displayName = meta ? meta.name : slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                const category = meta ? meta.category : 'General Pedagogy';
                topicMap[slug] = {
                    id: slug,
                    name: displayName,
                    category,
                    questionCount: 0,
                    testCount: 0
                };
            }
            topicMap[slug].questionCount += qCount;
            topicMap[slug].testCount += 1;
        }
        const topics = Object.values(topicMap).sort((a, b) => a.name.localeCompare(b.name));
        const categories = ['All', 'Policies & Acts', 'Institutions & Boards', 'Pedagogy & Assessment', 'Schemes & Initiatives', 'Administration & Governance'];
        res.json({
            topics,
            categories,
            totalTopics: topics.length,
            totalQuestions: totalQuestionsCount
        });
    }
    catch (error) {
        console.error('Error fetching custom topics:', error);
        res.status(500).json({ error: error.message });
    }
});
// POST /api/papers/custom/create - Generate a custom mock test from selected topics, question count, and duration
router.post('/custom/create', (req, res) => {
    try {
        const { topics = [], questionCount = 30, durationMinutes = 45, title = '' } = req.body;
        const targetCount = Math.max(5, Math.min(120, parseInt(questionCount) || 30));
        const durationMins = Math.max(5, Math.min(180, parseInt(durationMinutes) || 45));
        const topicWiseDir = path_1.default.join(TESTS_DIR, 'topic_wise');
        if (!fs_1.default.existsSync(topicWiseDir)) {
            return res.status(500).json({ error: 'Topics directory not found' });
        }
        const allTopicFiles = fs_1.default.readdirSync(topicWiseDir).filter(f => f.endsWith('.json'));
        let selectedFiles = allTopicFiles;
        if (Array.isArray(topics) && topics.length > 0 && !topics.includes('all')) {
            selectedFiles = allTopicFiles.filter(f => {
                return topics.some(t => f.startsWith(`${t}_test_`) || f === `${t}.json`);
            });
        }
        if (selectedFiles.length === 0) {
            selectedFiles = allTopicFiles;
        }
        const pool = [];
        const seenIds = new Set();
        for (const f of selectedFiles) {
            try {
                const fullPath = path_1.default.join(topicWiseDir, f);
                const data = JSON.parse(fs_1.default.readFileSync(fullPath, 'utf8'));
                if (Array.isArray(data.questions)) {
                    for (const q of data.questions) {
                        const qId = q.id || `${f}_${pool.length}`;
                        if (!seenIds.has(qId)) {
                            seenIds.add(qId);
                            pool.push(q);
                        }
                    }
                }
            }
            catch (e) { }
        }
        if (pool.length === 0) {
            return res.status(404).json({ error: 'No questions available for selected topics' });
        }
        // Shuffle pool with Fisher-Yates
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const pickedQuestions = pool.slice(0, Math.min(targetCount, pool.length));
        const testId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const topicLabels = (Array.isArray(topics) && topics.length > 0 && !topics.includes('all'))
            ? topics.map(t => TOPIC_METADATA[t]?.name || t).join(', ')
            : 'All UPSC Syllabus Topics';
        const testName = title && title.trim()
            ? title.trim()
            : `Custom Mock Test: ${pickedQuestions.length} Questions (${durationMins}m)`;
        const customPaper = {
            test_id: testId,
            test_name: testName,
            type: 'custom',
            topic: topicLabels,
            topics: topics,
            duration_minutes: durationMins,
            duration: durationMins * 60,
            total_marks: pickedQuestions.length * 2.5,
            total_questions: pickedQuestions.length,
            created_at: new Date().toISOString(),
            questions: pickedQuestions
        };
        if (!fs_1.default.existsSync(CUSTOM_MOCKS_DIR)) {
            fs_1.default.mkdirSync(CUSTOM_MOCKS_DIR, { recursive: true });
        }
        const filePath = path_1.default.join(CUSTOM_MOCKS_DIR, `${testId}.json`);
        fs_1.default.writeFileSync(filePath, JSON.stringify(customPaper, null, 2), 'utf8');
        return res.json({
            success: true,
            testId: testId,
            filename: `custom_mocks/${testId}.json`,
            paper: customPaper
        });
    }
    catch (error) {
        console.error('Error creating custom test:', error);
        res.status(500).json({ error: error.message });
    }
});
// GET /api/papers/find/:identifier - Find paper content by test_id or filename
router.get('/find/:identifier', (req, res) => {
    try {
        const identifier = decodeURIComponent(req.params.identifier);
        const fullMockDir = path_1.default.join(TESTS_DIR, 'full_mocks');
        const topicWiseDir = path_1.default.join(TESTS_DIR, 'topic_wise');
        const customMockDir = path_1.default.join(TESTS_DIR, 'custom_mocks');
        const searchDirs = [fullMockDir, topicWiseDir, customMockDir];
        for (const dir of searchDirs) {
            if (!fs_1.default.existsSync(dir))
                continue;
            const files = fs_1.default.readdirSync(dir).filter(f => f.endsWith('.json'));
            for (const file of files) {
                const fullPath = path_1.default.join(dir, file);
                try {
                    const content = fs_1.default.readFileSync(fullPath, 'utf8');
                    if (content.includes(`"test_id": "${identifier}"`) ||
                        content.includes(`"test_id":"${identifier}"`) ||
                        file === identifier ||
                        file.replace('.json', '') === identifier) {
                        res.setHeader('Content-Type', 'application/json');
                        return res.send(content);
                    }
                }
                catch (e) { }
            }
        }
        return res.status(404).json({ error: 'Paper not found' });
    }
    catch (error) {
        console.error('Error finding paper by id:', error);
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