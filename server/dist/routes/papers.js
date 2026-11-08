"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOPIC_METADATA = void 0;
exports.invalidatePapersCache = invalidatePapersCache;
exports.formatTopicDisplayName = formatTopicDisplayName;
exports.formatPaperTitle = formatPaperTitle;
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
const DATA_ROOT = path_1.default.resolve(__dirname, '../../../');
const TESTS_DIR = path_1.default.join(DATA_ROOT, 'tests_json');
const ANSWERS_DIR = path_1.default.join(DATA_ROOT, 'ai_generated_answers');
// In-memory cache for high performance & 0ms responses without blocking event loop
let cachedPapersList = null;
let lastPapersCacheTime = 0;
const PAPERS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes
function invalidatePapersCache() {
    cachedPapersList = null;
}
exports.TOPIC_METADATA = {
    // Leadership & Administration
    'effective-leader-vs-successful-leader': { name: 'School Leadership: Effective vs. Successful Leader', category: 'Administration & Governance' },
    'effective_leader_vs_successful_leader': { name: 'School Leadership: Effective vs. Successful Leader', category: 'Administration & Governance' },
    'transformational-leadership': { name: 'Transformational & Instructional Leadership', category: 'Administration & Governance' },
    'transformational_leadership': { name: 'Transformational & Instructional Leadership', category: 'Administration & Governance' },
    'school-development-plan': { name: 'School Development Plan (SDP) & Planning', category: 'Administration & Governance' },
    'school_development_plan': { name: 'School Development Plan (SDP) & Planning', category: 'Administration & Governance' },
    // Service Rules & Admin
    'ccs-cca-rules-1965': { name: 'CCS (CCA) Rules, 1965: Disciplinary Procedures', category: 'Administration & Governance' },
    'ccs_cca_rules_1965': { name: 'CCS (CCA) Rules, 1965: Disciplinary Procedures', category: 'Administration & Governance' },
    'ccs-conduct-rules-1964': { name: 'CCS (Conduct) Rules, 1964: Civil Services Code', category: 'Administration & Governance' },
    'ccs_conduct_rules_1964': { name: 'CCS (Conduct) Rules, 1964: Civil Services Code', category: 'Administration & Governance' },
    'ccs-nps': { name: 'National Pension System (NPS) & Retirement Rules', category: 'Administration & Governance' },
    'ccs_nps': { name: 'National Pension System (NPS) & Retirement Rules', category: 'Administration & Governance' },
    'ccs-leave-rules-1972': { name: 'CCS (Leave) Rules, 1972: Leave Entitlements', category: 'Administration & Governance' },
    'ccs_leave_rules_1972': { name: 'CCS (Leave) Rules, 1972: Leave Entitlements', category: 'Administration & Governance' },
    'ccs-pension-rules': { name: 'CCS (Pension) Rules: Service Pension & Gratuity', category: 'Administration & Governance' },
    'ccs_pension_rules': { name: 'CCS (Pension) Rules: Service Pension & Gratuity', category: 'Administration & Governance' },
    'general-financial-rules-2017': { name: 'General Financial Rules (GFR) 2017 & Public Procurement', category: 'Administration & Governance' },
    'general_financial_rules_2017': { name: 'General Financial Rules (GFR) 2017 & Public Procurement', category: 'Administration & Governance' },
    'fundamental-rules-supplementary-rules': { name: 'Fundamental Rules & Supplementary Rules (FR & SR)', category: 'Administration & Governance' },
    'fundamental_rules_supplementary_rules': { name: 'Fundamental Rules & Supplementary Rules (FR & SR)', category: 'Administration & Governance' },
    'smc-2026': { name: 'School Management Committees (SMC & PTA)', category: 'Administration & Governance' },
    'smc_2026': { name: 'School Management Committees (SMC & PTA)', category: 'Administration & Governance' },
    'smc': { name: 'School Management Committees (SMC & PTA)', category: 'Administration & Governance' },
    'pmrc': { name: 'PMRC Administrative Guidelines for Principals', category: 'Administration & Governance' },
    // Policies & Acts
    'nep-2020': { name: 'NEP 2020 (National Education Policy)', category: 'Policies & Acts' },
    'nep_2020': { name: 'NEP 2020 (National Education Policy)', category: 'Policies & Acts' },
    'ncf-2023': { name: 'NCF 2023 (School Education)', category: 'Policies & Acts' },
    'ncf_2023': { name: 'NCF 2023 (School Education)', category: 'Policies & Acts' },
    'ncf-2005': { name: 'NCF 2005 (Curriculum Framework)', category: 'Policies & Acts' },
    'ncf_2005': { name: 'NCF 2005 (Curriculum Framework)', category: 'Policies & Acts' },
    'pocso': { name: 'POCSO Act 2012 & Child Rights', category: 'Policies & Acts' },
    'pocso-act': { name: 'POCSO Act 2012 & Child Rights', category: 'Policies & Acts' },
    'pocso_act': { name: 'POCSO Act 2012 & Child Rights', category: 'Policies & Acts' },
    'rte-2009': { name: 'RTE Act 2009: Free & Compulsory Education', category: 'Policies & Acts' },
    'rte_2009': { name: 'RTE Act 2009: Free & Compulsory Education', category: 'Policies & Acts' },
    'right-to-education-act-2009': { name: 'RTE Act 2009: Free & Compulsory Education', category: 'Policies & Acts' },
    'right_to_education_act_2009': { name: 'RTE Act 2009: Free & Compulsory Education', category: 'Policies & Acts' },
    // Institutions & Boards
    'cbse': { name: 'CBSE Affiliation & Examination Bye-Laws', category: 'Institutions & Boards' },
    'ncert': { name: 'NCERT Mandate, Structure & Curriculum', category: 'Institutions & Boards' },
    'kvs': { name: 'Kendriya Vidyalaya Sangathan (KVS) Rules', category: 'Institutions & Boards' },
    'navodaya-jnv': { name: 'Navodaya Vidyalaya Samiti (NVS / JNV)', category: 'Institutions & Boards' },
    'navodaya_jnv': { name: 'Navodaya Vidyalaya Samiti (NVS / JNV)', category: 'Institutions & Boards' },
    'jnv': { name: 'Navodaya Vidyalaya Samiti (NVS / JNV)', category: 'Institutions & Boards' },
    'emrs': { name: 'Eklavya Model Residential Schools (EMRS)', category: 'Institutions & Boards' },
    'cabe': { name: 'Central Advisory Board of Education (CABE)', category: 'Institutions & Boards' },
    'scert': { name: 'SCERT & DIET Structure & Functions', category: 'Institutions & Boards' },
    'ugc': { name: 'University Grants Commission (UGC)', category: 'Institutions & Boards' },
    'nios': { name: 'National Institute of Open Schooling (NIOS)', category: 'Institutions & Boards' },
    'open-university': { name: 'Open & Distance Learning (ODL / IGNOU)', category: 'Institutions & Boards' },
    'open_university': { name: 'Open & Distance Learning (ODL / IGNOU)', category: 'Institutions & Boards' },
    // Pedagogy & Assessment
    'parakh': { name: 'PARAKH National Assessment Centre', category: 'Pedagogy & Assessment' },
    'nipun-bharat': { name: 'NIPUN Bharat & FLN Mission', category: 'Pedagogy & Assessment' },
    'nipun_bharat': { name: 'NIPUN Bharat & FLN Mission', category: 'Pedagogy & Assessment' },
    'assessment': { name: 'School Assessment, Standards & Rubrics', category: 'Pedagogy & Assessment' },
    'evaluation': { name: 'Continuous & Comprehensive Evaluation (CCE)', category: 'Pedagogy & Assessment' },
    'cce': { name: 'Continuous & Comprehensive Evaluation (CCE)', category: 'Pedagogy & Assessment' },
    'continuous-and-comprehensive-evaluation': { name: 'Continuous & Comprehensive Evaluation (CCE)', category: 'Pedagogy & Assessment' },
    'continuous_and_comprehensive_evaluation': { name: 'Continuous & Comprehensive Evaluation (CCE)', category: 'Pedagogy & Assessment' },
    'measurement': { name: 'Educational Measurement & Psychometrics', category: 'Pedagogy & Assessment' },
    'inclusive-education': { name: 'Inclusive Education & Special Needs', category: 'Pedagogy & Assessment' },
    'inclusive_education': { name: 'Inclusive Education & Special Needs', category: 'Pedagogy & Assessment' },
    'specially-abled-children': { name: 'RPwD Act & Specially Abled Children', category: 'Pedagogy & Assessment' },
    'specially_abled_children': { name: 'RPwD Act & Specially Abled Children', category: 'Pedagogy & Assessment' },
    'career-cards': { name: 'Career Cards & Vocational Guidance', category: 'Pedagogy & Assessment' },
    'career_cards': { name: 'Career Cards & Vocational Guidance', category: 'Pedagogy & Assessment' },
    // Schemes & Initiatives
    'pm-poshan': { name: 'PM POSHAN (Mid-Day Meal Scheme)', category: 'Schemes & Initiatives' },
    'pm_poshan': { name: 'PM POSHAN (Mid-Day Meal Scheme)', category: 'Schemes & Initiatives' },
    'pm-shri-cm-shri': { name: 'PM SHRI & CM SHRI Exemplary Schools', category: 'Schemes & Initiatives' },
    'pm_shri_cm_shri': { name: 'PM SHRI & CM SHRI Exemplary Schools', category: 'Schemes & Initiatives' },
    'pm-vidya-laxmi': { name: 'PM Vidya Laxmi Education Scheme', category: 'Schemes & Initiatives' },
    'pm_vidya_laxmi': { name: 'PM Vidya Laxmi Education Scheme', category: 'Schemes & Initiatives' },
    'ai-in-education': { name: 'AI & ICT in Modern Classrooms', category: 'Schemes & Initiatives' },
    'ai_in_education': { name: 'AI & ICT in Modern Classrooms', category: 'Schemes & Initiatives' },
    'vidyanjali': { name: 'Vidyanjali 2.0 Community Participation', category: 'Schemes & Initiatives' },
    'yuva-sangam': { name: 'Yuva Sangam (Ek Bharat Shreshtha Bharat)', category: 'Schemes & Initiatives' },
    'yuva_sangam': { name: 'Yuva Sangam (Ek Bharat Shreshtha Bharat)', category: 'Schemes & Initiatives' },
    'kasturba-gandhi-balika-vidyalaya': { name: 'Kasturba Gandhi Balika Vidyalaya (KGBV)', category: 'Schemes & Initiatives' },
    'kasturba_gandhi_balika_vidyalaya': { name: 'Kasturba Gandhi Balika Vidyalaya (KGBV)', category: 'Schemes & Initiatives' },
    'kgbv': { name: 'Kasturba Gandhi Balika Vidyalaya (KGBV)', category: 'Schemes & Initiatives' },
    'sadhana-saptah-2026': { name: 'Sadhana Saptah Pedagogical Week', category: 'Schemes & Initiatives' },
    'sadhana_saptah_2026': { name: 'Sadhana Saptah Pedagogical Week', category: 'Schemes & Initiatives' },
    'sakura-science-2026': { name: 'Sakura Science High School Exchange', category: 'Schemes & Initiatives' },
    'sakura_science_2026': { name: 'Sakura Science High School Exchange', category: 'Schemes & Initiatives' },
    'nasha-mukt-abhiyan': { name: 'Nasha Mukt Bharat Abhiyan in Schools', category: 'Schemes & Initiatives' },
    'nasha_mukt_abhiyan': { name: 'Nasha Mukt Bharat Abhiyan in Schools', category: 'Schemes & Initiatives' },
    'bharat-innovates-2026': { name: 'Bharat Innovates Science & Innovation', category: 'Schemes & Initiatives' },
    'bharat_innovates_2026': { name: 'Bharat Innovates Science & Innovation', category: 'Schemes & Initiatives' },
    'bhartiya-bhasha-summer-camp': { name: 'Bhartiya Bhasha Summer Camps', category: 'Schemes & Initiatives' },
    'bhartiya_bhasha_summer_camp': { name: 'Bhartiya Bhasha Summer Camps', category: 'Schemes & Initiatives' },
};
const ACRONYMS = {
    ccs: 'CCS',
    cca: 'CCA',
    gfr: 'GFR',
    nps: 'NPS',
    cce: 'CCE',
    nep: 'NEP',
    ncf: 'NCF',
    cbse: 'CBSE',
    ncert: 'NCERT',
    kvs: 'KVS',
    jnv: 'JNV',
    nvs: 'NVS',
    emrs: 'EMRS',
    cabe: 'CABE',
    scert: 'SCERT',
    diet: 'DIET',
    ugc: 'UGC',
    nios: 'NIOS',
    odl: 'ODL',
    ignou: 'IGNOU',
    parakh: 'PARAKH',
    fln: 'FLN',
    nipun: 'NIPUN',
    rpwd: 'RPwD',
    pwd: 'PwD',
    cwsn: 'CWSN',
    pm: 'PM',
    shri: 'SHRI',
    kgbv: 'KGBV',
    smc: 'SMC',
    pta: 'PTA',
    pmrc: 'PMRC',
    ict: 'ICT',
    ai: 'AI',
    stem: 'STEM',
    atl: 'ATL',
    rte: 'RTE',
    pocso: 'POCSO',
    poshan: 'POSHAN',
    mdm: 'MDM',
    fr: 'FR',
    sr: 'SR',
    gem: 'GeM',
};
const LOWERCASE_WORDS = new Set(['of', 'and', '&', 'in', 'to', 'for', 'the', 'on', 'with', 'from', 'by', 'at']);
function formatTopicDisplayName(rawSlug) {
    if (!rawSlug)
        return 'General Topic';
    const clean = rawSlug.trim().toLowerCase();
    const canonical = clean.replace(/_/g, '-');
    if (exports.TOPIC_METADATA[canonical])
        return exports.TOPIC_METADATA[canonical].name;
    if (exports.TOPIC_METADATA[clean])
        return exports.TOPIC_METADATA[clean].name;
    const words = clean.split(/[\s_\-]+/).filter(Boolean);
    if (words.length === 0)
        return 'Practice Test';
    const formattedWords = words.map((w, idx) => {
        if (ACRONYMS[w])
            return ACRONYMS[w];
        if (w === 'vs' || w === 'v')
            return 'vs.';
        if (/^\d+$/.test(w))
            return w;
        if (idx > 0 && LOWERCASE_WORDS.has(w))
            return w;
        return w.charAt(0).toUpperCase() + w.slice(1);
    });
    return formattedWords.join(' ');
}
function formatPaperTitle(rawTitle, filename, topic) {
    if (filename.includes('full_mocks/')) {
        const match = filename.match(/mock_test_(\d+)\.json/i);
        if (match) {
            const num = parseInt(match[1], 10);
            const padded = num < 10 ? `0${num}` : `${num}`;
            return `UPSC Principal Full Mock Test ${padded} • Complete CBT Exam`;
        }
        return rawTitle || 'UPSC Principal Full Mock Test';
    }
    if (filename.includes('topic_wise/')) {
        const base = filename.replace('topic_wise/', '').replace('.json', '');
        const match = base.match(/^(.+?)_test_(\d+)$/i);
        if (match) {
            const slug = match[1];
            const partNum = parseInt(match[2], 10);
            const padded = partNum < 10 ? `0${partNum}` : `${partNum}`;
            const topicName = formatTopicDisplayName(slug);
            return `${topicName} • Practice Set ${padded}`;
        }
        if (topic) {
            return `${formatTopicDisplayName(topic)} • Practice Set 01`;
        }
    }
    return rawTitle || 'UPSC Principal Test';
}
function loadAllPapersList() {
    const fullMockDir = path_1.default.join(TESTS_DIR, 'full_mocks');
    const topicWiseDir = path_1.default.join(TESTS_DIR, 'topic_wise');
    const customMockDir = path_1.default.join(TESTS_DIR, 'custom_mocks');
    const tgtPgtDir = path_1.default.join(TESTS_DIR, 'tgt_pgt');
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
    if (fs_1.default.existsSync(customMockDir)) {
        const files = fs_1.default.readdirSync(customMockDir).filter(f => f.endsWith('.json'));
        files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        allFiles.push(...files.map(f => ({ filename: `custom_mocks/${f}`, fullPath: path_1.default.join(customMockDir, f) })));
    }
    if (fs_1.default.existsSync(tgtPgtDir)) {
        const files = fs_1.default.readdirSync(tgtPgtDir).filter(f => f.endsWith('.json') && f !== 'series_catalog.json');
        files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        allFiles.push(...files.map(f => ({ filename: `tgt_pgt/${f}`, fullPath: path_1.default.join(tgtPgtDir, f) })));
    }
    return allFiles.map((fileObj) => {
        let title = "UPSC Principal Test";
        let testId = fileObj.filename;
        let topic = "";
        let fileData = {};
        try {
            fileData = JSON.parse(fs_1.default.readFileSync(fileObj.fullPath, 'utf8'));
            title = fileData.test_name || fileData.title || title;
            topic = fileData.topic || "";
            if (fileData.test_id || fileData._id) {
                testId = fileData.test_id || fileData._id;
            }
        }
        catch (e) { }
        if (fileObj.filename.startsWith('tgt_pgt/')) {
            return {
                id: fileData._id || testId,
                testId: fileData._id || testId,
                title: fileData.title || title,
                filename: fileObj.filename,
                hasAnswers: true,
                series: fileData.exam || (fileObj.filename.includes('pgt_') ? 'pgt' : 'tgt'),
                subject: fileData.subject || '',
                price: fileData.price || 199,
                originalPrice: fileData.originalPrice || 999
            };
        }
        const cleanTitle = formatPaperTitle(title, fileObj.filename, topic);
        return {
            id: fileObj.filename,
            testId: testId,
            title: cleanTitle,
            filename: fileObj.filename,
            hasAnswers: true
        };
    });
}
// GET /api/papers - List all available papers (Instant in-memory cached response)
router.get('/', (req, res) => {
    try {
        const now = Date.now();
        if (!cachedPapersList || (now - lastPapersCacheTime > PAPERS_CACHE_TTL)) {
            cachedPapersList = loadAllPapersList();
            lastPapersCacheTime = now;
        }
        res.json(cachedPapersList);
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
                const meta = exports.TOPIC_METADATA[slug] || exports.TOPIC_METADATA[slug.replace(/_/g, '-')];
                const displayName = meta ? meta.name : formatTopicDisplayName(slug);
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
            ? topics.map(t => exports.TOPIC_METADATA[t]?.name || formatTopicDisplayName(t)).join(', ')
            : 'All UPSC Syllabus Topics';
        let defaultTitle = `UPSC Principal • Custom Mock Test (${pickedQuestions.length} Qs • ${durationMins}m)`;
        if (Array.isArray(topics) && topics.length === 1 && !topics.includes('all')) {
            const singleTopicName = exports.TOPIC_METADATA[topics[0]]?.name || formatTopicDisplayName(topics[0]);
            defaultTitle = `${singleTopicName} • Practice Set (${pickedQuestions.length} Qs)`;
        }
        else if (Array.isArray(topics) && topics.length > 1 && topics.length <= 3 && !topics.includes('all')) {
            const topicNames = topics.map(t => exports.TOPIC_METADATA[t]?.name || formatTopicDisplayName(t)).join(' & ');
            defaultTitle = `${topicNames} • Custom Set (${pickedQuestions.length} Qs)`;
        }
        const testName = title && title.trim()
            ? title.trim()
            : defaultTitle;
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