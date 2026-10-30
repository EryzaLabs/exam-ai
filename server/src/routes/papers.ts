import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const DATA_ROOT = path.resolve(__dirname, '../../../'); 
const TESTS_DIR = path.join(DATA_ROOT, 'tests_json');
const ANSWERS_DIR = path.join(DATA_ROOT, 'ai_generated_answers');

// In-memory cache for high performance & 0ms responses without blocking event loop
let cachedPapersList: any[] | null = null;
let lastPapersCacheTime = 0;
const PAPERS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export function invalidatePapersCache() {
  cachedPapersList = null;
}

export const TOPIC_METADATA: Record<string, { name: string; category: string }> = {
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

const ACRONYMS: Record<string, string> = {
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

export function formatTopicDisplayName(rawSlug: string): string {
  if (!rawSlug) return 'General Topic';
  const clean = rawSlug.trim().toLowerCase();
  const canonical = clean.replace(/_/g, '-');

  if (TOPIC_METADATA[canonical]) return TOPIC_METADATA[canonical].name;
  if (TOPIC_METADATA[clean]) return TOPIC_METADATA[clean].name;

  const words = clean.split(/[\s_\-]+/).filter(Boolean);
  if (words.length === 0) return 'Practice Test';

  const formattedWords = words.map((w, idx) => {
    if (ACRONYMS[w]) return ACRONYMS[w];
    if (w === 'vs' || w === 'v') return 'vs.';
    if (/^\d+$/.test(w)) return w;
    if (idx > 0 && LOWERCASE_WORDS.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  });

  return formattedWords.join(' ');
}

export function formatPaperTitle(rawTitle: string | undefined, filename: string, topic?: string): string {
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

function loadAllPapersList(): any[] {
  const fullMockDir = path.join(TESTS_DIR, 'full_mocks');
  const topicWiseDir = path.join(TESTS_DIR, 'topic_wise');
  const customMockDir = path.join(TESTS_DIR, 'custom_mocks');
  
  let allFiles: { filename: string, fullPath: string }[] = [];
  
  if (fs.existsSync(fullMockDir)) {
    const files = fs.readdirSync(fullMockDir).filter(f => f.endsWith('.json'));
    files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    allFiles.push(...files.map(f => ({ filename: `full_mocks/${f}`, fullPath: path.join(fullMockDir, f) })));
  }
  if (fs.existsSync(topicWiseDir)) {
    const files = fs.readdirSync(topicWiseDir).filter(f => f.endsWith('.json'));
    files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    allFiles.push(...files.map(f => ({ filename: `topic_wise/${f}`, fullPath: path.join(topicWiseDir, f) })));
  }
  if (fs.existsSync(customMockDir)) {
    const files = fs.readdirSync(customMockDir).filter(f => f.endsWith('.json'));
    files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    allFiles.push(...files.map(f => ({ filename: `custom_mocks/${f}`, fullPath: path.join(customMockDir, f) })));
  }

  return allFiles.map((fileObj) => {
    let title = "UPSC Principal Test";
    let testId = fileObj.filename;
    let topic = "";
    try {
      const fileData = JSON.parse(fs.readFileSync(fileObj.fullPath, 'utf8'));
      title = fileData.test_name || title;
      topic = fileData.topic || "";
      if (fileData.test_id) {
        testId = fileData.test_id;
      }
    } catch (e) {}

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
router.get('/', (req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (!cachedPapersList || (now - lastPapersCacheTime > PAPERS_CACHE_TTL)) {
      cachedPapersList = loadAllPapersList();
      lastPapersCacheTime = now;
    }
    res.json(cachedPapersList);
  } catch (error: any) {
    console.error('Error listing papers:', error);
    res.status(500).json({ error: error.message });
  }
});

const CUSTOM_MOCKS_DIR = path.join(TESTS_DIR, 'custom_mocks');
if (!fs.existsSync(CUSTOM_MOCKS_DIR)) {
  try {
    fs.mkdirSync(CUSTOM_MOCKS_DIR, { recursive: true });
  } catch (e) {}
}

// GET /api/papers/custom/topics - List all topics with question counts and categories
router.get('/custom/topics', (req: Request, res: Response) => {
  try {
    const topicWiseDir = path.join(TESTS_DIR, 'topic_wise');
    if (!fs.existsSync(topicWiseDir)) {
      return res.json({ topics: [], categories: [], totalTopics: 0, totalQuestions: 0 });
    }

    const files = fs.readdirSync(topicWiseDir).filter(f => f.endsWith('.json'));
    const topicMap: Record<string, { id: string; name: string; category: string; questionCount: number; testCount: number }> = {};
    let totalQuestionsCount = 0;

    for (const f of files) {
      const match = f.match(/^(.*?)_test_\d+\.json$/);
      const slug = match ? match[1] : f.replace('.json', '');
      
      let qCount = 20; // default estimated
      try {
        const data = JSON.parse(fs.readFileSync(path.join(topicWiseDir, f), 'utf8'));
        if (Array.isArray(data.questions)) {
          qCount = data.questions.length;
        }
      } catch (e) {}

      totalQuestionsCount += qCount;

      if (!topicMap[slug]) {
        const meta = TOPIC_METADATA[slug] || TOPIC_METADATA[slug.replace(/_/g, '-')];
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
  } catch (error: any) {
    console.error('Error fetching custom topics:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/papers/custom/create - Generate a custom mock test from selected topics, question count, and duration
router.post('/custom/create', (req: Request, res: Response) => {
  try {
    const { topics = [], questionCount = 30, durationMinutes = 45, title = '' } = req.body;

    const targetCount = Math.max(5, Math.min(120, parseInt(questionCount) || 30));
    const durationMins = Math.max(5, Math.min(180, parseInt(durationMinutes) || 45));

    const topicWiseDir = path.join(TESTS_DIR, 'topic_wise');
    if (!fs.existsSync(topicWiseDir)) {
      return res.status(500).json({ error: 'Topics directory not found' });
    }

    const allTopicFiles = fs.readdirSync(topicWiseDir).filter(f => f.endsWith('.json'));

    let selectedFiles = allTopicFiles;
    if (Array.isArray(topics) && topics.length > 0 && !topics.includes('all')) {
      selectedFiles = allTopicFiles.filter(f => {
        return topics.some(t => f.startsWith(`${t}_test_`) || f === `${t}.json`);
      });
    }

    if (selectedFiles.length === 0) {
      selectedFiles = allTopicFiles;
    }

    const pool: any[] = [];
    const seenIds = new Set<string>();

    for (const f of selectedFiles) {
      try {
        const fullPath = path.join(topicWiseDir, f);
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (Array.isArray(data.questions)) {
          for (const q of data.questions) {
            const qId = q.id || `${f}_${pool.length}`;
            if (!seenIds.has(qId)) {
              seenIds.add(qId);
              pool.push(q);
            }
          }
        }
      } catch (e) {}
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
      ? topics.map(t => TOPIC_METADATA[t]?.name || formatTopicDisplayName(t)).join(', ')
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

    if (!fs.existsSync(CUSTOM_MOCKS_DIR)) {
      fs.mkdirSync(CUSTOM_MOCKS_DIR, { recursive: true });
    }

    const filePath = path.join(CUSTOM_MOCKS_DIR, `${testId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(customPaper, null, 2), 'utf8');

    return res.json({
      success: true,
      testId: testId,
      filename: `custom_mocks/${testId}.json`,
      paper: customPaper
    });
  } catch (error: any) {
    console.error('Error creating custom test:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/papers/find/:identifier - Find paper content by test_id or filename
router.get('/find/:identifier', (req: Request, res: Response) => {
  try {
    const identifier = decodeURIComponent(req.params.identifier);
    const fullMockDir = path.join(TESTS_DIR, 'full_mocks');
    const topicWiseDir = path.join(TESTS_DIR, 'topic_wise');
    const customMockDir = path.join(TESTS_DIR, 'custom_mocks');

    const searchDirs = [fullMockDir, topicWiseDir, customMockDir];
    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const fullPath = path.join(dir, file);
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (
            content.includes(`"test_id": "${identifier}"`) ||
            content.includes(`"test_id":"${identifier}"`) ||
            file === identifier ||
            file.replace('.json', '') === identifier
          ) {
            res.setHeader('Content-Type', 'application/json');
            return res.send(content);
          }
        } catch (e) {}
      }
    }
    return res.status(404).json({ error: 'Paper not found' });
  } catch (error: any) {
    console.error('Error finding paper by id:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/papers/:folder/:filename - Get paper content
router.get('/:folder/:filename', (req: Request, res: Response) => {
  try {
    const filename = path.join(req.params.folder, req.params.filename);
    const filePath = path.join(TESTS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    res.setHeader('Content-Type', 'application/json');
    fs.createReadStream(filePath).pipe(res);
  } catch (error: any) {
    console.error('Error serving paper:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/papers/:folder/:filename/answers - Get answers content
router.get('/:folder/:filename/answers', (req: Request, res: Response) => {
  try {
    const filename = path.join(req.params.folder, req.params.filename);
    const filePath = path.join(TESTS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Answers not found' });
    }

    res.setHeader('Content-Type', 'application/json');
    fs.createReadStream(filePath).pipe(res);
  } catch (error: any) {
    console.error('Error serving answers:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
