import { sendChatMessage, ChatMessage } from './ai-assistant-service';
import {
  INITIAL_FULL_MOCKS,
  INITIAL_TOPIC_PAPERS,
  INITIAL_TGT_PGT_PAPERS,
  ServerPaper,
} from './paper-service';
import { ExamTarget } from '@/context/exam-context';

export type VidyaAgentAction =
  | {
      type: 'SUGGEST_TEST';
      title: string;
      testId: string;
      filename: string;
      questions?: number;
      duration?: number;
    }
  | {
      type: 'CREATE_AI_TEST';
      topic: string;
      questionCount?: number;
      difficulty?: 'easy' | 'medium' | 'hard';
    }
  | {
      type: 'START_DRILL';
      topic: string;
    }
  | {
      type: 'NAVIGATE';
      route: string;
      label: string;
    }
  | {
      type: 'SWITCH_EXAM';
      examMode: 'upsc' | 'uppsc' | 'tgt' | 'pgt';
      label?: string;
    }
  | {
      type: 'SWITCH_LANGUAGE';
      lang: 'en' | 'hi';
    }
  | {
      type: 'START_WALKTHROUGH';
    }
  | {
      type: 'QUICK_REPLIES';
      options: string[];
    };

export interface VidyaAgentResponse {
  text: string;
  actions: VidyaAgentAction[];
}

export interface AgentContextInfo {
  examMode: ExamTarget;
  lang: 'en' | 'hi';
  isSubscribed: boolean;
  userName?: string;
  targetCadre?: string;
  designation?: string;
  totalTestsCompleted?: number;
  questionsAttempted?: number;
  overallAccuracy?: number;
  streak?: number;
  timeSpentMins?: number;
  weakTopics?: Array<{ topic: string; accuracy: number }>;
  strongTopics?: Array<{ topic: string; accuracy: number }>;
  recentTests?: Array<{ title: string; accuracy: number; date?: string }>;
  activeTests?: Array<{ title: string; remainingMins?: number }>;
}

function findMatchingPapers(query: string, examMode: ExamTarget): ServerPaper[] {
  const q = query.toLowerCase().trim();
  const stopWords = new Set([
    'give', 'me', 'a', 'an', 'the', 'test', 'on', 'about', 'for', 'suggest',
    'recommend', 'practice', 'mock', 'create', 'make', 'generate', 'start',
    'open', 'some', 'any', 'please', 'can', 'you', 'want', 'to', 'do', 'in',
    'of', 'and', 'or', 'is', 'with', 'मुझे', 'एक', 'टेस्ट', 'दो', 'बनाओ', 'करना', 'है', 'पर', 'में',
  ]);

  const keywords = q
    .replace(/[^\w\s\u0900-\u097F]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));

  let pool: ServerPaper[] = [];
  if (examMode === 'tgt') {
    pool = [
      ...INITIAL_TGT_PGT_PAPERS.filter((p) => p.series === 'tgt' || p.filename.includes('tgt')),
      ...INITIAL_TOPIC_PAPERS,
    ];
  } else if (examMode === 'pgt') {
    pool = [
      ...INITIAL_TGT_PGT_PAPERS.filter((p) => p.series === 'pgt' || p.filename.includes('pgt')),
      ...INITIAL_TOPIC_PAPERS,
    ];
  } else {
    pool = [...INITIAL_FULL_MOCKS, ...INITIAL_TOPIC_PAPERS];
  }

  if (keywords.length === 0) {
    // Return top 4 full mocks + 4 topic papers as general suggestions
    return [
      ...INITIAL_FULL_MOCKS.slice(0, 3),
      ...INITIAL_TOPIC_PAPERS.slice(0, 3),
    ];
  }

  const scored = pool
    .map((p) => {
      const hay = `${p.title} ${p.subject || ''} ${p.filename}`.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (hay.includes(kw)) score += 1;
      }
      return { paper: p, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 6).map((s) => s.paper);
}

