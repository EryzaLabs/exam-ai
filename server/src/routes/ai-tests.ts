import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getFirestoreAdmin } from '../firebase-admin';

const router = Router();

const DATA_ROOT = path.resolve(__dirname, '../../../');
const TESTS_DIR = path.join(DATA_ROOT, 'tests_json');
const CUSTOM_MOCKS_DIR = path.join(TESTS_DIR, 'custom_mocks');
const LIMITS_FILE = path.join(DATA_ROOT, 'server', 'data', 'ai_test_limits.json');

// Ensure directories exist
if (!fs.existsSync(CUSTOM_MOCKS_DIR)) {
  try {
    fs.mkdirSync(CUSTOM_MOCKS_DIR, { recursive: true });
  } catch (e) {}
}

const dataDir = path.dirname(LIMITS_FILE);
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (e) {}
}

// In-memory job tracker
export interface AiTestJob {
  id: string;
  userId: string;
  topic: string;
  questionCount: number;
  durationMinutes: number;
  difficulty: string;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  progress: number; // 0 - 100
  step: string;
  etaSeconds: number;
  startTime: number;
  error?: string;
  testId?: string;
  filename?: string;
  paper?: any;
}

const jobs = new Map<string, AiTestJob>();

// Cleanup old jobs after 1 hour
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.startTime > 3600000) {
      jobs.delete(id);
    }
  }
}, 300000);

