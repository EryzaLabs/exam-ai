/**
 * Topic & Subject Resolver Utility
 * Maps test filenames, slugs, and titles to clean, standardized syllabus topics and categories.
 */

export const TOPIC_METADATA: Record<string, { name: string; category: string }> = {
  // Leadership & Administration
  'effective-leader-vs-successful-leader': { name: 'School Leadership: Effective vs. Successful Leader', category: 'Administration & Governance' },
  'effective_leader_vs_successful_leader': { name: 'School Leadership: Effective vs. Successful Leader', category: 'Administration & Governance' },
  'transformational-leadership': { name: 'Transformational & Instructional Leadership', category: 'Administration & Governance' },
  'transformational_leadership': { name: 'Transformational & Instructional Leadership', category: 'Administration & Governance' },
  'school-development-plan': { name: 'School Development Plan (SDP) & Planning', category: 'Administration & Governance' },
  'school_development_plan': { name: 'School Development Plan (SDP) & Planning', category: 'Administration & Governance' },

  // Service Rules & Administration
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
  doe: 'DoE',
  ews: 'EWS',
  sc: 'SC',
  st: 'ST',
  pwbd: 'PwBD',
  cbt: 'CBT',
  pyq: 'PYQ',
  dsssb: 'DSSSB',
  tgt: 'TGT',
  pgt: 'PGT',
  upsc: 'UPSC',
  uppsc: 'UPPSC',
};

const LOWERCASE_WORDS = new Set(['of', 'and', '&', 'in', 'to', 'for', 'the', 'on', 'with', 'from', 'by', 'at']);