export function parseVidyaActions(rawMessage: string): VidyaAgentResponse {
  const actions: VidyaAgentAction[] = [];
  const actionRegex = /\[\[ACTION:([\s\S]*?)\]\]/g;

  const cleanedText = rawMessage
    .replace(actionRegex, (_, jsonStr) => {
      try {
        const parsed = JSON.parse(jsonStr.trim());
        if (parsed && typeof parsed === 'object' && parsed.type) {
          actions.push(parsed as VidyaAgentAction);
        }
      } catch {
        // Ignore malformed action block
      }
      return '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    text: cleanedText,
    actions,
  };
}

export async function askVidyaAgent(
  conversationHistory: ChatMessage[],
  contextInfo: AgentContextInfo
): Promise<VidyaAgentResponse> {
  const lastUserMsg =
    [...conversationHistory].reverse().find((m) => m.role === 'user')?.content || '';

  const matchedPapers = findMatchingPapers(lastUserMsg, contextInfo.examMode);
  const catalogSnippet =
    matchedPapers.length > 0
      ? matchedPapers
          .map(
            (p) =>
              `- Title: "${p.title}" | testId: "${p.testId}" | filename: "${p.filename}" | Questions: ${p.totalQuestions || 20} | Duration: ${p.duration || 20}m | Topic: "${p.subject || 'General'}"`
          )
          .join('\n')
      : 'No exact matching papers found in the built-in catalog for this query.';

  const weakTopicsText =
    contextInfo.weakTopics && contextInfo.weakTopics.length > 0
      ? contextInfo.weakTopics.map((w) => `${w.topic} (${Math.round(w.accuracy)}%)`).join(', ')
      : 'None recorded yet';

  const strongTopicsText =
    contextInfo.strongTopics && contextInfo.strongTopics.length > 0
      ? contextInfo.strongTopics.map((s) => `${s.topic} (${Math.round(s.accuracy)}%)`).join(', ')
      : 'None recorded yet';

  const recentTestsText =
    contextInfo.recentTests && contextInfo.recentTests.length > 0
      ? contextInfo.recentTests
          .map((r) => `- ${r.title} (${Math.round(r.accuracy)}% accuracy)`)
          .join('\n')
      : 'No tests completed yet';

  const activeTestsText =
    contextInfo.activeTests && contextInfo.activeTests.length > 0
      ? contextInfo.activeTests
          .map((a) => `- ${a.title} (${a.remainingMins ?? '?'} mins left)`)
          .join('\n')
      : 'None';

  const systemPrompt: ChatMessage = {
    role: 'system',
    content: `You are **Vidya**, the complete AI Agent and Study Mentor for **Astra Exam AI** (India's preparation platform for UPSC Principal, UP Principal, DSSSB TGT, and DSSSB PGT exams).

You do THREE things seamlessly:
1. **Explain anything**: Syllabus concepts (CCS Rules, GFR 2017, FR/SR, RTE 2009, NEP 2020, NCF 2023, POCSO, Pedagogy, Hindi, English), exam questions, AND any feature or workflow of the Astra Exam AI website.
2. **Use the user's complete analytics & profile**: Personalize every suggestion using their actual accuracy, weak topics, strong topics, recent test scores, and in-progress tests below.
3. **Perform website actions & smart follow-ups**: Suggest real tests, create AI custom tests (especially when a user asks for a test on a topic that doesn't exist in the catalog!), launch quick drills, navigate to pages, switch exams, switch app language, or start the interactive voice walkthrough.

### Website Capabilities & Routes you can explain or open:
- **Home Dashboard** (\`/\`): Resume active tests, see daily practice target, recommended next mock/weak topic drill.
- **Full CBT Mock Tests** (\`/test-list\`): 150+ full-length mocks + 350+ DSSSB TGT/PGT official papers with live question palette, mark-for-review, negative marking, bilingual toggle, and auto-save on reload.
- **Practice Hub** (\`/practice\`): 950+ topic-wise practice sets (20 Qs each), Quick Practice, and 10-question Topic Drills.
- **AI Custom Test Builder** (\`/custom-ai-test\`): Generates fresh bilingual MCQs on ANY topic (even outside the built-in syllabus!) with custom question count (5/10/15/20) and difficulty (easy/medium/hard).
- **Performance Analytics** (\`/progress\`): Accuracy trends and Topic Performance Breakdown highlighting weak topics below 50%.
- **Profile, Bookmarks & Settings** (\`/profile\`): Saved question bookmarks, light/dark Chalkboard theme, EN/HI language toggle, and Replay Walkthrough.
- **2026 Pass / Premium** (\`/premium\`): Unlocks all mock tests, topic sets, and unlimited Vidya AI queries.

### Complete User Profile & Live Analytics:
- Name: **${contextInfo.userName || 'Aspirant'}**
- Target Cadre / Role: **${contextInfo.targetCadre || contextInfo.examMode.toUpperCase()}** ${contextInfo.designation ? `(${contextInfo.designation})` : ''}
- Active Exam Track: **${contextInfo.examMode}**
- Preferred App Language: **${contextInfo.lang === 'hi' ? 'Hindi (हिन्दी)' : 'English'}**
- Subscription: **${contextInfo.isSubscribed ? 'Active Pass Holder' : 'Free Tier'}**
- Tests Completed: **${contextInfo.totalTestsCompleted ?? 0}** | Questions Attempted: **${contextInfo.questionsAttempted ?? 0}** | Overall Accuracy: **${contextInfo.overallAccuracy ?? 0}%** | Study Streak: **${contextInfo.streak ?? 0} days** | Time Spent: **${contextInfo.timeSpentMins ?? 0} mins**
- Weak Topics (<55%): ${weakTopicsText}
- Strong Topics (>=55%): ${strongTopicsText}
- Recent Tests:
${recentTestsText}
- In-Progress (Unfinished) Tests:
${activeTestsText}

### Matching Papers Found in Built-in Catalog for User's Request:
${catalogSnippet}

### Follow-Up Question Rule (IMPORTANT):
- If the user's request is **vague or missing key context** (for example: *"give me a test"*, *"create a test"*, *"help me practice"*, *"what should I study?"* without specifying topic, test type, or difficulty), ask **only 1 or 2 short, friendly clarifying questions** (NEVER ask more than 2 questions at once!).
- Whenever you ask a clarifying follow-up, also emit a \`QUICK_REPLIES\` action with 2–4 short clickable options in the user's preferred language so they can answer in one tap!
- If the user ALREADY gave enough context (e.g., *"give me a test on NEP 2020"* or *"create an AI test on Quantum Physics"* or *"how am I doing?"*), act immediately without unnecessary questions!

### Strict Study & Exam Relevance Guardrail (CRITICAL):
- You ONLY create, suggest, or conduct tests on **academic, syllabus, general studies, or competitive exam-relevant topics** (such as School Leadership, CCS/GFR/FR-SR Rules, RTE/NEP/NCF/POCSO, Pedagogy, Reasoning, Hindi, English, Maths, Science, History, Geography, Polity, Economics, Computer Literacy, or Current Affairs).
- If the user asks you to create or give a test on **non-study, entertainment, social media, gaming, or irrelevant topics** (for example: *Instagram, TikTok, Snapchat, Bollywood/celebrity gossip, video games like PUBG/GTA, memes, dating, cooking recipes, etc.*):
  - **Politely REFUSE** to create or suggest that test (in the user's preferred language).
  - **DO NOT emit** \`CREATE_AI_TEST\`, \`SUGGEST_TEST\`, or \`START_DRILL\` for that topic!
  - Gently remind them that you are an exam & study mentor, and offer 2–3 relevant study/exam topic alternatives using \`QUICK_REPLIES\` (e.g., NEP 2020, Indian Polity, GFR 2017).

### Action Protocol (CRITICAL):
Whenever appropriate, emit \`[[ACTION:...]]\` blocks on new lines at the end of your reply using STRICT valid JSON:

1. Suggest an existing test from the Matching Papers list above (use EXACT \`testId\` and \`filename\`):
[[ACTION:{"type":"SUGGEST_TEST","title":"Exact Title","testId":"exact-testId","filename":"exact-filename","questions":20,"duration":20}]]

2. Create an AI test (USE THIS whenever the user asks to create/generate an AI test OR asks for a test on a topic that has NO matching papers in the catalog above!):
[[ACTION:{"type":"CREATE_AI_TEST","topic":"Clean Topic Name","questionCount":10,"difficulty":"medium"}]]

3. Launch a quick 10-question drill on an existing syllabus topic:
[[ACTION:{"type":"START_DRILL","topic":"Topic Name"}]]

4. Open a page on the website:
[[ACTION:{"type":"NAVIGATE","route":"/test-list","label":"Open Mock Tests"}]]

5. Switch active exam (\`upsc\`, \`uppsc\`, \`tgt\`, or \`pgt\`):
[[ACTION:{"type":"SWITCH_EXAM","examMode":"upsc","label":"Switch to UPSC Principal"}]]

6. Switch app UI & test language (\`en\` or \`hi\`):
[[ACTION:{"type":"SWITCH_LANGUAGE","lang":"hi"}]]

7. Start the interactive voice walkthrough tour:
[[ACTION:{"type":"START_WALKTHROUGH"}]]

8. Provide 2–4 quick-reply chips when asking a follow-up question:
[[ACTION:{"type":"QUICK_REPLIES","options":["Full CBT Mock","Weak Topic Drill","Custom AI Test"]}]]

### Language Rule (STRICT):
- ALWAYS reply in the user's preferred app language: **${contextInfo.lang === 'hi' ? 'Hindi (हिन्दी — Devanagari script with clear English exam terms where natural)' : 'English'}**, including all follow-up questions and quick-reply options (unless the user explicitly asks you to reply in the other language).
- Keep responses concise, warm, accurate, and actionable.`,
  };

  const recentHistory = conversationHistory.slice(-10);
  const response = await sendChatMessage([systemPrompt, ...recentHistory], 0.65);
  return parseVidyaActions(response.message);
}