// Helper for local daily limit persistence
function loadDailyLimits(): Record<string, string> {
  try {
    if (fs.existsSync(LIMITS_FILE)) {
      return JSON.parse(fs.readFileSync(LIMITS_FILE, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function saveDailyLimits(limits: Record<string, string>) {
  try {
    fs.writeFileSync(LIMITS_FILE, JSON.stringify(limits, null, 2), 'utf8');
  } catch (e) {}
}

function getTodayString(): string {
  // Use Indian Standard Time (IST) / local date
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().slice(0, 10);
}

/**
 * Check if user has already generated an AI test today
 */
async function hasUserReachedDailyLimit(userId: string): Promise<boolean> {
  const today = getTodayString();
  const localLimits = loadDailyLimits();
  if (localLimits[userId] === today) {
    return true;
  }

  // Check Firestore if available
  try {
    const firestore = getFirestoreAdmin();
    if (firestore) {
      const userDoc = await firestore.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data?.lastAiTestDate === today) {
          return true;
        }
      }
    }
  } catch (e) {
    // Fall back to local check
  }

  return false;
}

/**
 * Record today's generation for the user
 */
async function recordUserDailyGeneration(userId: string): Promise<void> {
  const today = getTodayString();
  const localLimits = loadDailyLimits();
  localLimits[userId] = today;
  saveDailyLimits(localLimits);

  try {
    const firestore = getFirestoreAdmin();
    if (firestore) {
      await firestore.collection('users').doc(userId).set(
        {
          lastAiTestDate: today,
          aiTestsGeneratedCount: (await firestore.collection('users').doc(userId).get()).data()?.aiTestsGeneratedCount
            ? (await firestore.collection('users').doc(userId).get()).data()?.aiTestsGeneratedCount + 1
            : 1,
        },
        { merge: true }
      );
    }
  } catch (e) {
    // Ignore Firestore errors if offline
  }
}

/**
 * GET /api/ai-tests/daily-status/:userId
 * Check if user can generate a test today
 */
router.get('/daily-status/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId || 'anonymous';
    const reached = await hasUserReachedDailyLimit(userId);
    const today = getTodayString();

    res.json({
      canGenerate: !reached,
      today,
      limit: 1,
      message: reached
        ? 'Daily limit reached. You can generate 1 custom AI test per day. Resets tomorrow at midnight.'
        : 'You have 1 custom AI test generation available for today.',
    });
  } catch (error: any) {
    console.error('Error checking daily status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-tests/generate
 * Initiate background AI test generation
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      userId = 'anonymous',
      topic,
      questionCount = 10,
      durationMinutes = 20,
      difficulty = 'medium',
    } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Please enter a valid topic name.' });
    }

    // 1. Verify Daily Limit (1 per account per day)
    const reached = await hasUserReachedDailyLimit(userId);
    if (reached) {
      return res.status(403).json({
        error: 'Daily limit reached: You can generate 1 custom AI test per day. Please try again tomorrow!',
      });
    }

    const cleanCount = Math.max(5, Math.min(25, parseInt(questionCount) || 10));
    const cleanDuration = Math.max(5, Math.min(60, parseInt(durationMinutes) || 20));

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: AiTestJob = {
      id: jobId,
      userId,
      topic: topic.trim(),
      questionCount: cleanCount,
      durationMinutes: cleanDuration,
      difficulty: difficulty || 'medium',
      status: 'generating',
      progress: 5,
      step: 'Initializing AI question generator pipeline...',
      etaSeconds: 28,
      startTime: Date.now(),
    };

    jobs.set(jobId, job);

    // Run background generation without blocking HTTP response
    processAiTestGeneration(job).catch((err) => {
      console.error(`Unhandled error in job ${jobId}:`, err);
      job.status = 'failed';
      job.error = 'AI generator service is currently busy or out of credits. Please try again later.';
    });

    res.json({
      success: true,
      jobId,
      etaSeconds: job.etaSeconds,
      message: 'AI generation started in background.',
    });
  } catch (error: any) {
    console.error('Error starting AI generation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai-tests/status/:jobId
 * Poll background progress
 */
router.get('/status/:jobId', (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Generation job not found or expired' });
  }

  res.json({
    id: job.id,
    status: job.status,
    progress: Math.min(100, Math.round(job.progress)),
    step: job.step,
    etaSeconds: Math.max(0, job.etaSeconds),
    error: job.error,
    testId: job.testId,
    filename: job.filename,
    paper: job.paper ? {
      test_id: job.paper.test_id,
      test_name: job.paper.test_name,
      total_questions: job.paper.questions?.length,
      duration: job.paper.duration,
    } : undefined,
  });
});

/**
 * Background AI Generation Process
 */
async function processAiTestGeneration(job: AiTestJob): Promise<void> {
  const apiKey =
    process.env.VLM_API_KEY ||
    process.env.EXPO_PUBLIC_VLM_API_KEY ||
    process.env.HACKCLUB_API_KEY ||
    '';

  const apiUrl = 'https://ai.hackclub.com/proxy/v1/chat/completions';
  const model = 'google/gemini-2.5-flash';

  // Progress update helper
  const updateProgress = (pct: number, stepText: string, eta: number) => {
    job.progress = pct;
    job.step = stepText;
    job.etaSeconds = eta;
  };

  // Step 1: Initializing
  updateProgress(15, `Analyzing topic: "${job.topic}"...`, 25);
  await new Promise((r) => setTimeout(r, 1200));

  // Step 2: Prompt preparation
  updateProgress(35, 'Crafting conceptual question blueprint & options...', 20);

  const prompt = `You are an elite competitive exam setter.
Create exactly ${job.questionCount} high-quality, verified multiple-choice questions on the topic: "${job.topic}".
Target Difficulty: ${job.difficulty} (mix of factual and analytical reasoning).
Ensure questions are completely unique, rigorous, and strictly relevant to "${job.topic}".

CRITICAL REQUIREMENTS:
1. Every question MUST be bilingual with complete English and Hindi translations:
   - "question_english" and "question_hindi"
   - "options_english": 4 distinct plausible options [A, B, C, D]
   - "options_hindi": 4 corresponding Hindi translations
   - "correct_answer_index": integer 0, 1, 2, or 3 representing the correct option
   - "explanation_english": detailed conceptual explanation of the answer
   - "explanation_hindi": detailed conceptual explanation in Hindi
2. Return ONLY a valid JSON object matching this exact schema:
{
  "questions": [
    {
      "question_english": "...",
      "question_hindi": "...",
      "options_english": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "options_hindi": ["Option 1 in Hindi", "Option 2 in Hindi", "Option 3 in Hindi", "Option 4 in Hindi"],
      "correct_answer_index": 0,
      "explanation_english": "...",
      "explanation_hindi": "..."
    }
  ]
}`;

  let response: any;
  try {
    // Update progress right before request
    updateProgress(55, 'Generating questions, options & bilingual translations...', 15);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000);

    const fetchRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert exam question creator. Always respond strictly in valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // If HTTP error (e.g. 402 spending limit reached, 429 rate limit, 401, 500)
    if (!fetchRes.ok) {
      const errBody = await fetchRes.text().catch(() => '');
      console.warn(`[AI Generator] Service returned error ${fetchRes.status}: ${errBody}`);
      job.status = 'failed';
      job.error = 'AI generator service is currently busy or out of credits. Please try again later.';
      return;
    }

    response = await fetchRes.json();
  } catch (error: any) {
    console.warn('[AI Generator] Request failed:', error.message);
    job.status = 'failed';
    job.error = 'AI generator service is currently busy or out of credits. Please try again later.';
    return;
  }

  // Step 3: Parsing response
  updateProgress(80, 'Validating answer keys and formatting explanations...', 8);
  await new Promise((r) => setTimeout(r, 600));

  try {
    const rawContent = response?.choices?.[0]?.message?.content || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      // Try extracting json bracket
      const start = rawContent.indexOf('{');
      const end = rawContent.lastIndexOf('}') + 1;
      if (start >= 0 && end > start) {
        parsed = JSON.parse(rawContent.substring(start, end));
      } else {
        throw new Error('Invalid JSON structure from AI');
      }
    }

    const rawList: any[] = Array.isArray(parsed.questions)
      ? parsed.questions
      : Array.isArray(parsed)
      ? parsed
      : [];

    if (rawList.length === 0) {
      job.status = 'failed';
      job.error = 'AI generator service is currently busy or out of credits. Please try again later.';
      return;
    }

    // Step 4: Formatting questions into app schema
    updateProgress(90, 'Packaging test into available custom mock tests...', 4);

    const labels = ['a', 'b', 'c', 'd'];
    const formattedQuestions = rawList.map((q: any, idx: number) => {
      const correctIdx = typeof q.correct_answer_index === 'number' && q.correct_answer_index >= 0 && q.correct_answer_index <= 3
        ? q.correct_answer_index
        : 0;

      return {
        id: `ai_q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        question_english: q.question_english || q.question || 'Question',
        question_hindi: q.question_hindi || q.question_english || 'प्रश्न',
        options_english: Array.isArray(q.options_english) && q.options_english.length === 4
          ? q.options_english
          : (Array.isArray(q.options) && q.options.length === 4 ? q.options : ['A', 'B', 'C', 'D']),
        options_hindi: Array.isArray(q.options_hindi) && q.options_hindi.length === 4
          ? q.options_hindi
          : (Array.isArray(q.options) && q.options.length === 4 ? q.options : ['A', 'B', 'C', 'D']),
        option_labels: ['A', 'B', 'C', 'D'],
        correct_answer: labels[correctIdx],
        explanation_english: q.explanation_english || q.explanation || 'Refer to study material for details.',
        explanation_hindi: q.explanation_hindi || q.explanation_english || 'विस्तार के लिए अध्ययन सामग्री देखें।',
        topic: job.topic,
        difficulty: job.difficulty,
        source: 'custom-ai-pipeline',
        language: 'bilingual',
        subject: 'Custom AI Practice Test',
        created_at: new Date().toISOString(),
      };
    });

    const testId = `ai_custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const testName = `AI Test: ${job.topic} (${formattedQuestions.length} Qs)`;
    const filename = `custom_mocks/${testId}.json`;

    const paper = {
      test_id: testId,
      test_name: testName,
      type: 'custom_ai',
      topic: job.topic,
      difficulty: job.difficulty,
      duration_minutes: job.durationMinutes,
      duration: job.durationMinutes * 60,
      total_marks: formattedQuestions.length * 2.5,
      total_questions: formattedQuestions.length,
      created_at: new Date().toISOString(),
      questions: formattedQuestions,
    };

    // Save into custom_mocks
    const filePath = path.join(CUSTOM_MOCKS_DIR, `${testId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(paper, null, 2), 'utf8');

    // Record user daily quota ONLY on success
    await recordUserDailyGeneration(job.userId);

    // Step 5: Completed
    job.progress = 100;
    job.etaSeconds = 0;
    job.step = 'Custom AI mock test is ready!';
    job.status = 'completed';
    job.testId = testId;
    job.filename = filename;
    job.paper = paper;
    console.log(`[AI Generator] Successfully generated test ${testId} for topic "${job.topic}"`);
  } catch (error: any) {
    console.warn('[AI Generator] Post-processing failed:', error.message);
    job.status = 'failed';
    job.error = 'AI generator service is currently busy or out of credits. Please try again later.';
  }
}

export default router;