export function formatTopicDisplayName(rawSlug: string): string {
  if (!rawSlug) return 'General Practice';
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

/**
 * Transforms any test title or filename into a clean, human-readable Title Case format.
 * E.g.: "Topic Test: ANEKARTHI_SHABD - Part 1" -> "Anekarthi Shabd • Practice Set 1"
 *       "Active_and_passive_voice • Practice Set 1" -> "Active and Passive Voice • Practice Set 1"
 */
export function formatCleanTestTitle(rawTitle: string, filename?: string): string {
  if (!rawTitle && !filename) return 'Practice Test';
  const t = (rawTitle || '').trim();
  const f = (filename || '').trim();

  // If already a clean full mock title
  if (t.includes('Full Mock Test') || t.includes('Complete CBT Exam')) {
    return t;
  }
  if (f.includes('full_mocks/')) {
    const match = f.match(/mock_test_(\d+)\.json/i);
    if (match) {
      const num = parseInt(match[1], 10);
      const padded = num < 10 ? `0${num}` : `${num}`;
      return `UPSC Principal Full Mock Test ${padded} • Complete CBT Exam`;
    }
  }

  // Topic test matching
  const topicMatch =
    t.match(/Topic Test:\s*(.+?)\s*-\s*Part\s*(\d+)/i) ||
    f.match(/topic_wise\/(.+?)_test_(\d+)\.json/i) ||
    t.match(/^(.+?)\s*[•·-]\s*(?:Practice\s*Set|Part)\s*(\d+)/i) ||
    t.match(/^(.+?)_test_(\d+)$/i);

  if (topicMatch) {
    const rawTopic = topicMatch[1];
    const part = topicMatch[2];
    const cleanTopic = formatTopicDisplayName(rawTopic);
    return `${cleanTopic} • Practice Set ${part}`;
  }

  // DSSSB PGT/TGT official paper title
  if (t.includes('DSSSB') || f.includes('tgt_pgt/')) {
    return t.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  }

  if (t) {
    return formatTopicDisplayName(t);
  }

  if (f) {
    const base = f.replace(/^.*[\\/]/, '').replace(/\.json$/i, '');
    return formatTopicDisplayName(base);
  }

  return 'Practice Test';
}

export interface ResolvedTopicInfo {
  topic: string;
  subject: string;
  isFullMock: boolean;
}

/**
 * Robust topic and subject extractor for any test attempt (past history or newly generated).
 * Eliminates the bug where tests were incorrectly lumped into a generic "General" bucket.
 */
export function extractTestTopicAndSubject(test: {
  testTitle?: string;
  filename?: string;
  sectionAnalytics?: any[];
}): ResolvedTopicInfo {
  const filename = (test.filename || '').toLowerCase();
  const rawTitle = (test.testTitle || '').trim();

  // 1. Try to extract from filename (e.g. topic_wise/ccs_conduct_rules_1964_test_1.json)
  if (filename.includes('topic_wise/')) {
    const rawSlug = filename
      .replace(/^.*topic_wise\//, '')
      .replace(/_test_\d+.*$/, '')
      .replace(/\.json.*$/, '')
      .replace(/[-_]/g, '_');

    for (const [key, meta] of Object.entries(TOPIC_METADATA)) {
      const normalizedKey = key.toLowerCase().replace(/[-_]/g, '_');
      if (rawSlug === normalizedKey || rawSlug.startsWith(normalizedKey) || normalizedKey.startsWith(rawSlug)) {
        return { topic: meta.name, subject: meta.category, isFullMock: false };
      }
    }

    const formatted = formatTopicDisplayName(rawSlug);
    return { topic: formatted, subject: 'Topic Practice', isFullMock: false };
  }

  // 2. Try to extract from testTitle (e.g. "POCSO Act 2012 & Child Rights • Practice Set 01")
  if (rawTitle) {
    // If title has bullet separator "•", the first part is usually the clean topic name
    if (rawTitle.includes('•')) {
      const topicPart = rawTitle.split('•')[0].trim();
      const lowerPart = topicPart.toLowerCase();

      // Check if it's a full mock
      if (lowerPart.includes('full mock') || lowerPart.includes('cbt exam')) {
        return { topic: 'Full Mock CBT Exam', subject: 'Comprehensive Syllabus', isFullMock: true };
      }

      if (topicPart && lowerPart !== 'general') {
        for (const meta of Object.values(TOPIC_METADATA)) {
          if (lowerPart.includes(meta.name.toLowerCase()) || meta.name.toLowerCase().includes(lowerPart)) {
            return { topic: meta.name, subject: meta.category, isFullMock: false };
          }
        }
        return { topic: topicPart, subject: 'Administration & Governance', isFullMock: false };
      }
    }

    // Check if title starts with "Topic Test: SLUG - Part N"
    const topicTestMatch = rawTitle.match(/Topic Test:\s*([A-Za-z0-9_-]+)/i);
    if (topicTestMatch) {
      const rawSlug = topicTestMatch[1].toLowerCase().replace(/[-_]/g, '_');
      for (const [key, meta] of Object.entries(TOPIC_METADATA)) {
        const normalizedKey = key.toLowerCase().replace(/[-_]/g, '_');
        if (rawSlug.includes(normalizedKey) || normalizedKey.includes(rawSlug)) {
          return { topic: meta.name, subject: meta.category, isFullMock: false };
        }
      }
      const humanized = formatTopicDisplayName(rawSlug);
      return { topic: humanized, subject: 'Topic Practice', isFullMock: false };
    }

    // Keyword matching across all UPSC syllabus domains
    const lower = rawTitle.toLowerCase();
    if (lower.includes('pocso')) return { topic: 'POCSO Act 2012 & Child Rights', subject: 'Policies & Acts', isFullMock: false };
    if (lower.includes('ccs') && lower.includes('conduct')) return { topic: 'CCS (Conduct) Rules, 1964: Civil Services Code', subject: 'Administration & Governance', isFullMock: false };
    if (lower.includes('ccs') && lower.includes('cca')) return { topic: 'CCS (CCA) Rules, 1965: Disciplinary Procedures', subject: 'Administration & Governance', isFullMock: false };
    if (lower.includes('ccs') && lower.includes('leave')) return { topic: 'CCS (Leave) Rules, 1972: Leave Entitlements', subject: 'Administration & Governance', isFullMock: false };
    if (lower.includes('ccs') && lower.includes('pension')) return { topic: 'CCS (Pension) Rules: Service Pension & Gratuity', subject: 'Administration & Governance', isFullMock: false };
    if (lower.includes('nps')) return { topic: 'National Pension System (NPS) & Retirement Rules', subject: 'Administration & Governance', isFullMock: false };
    if (lower.includes('gfr') || lower.includes('financial rules')) return { topic: 'General Financial Rules (GFR) 2017 & Public Procurement', subject: 'Administration & Governance', isFullMock: false };
    if (lower.includes('fr & sr') || lower.includes('fr_sr') || lower.includes('fundamental rules')) return { topic: 'Fundamental Rules & Supplementary Rules (FR & SR)', subject: 'Administration & Governance', isFullMock: false };
    if (lower.includes('leader')) return { topic: 'School Leadership: Effective vs. Successful Leader', subject: 'Administration & Governance', isFullMock: false };
    if (lower.includes('nep')) return { topic: 'NEP 2020 (National Education Policy)', subject: 'Policies & Acts', isFullMock: false };
    if (lower.includes('ncf')) return { topic: 'NCF 2023 (School Education)', subject: 'Policies & Acts', isFullMock: false };
    if (lower.includes('rte') || lower.includes('right to education')) return { topic: 'RTE Act 2009: Free & Compulsory Education', subject: 'Policies & Acts', isFullMock: false };
    if (lower.includes('smc')) return { topic: 'School Management Committees (SMC & PTA)', subject: 'Administration & Governance', isFullMock: false };
    if (lower.includes('pmrc')) return { topic: 'PMRC Administrative Guidelines for Principals', subject: 'Administration & Governance', isFullMock: false };
    if (lower.includes('cce') || lower.includes('evaluation')) return { topic: 'Continuous & Comprehensive Evaluation (CCE)', subject: 'Pedagogy & Assessment', isFullMock: false };
    if (lower.includes('fln') || lower.includes('nipun')) return { topic: 'NIPUN Bharat & FLN Mission', subject: 'Pedagogy & Assessment', isFullMock: false };
    if (lower.includes('parakh')) return { topic: 'PARAKH National Assessment Centre', subject: 'Pedagogy & Assessment', isFullMock: false };
    if (lower.includes('inclusive') || lower.includes('specially abled')) return { topic: 'Inclusive Education & Special Needs', subject: 'Pedagogy & Assessment', isFullMock: false };
    if (lower.includes('kvs')) return { topic: 'Kendriya Vidyalaya Sangathan (KVS) Rules', subject: 'Institutions & Boards', isFullMock: false };
    if (lower.includes('jnv') || lower.includes('navodaya')) return { topic: 'Navodaya Vidyalaya Samiti (NVS / JNV)', subject: 'Institutions & Boards', isFullMock: false };
    if (lower.includes('cbse')) return { topic: 'CBSE Affiliation & Examination Bye-Laws', subject: 'Institutions & Boards', isFullMock: false };
    if (lower.includes('ncert')) return { topic: 'NCERT Mandate, Structure & Curriculum', subject: 'Institutions & Boards', isFullMock: false };
    if (lower.includes('pm poshan') || lower.includes('mid day') || lower.includes('mid-day')) return { topic: 'PM POSHAN (Mid-Day Meal Scheme)', subject: 'Schemes & Initiatives', isFullMock: false };
    if (lower.includes('pm shri') || lower.includes('cm shri')) return { topic: 'PM SHRI & CM SHRI Exemplary Schools', subject: 'Schemes & Initiatives', isFullMock: false };
    if (lower.includes('kgbv') || lower.includes('kasturba')) return { topic: 'Kasturba Gandhi Balika Vidyalaya (KGBV)', subject: 'Schemes & Initiatives', isFullMock: false };

    if (lower.includes('full mock') || lower.includes('cbt exam')) {
      return { topic: 'Full Mock CBT Exam', subject: 'Comprehensive Syllabus', isFullMock: true };
    }
  }

  // 3. Fallback: Check section title if it's NOT "General"
  if (test.sectionAnalytics && test.sectionAnalytics.length > 0) {
    const nonGeneral = test.sectionAnalytics.find(s => s.sectionTitle && s.sectionTitle.toLowerCase() !== 'general');
    if (nonGeneral) {
      return { topic: nonGeneral.sectionTitle, subject: 'Topic Practice', isFullMock: false };
    }
  }

  // 4. Default: If nothing else could be extracted, use "UPSC Principal Practice"
  return { topic: 'Comprehensive Principal Practice', subject: 'General Practice', isFullMock: false };
}

/**
 * Resolves a clean, standardized syllabus topic for an individual question.
 * Strictly prevents question options, correct answers, or explanation fragments from being misclassified as topics.
 */
export function resolveQuestionTopic(
  q: any,
  sectionTitle?: string,
  testTitle?: string
): string {
  if (!q) return 'Core Syllabus';

  // 1. Direct question topic (from parsed question or raw question object)
  const rawTopic = q.topic || q.metadata?.topic;
  if (rawTopic && typeof rawTopic === 'string' && rawTopic.trim()) {
    const clean = rawTopic.trim();
    // Ensure it's not an answer or long sentence
    if (
      !clean.toLowerCase().startsWith('correct answer:') &&
      clean.length < 65 &&
      !clean.includes('||') &&
      !clean.includes('\n')
    ) {
      const lower = clean.toLowerCase();
      if (lower.includes('delhi education act') || lower.includes('delhi school education') || lower.includes('dsea') || lower.includes('dser')) return 'Delhi School Education Act & Rules 1973';
      if (lower.includes('right to education') || lower.includes('rte act')) return 'RTE Act 2009: Free & Compulsory Education';
      if (lower.includes('nep 2020') || lower.includes('national education policy')) return 'NEP 2020 (National Education Policy)';
      if (lower.includes('ncf')) return 'NCF 2023 (School Education)';
      if (lower.includes('evaluation') || lower.includes('measurement') || lower.includes('formative') || lower.includes('summative')) return 'Educational Measurement & Evaluation';
      if (lower.includes('pocso')) return 'POCSO Act 2012 & Child Rights';
      if (lower.includes('smc') || lower.includes('school management')) return 'School Management Committees (SMC & PTA)';
      if (lower.includes('gfr') || lower.includes('financial rules')) return 'General Financial Rules (GFR) 2017 & Public Procurement';
      if (lower.includes('conduct')) return 'CCS (Conduct) Rules, 1964: Civil Services Code';
      if (lower.includes('cca')) return 'CCS (CCA) Rules, 1965: Disciplinary Procedures';
      if (lower.includes('leave')) return 'CCS (Leave) Rules, 1972: Leave Entitlements';
      if (lower.includes('pension') || lower.includes('nps')) return 'National Pension System (NPS) & Retirement Rules';
      if (lower.includes('leader')) return 'School Leadership: Effective vs. Successful Leader';
      if (lower.includes('disability') || lower.includes('inclusive') || lower.includes('special talent') || lower.includes('handicapped')) return 'Inclusive Education & Special Needs';
      if (lower.includes('language') || lower.includes('literacy')) return 'Language Education & Literacy';
      if (lower.includes('mathematics') || lower.includes('math')) return 'Mathematics & Quantitative Reasoning';
      if (lower.includes('science')) return 'Science Education & Inquiry';
      if (lower.includes('constitution')) return 'Constitutional Provisions for Education';
      if (lower.includes('thinker')) return 'Educational Thinkers & Philosophies';
      if (lower.includes('play') || lower.includes('preparatory') || lower.includes('initial') || lower.includes('competency') || lower.includes('learning outcome')) return 'Curriculum, Pedagogy & Learning Standards';
      return formatTopicDisplayName(clean);
    }
  }

  // 2. Direct question subject
  const rawSubject = q.subject || q.metadata?.subject;
  if (
    rawSubject &&
    typeof rawSubject === 'string' &&
    rawSubject.trim() &&
    rawSubject !== 'General' &&
    rawSubject !== 'UPSC Principal Paper' &&
    rawSubject !== 'Core Subject'
  ) {
    const clean = rawSubject.trim();
    if (!clean.toLowerCase().startsWith('correct answer:') && clean.length < 65) {
      return formatTopicDisplayName(clean);
    }
  }

  // 3. Section Title if meaningful (e.g. in DSSSB TGT/PGT)
  if (sectionTitle && typeof sectionTitle === 'string' && sectionTitle.trim()) {
    const cleanSec = sectionTitle.trim();
    if (
      cleanSec !== 'main' &&
      !cleanSec.toLowerCase().startsWith('section') &&
      cleanSec.toLowerCase() !== 'general' &&
      cleanSec.toLowerCase() !== 'full mock cbt'
    ) {
      return cleanSec;
    }
  }

  // 4. Test title / filename extraction (e.g. for topic tests)
  if (testTitle || q.testTitle || q.filename) {
    const res = extractTestTopicAndSubject({
      testTitle: testTitle || q.testTitle,
      filename: q.filename,
    });
    if (res && res.topic && res.topic !== 'Full Mock CBT Exam' && res.topic !== 'Comprehensive Principal Practice') {
      return res.topic;
    }
  }

  // 5. Intelligent syllabus keyword matching on question text
  const text = (q.questionText || q.question_english || q.question || '').toLowerCase();
  if (text.includes('rte') || text.includes('right to education')) return 'RTE Act 2009: Free & Compulsory Education';
  if (text.includes('nep 2020') || text.includes('national education policy 2020') || text.includes('nep-2020')) return 'NEP 2020 (National Education Policy)';
  if (text.includes('ncf') || text.includes('national curriculum framework')) return 'NCF 2023 (School Education)';
  if (text.includes('dsea') || text.includes('dser') || text.includes('delhi school education')) return 'Delhi School Education Act & Rules 1973';
  if (text.includes('ccs (conduct)') || text.includes('conduct rules')) return 'CCS (Conduct) Rules, 1964: Civil Services Code';
  if (text.includes('ccs (cca)') || text.includes('cca rules')) return 'CCS (CCA) Rules, 1965: Disciplinary Procedures';
  if (text.includes('ccs (leave)') || text.includes('maternity leave') || text.includes('earned leave')) return 'CCS (Leave) Rules, 1972: Leave Entitlements';
  if (text.includes('pension rules') || text.includes('nps') || text.includes('gratuity')) return 'National Pension System (NPS) & Retirement Rules';
  if (text.includes('gfr') || text.includes('general financial') || text.includes('procurement') || text.includes('concurrence')) return 'General Financial Rules (GFR) 2017 & Public Procurement';
  if (text.includes('fr & sr') || text.includes('fundamental rules') || text.includes('supplementary rules')) return 'Fundamental Rules & Supplementary Rules (FR & SR)';
  if (text.includes('pocso')) return 'POCSO Act 2012 & Child Rights';
  if (text.includes('kothari') || text.includes('npe 1968') || text.includes('npe 1986')) return 'National Educational Policies (NPE 1968 & 1986)';
  if (text.includes('smc') || text.includes('school management committee') || text.includes('pta')) return 'School Management Committees (SMC & PTA)';
  if (text.includes('pedagogy') || text.includes('andragogy') || text.includes('foundational stage') || text.includes('early childhood') || text.includes('ecce')) return 'Child Development & Pedagogy';
  if (text.includes('criterion-referenced') || text.includes('norm-referenced') || text.includes('evaluation') || text.includes('assessment') || text.includes('t-score') || text.includes('z-score') || text.includes('standard deviation')) return 'Educational Measurement & Psychometrics';
  if (text.includes('mathematics') || text.includes('numeracy')) return 'Mathematics & Quantitative Aptitude';
  if (text.includes('science') || text.includes('scientific inquiry')) return 'Science Education & Methodology';
  if (text.includes('language') || text.includes('multilingualism') || text.includes('three-language')) return 'Language Education & Multilingualism';
  if (text.includes('supervision') || text.includes('leadership') || text.includes('head of school') || text.includes('school development plan')) return 'School Leadership: Effective vs. Successful Leader';
  if (text.includes('disability') || text.includes('inclusive') || text.includes('special education') || text.includes('pwbd') || text.includes('backward classes')) return 'Inclusive Education & Special Needs';

  return 'Administration & Governance';
}
