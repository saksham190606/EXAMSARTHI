/**
 * Exam Saarthi - Intelligent Exam Intent & Keyword Recognition Engine
 * Handles bilingual (English, Hindi, Hinglish) fuzzy keyword matching for active exam sessions.
 */

export type ExamIntentType =
  | 'SELECT_OPTION_A'
  | 'SELECT_OPTION_B'
  | 'SELECT_OPTION_C'
  | 'SELECT_OPTION_D'
  | 'NEXT_QUESTION'
  | 'PREVIOUS_QUESTION'
  | 'CLEAR_SELECTION'
  | 'MARK_FOR_REVIEW'
  | 'READ_AGAIN'
  | 'DESCRIBE_DIAGRAM'
  | 'SUBMIT_EXAM'
  | 'CONFIRM_SUBMIT'
  | 'CANCEL_SUBMIT'
  | 'UNKNOWN';

export interface ExamIntentMatch {
  type: ExamIntentType;
  confidence: number;
  matchedKeyword?: string;
  optionIndex?: number; // 0 for A, 1 for B, 2 for C, 3 for D
  audioConfirmationEn: string;
  audioConfirmationHi: string;
}

export interface KeywordDefinition {
  type: ExamIntentType;
  keywords: string[];
  optionIndex?: number;
  audioConfirmationEn: string;
  audioConfirmationHi: string;
}

export const EXAM_KEYWORD_MAPS: KeywordDefinition[] = [
  {
    type: 'SELECT_OPTION_A',
    keywords: [
      "1", "a", "option a", "one", "first", "option 1", "opt a", "opt 1", "choice a", "choice 1",
      "select a", "select option a", "select 1", "select option 1",
      "choose a", "choose option a", "choose 1", "choose option 1",
      "mark a", "mark option a", "mark 1", "mark option 1",
      "answer a", "answer is a", "ans a", "answer 1", "first option", "vikalp a", "vikalp 1",
      "pehla option", "ay", "hey", "ए", "विकल्प ए", "पहला", "ऑप्शन ए", "एक", "option ek", "पहला विकल्प", "ऑप्शन 1"
    ],
    optionIndex: 0,
    audioConfirmationEn: "Option A selected",
    audioConfirmationHi: "विकल्प ए चुना गया",
  },
  {
    type: 'SELECT_OPTION_B',
    keywords: [
      "2", "b", "option b", "two", "second", "option 2", "opt b", "opt 2", "choice b", "choice 2",
      "select b", "select option b", "select 2", "select option 2",
      "choose b", "choose option b", "choose 2", "choose option 2",
      "mark b", "mark option b", "mark 2", "mark option 2",
      "answer b", "answer is b", "ans b", "answer 2", "second option", "vikalp b", "vikalp 2",
      "doosra option", "bee", "be", "बी", "विकल्प बी", "दूसरा", "ऑप्शन बी", "दो", "option do", "दूसरा विकल्प", "ऑप्शन 2"
    ],
    optionIndex: 1,
    audioConfirmationEn: "Option B selected",
    audioConfirmationHi: "विकल्प बी चुना गया",
  },
  {
    type: 'SELECT_OPTION_C',
    keywords: [
      "3", "c", "option c", "three", "third", "option 3", "opt c", "opt 3", "choice c", "choice 3",
      "select c", "select option c", "select 3", "select option 3",
      "choose c", "choose option c", "choose 3", "choose option 3",
      "mark c", "mark option c", "mark 3", "mark option 3",
      "answer c", "answer is c", "ans c", "answer 3", "third option", "vikalp c", "vikalp 3",
      "teesra option", "see", "sea", "si", "सी", "विकल्प सी", "तीसरा", "ऑप्शन सी", "तीन", "option teen", "तीसरा विकल्प", "ऑप्शन 3"
    ],
    optionIndex: 2,
    audioConfirmationEn: "Option C selected",
    audioConfirmationHi: "विकल्प सी चुना गया",
  },
  {
    type: 'SELECT_OPTION_D',
    keywords: [
      "4", "d", "option d", "four", "fourth", "option 4", "opt d", "opt 4", "choice d", "choice 4",
      "select d", "select option d", "select 4", "select option 4",
      "choose d", "choose option d", "choose 4", "choose option 4",
      "mark d", "mark option d", "mark 4", "mark option 4",
      "answer d", "answer is d", "ans d", "answer 4", "fourth option", "vikalp d", "vikalp 4",
      "chautha option", "dee", "डी", "विकल्प डी", "चौथा", "ऑप्शन डी", "चार", "option char", "चौथा विकल्प", "ऑप्शन 4"
    ],
    optionIndex: 3,
    audioConfirmationEn: "Option D selected",
    audioConfirmationHi: "विकल्प डी चुना गया",
  },
  {
    type: 'NEXT_QUESTION',
    keywords: ["next", "next question", "forward", "agla", "अगला", "अगला प्रश्न", "आगे बढ़ो", "aage", "aage badho", "अगला सवाल"],
    audioConfirmationEn: "Next question",
    audioConfirmationHi: "अगला प्रश्न",
  },
  {
    type: 'PREVIOUS_QUESTION',
    keywords: ["previous", "back", "previous question", "pichla", "पिछला", "पीछे", "पिछला प्रश्न", "wapas", "piche", "पिछला सवाल"],
    audioConfirmationEn: "Previous question",
    audioConfirmationHi: "पिछला प्रश्न",
  },
  {
    type: 'CLEAR_SELECTION',
    keywords: ["clear", "clear response", "unselect", "remove", "हटाओ", "खाली करो", "साफ करो", "uttar hatao", "saaf karo"],
    audioConfirmationEn: "Response cleared",
    audioConfirmationHi: "उत्तर हटाया गया",
  },
  {
    type: 'MARK_FOR_REVIEW',
    keywords: ["flag for review", "flagfor review", "flagfor", "flag", "mark for review", "review", "रिव्यू", "चिह्नित करो", "बाद में देखेंगे", "flag question", "flag this", "चिन्हित करो"],
    audioConfirmationEn: "Marked for review",
    audioConfirmationHi: "समीक्षा के लिए चिह्नित किया गया",
  },
  {
    type: 'READ_AGAIN',
    keywords: ["repeat", "read again", "read question", "dobara padho", "फिर से पढ़ो", "दोबारा बोलो", "repeat question", "सवाल पढ़ो", "प्रश्न पढ़ो", "read"],
    audioConfirmationEn: "Reading current question",
    audioConfirmationHi: "वर्तमान प्रश्न पढ़ रहे हैं",
  },
  {
    type: 'DESCRIBE_DIAGRAM',
    keywords: ["describe diagram", "explain image", "diagram", "chitra samjhao", "चित्र समझाइए", "फोटो समझाओ", "describe image", "chitra ka vivaran", "चित्र का विवरण"],
    audioConfirmationEn: "Analyzing diagram",
    audioConfirmationHi: "चित्र का विवरण दिया जा रहा है",
  },
  {
    type: 'CONFIRM_SUBMIT',
    keywords: ["confirm submit", "yes submit", "हां सबमिट करो", "हाँ सबमिट करो", "confirm", "सबमिट करो हां", "submit yes"],
    audioConfirmationEn: "Exam submitted",
    audioConfirmationHi: "परीक्षा सबमिट कर दी गई है",
  },
  {
    type: 'CANCEL_SUBMIT',
    keywords: ["cancel submit", "cancel", "no", "रद्द करो", "नहीं", "don't submit", "nhi"],
    audioConfirmationEn: "Submission cancelled",
    audioConfirmationHi: "कार्रवाई रद्द की गई",
  },
  {
    type: 'SUBMIT_EXAM',
    keywords: ["submit exam", "finish test", "end test", "सबमिट करो", "परीक्षा समाप्त", "टेस्ट खत्म", "submit", "exam khatam", "pariksha samapt"],
    audioConfirmationEn: "Are you sure you want to submit the exam? Say 'confirm submit' to confirm.",
    audioConfirmationHi: "क्या आप परीक्षा जमा करना चाहते हैं? पुष्टि के लिए 'हां सबमिट करो' कहें।",
  },
];

/**
 * Clean transcripts by trimming whitespace, lowercasing, and stripping trailing periods/punctuation.
 */
export function cleanTranscript(raw: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/[.。]+$/, '') // strip trailing periods / devanagari danda
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Levenshtein distance between two strings for typo/phonetic tolerance.
 */
export function calculateLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Checks if target keyword matches the cleaned transcript, either exactly,
 * via substring/token boundaries, or through fuzzy edit distance.
 */
function matchesKeyword(transcript: string, keyword: string): boolean {
  const normKw = keyword.toLowerCase().trim();
  if (transcript === normKw) return true;

  // Single letter/number keywords require exact match to prevent collision (e.g. 'b' vs 'a')
  if (/^[a-d1-4]$/i.test(normKw)) {
    const tokens = transcript.split(/\s+/);
    return tokens.includes(normKw);
  }

  // Word boundary regex check for exact phrase
  const escapedKw = normKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const boundaryRegex = new RegExp(`(^|\\s)${escapedKw}(\\s|$)`, 'i');
  if (boundaryRegex.test(transcript)) return true;

  // Single word keyword fuzzy check (disabled for single/short tokens and protected choice words to prevent false positives)
  const isProtectedChoiceWord = /^(pehla|doosra|teesra|chautha|पहला|दूसरा|तीसरा|चौथा|एक|दो|तीन|चार|ए|बी|सी|डी|one|two|three|four|ay|bee|see|dee)$/i;
  if (!normKw.includes(' ') && !transcript.includes(' ') && normKw.length > 2 && !isProtectedChoiceWord.test(normKw) && !isProtectedChoiceWord.test(transcript)) {
    const maxDist = normKw.length <= 4 ? 1 : 2;
    if (calculateLevenshtein(transcript, normKw) <= maxDist) {
      return true;
    }
  }

  // Multi-word phrase fuzzy tolerance (disabled for option phrases to prevent 'विकल्प बी' matching 'विकल्प ए' or 'option b' matching 'option a')
  const isOptionPhrase = /(?:option|opt|choice|select|choose|mark|pick|answer|ans|vikalp|विकल्प|ऑप्शन|पहला|दूसरा|तीसरा|चौथा)/i;
  if (normKw.includes(' ') && !isOptionPhrase.test(normKw) && !isOptionPhrase.test(transcript)) {
    const maxDist = 2;
    if (calculateLevenshtein(transcript, normKw) <= maxDist) {
      return true;
    }
  }

  return false;
}

/**
 * Matches a spoken transcript to canonical exam intents with fuzzy keyword mapping.
 * @param raw Spoken transcript from speech recognition
 * @param isPendingSubmitConfirmation Whether the two-step submit dialog is active
 */
export function matchExamIntent(
  raw: string,
  isPendingSubmitConfirmation = false
): ExamIntentMatch {
  const cleaned = cleanTranscript(raw);
  if (!cleaned) {
    return {
      type: 'UNKNOWN',
      confidence: 0,
      audioConfirmationEn: "Command not recognized. Say 'Next', 'Previous', or an option like 'Option A'.",
      audioConfirmationHi: "आदेश समझ नहीं आया। 'अगला', 'पिछला' या 'विकल्प ए' बोलें।",
    };
  }

  // If waiting for verbal confirmation on submit dialog, prioritize confirm/cancel
  if (isPendingSubmitConfirmation) {
    const confirmDef = EXAM_KEYWORD_MAPS.find((m) => m.type === 'CONFIRM_SUBMIT');
    if (confirmDef && confirmDef.keywords.some((kw) => matchesKeyword(cleaned, kw))) {
      return {
        type: 'CONFIRM_SUBMIT',
        confidence: 0.95,
        matchedKeyword: 'confirm submit',
        audioConfirmationEn: confirmDef.audioConfirmationEn,
        audioConfirmationHi: confirmDef.audioConfirmationHi,
      };
    }

    const cancelDef = EXAM_KEYWORD_MAPS.find((m) => m.type === 'CANCEL_SUBMIT');
    if (cancelDef && cancelDef.keywords.some((kw) => matchesKeyword(cleaned, kw))) {
      return {
        type: 'CANCEL_SUBMIT',
        confidence: 0.95,
        matchedKeyword: 'cancel submit',
        audioConfirmationEn: cancelDef.audioConfirmationEn,
        audioConfirmationHi: cancelDef.audioConfirmationHi,
      };
    }
  }

  // Iterate over all exam keyword maps in priority order
  for (const entry of EXAM_KEYWORD_MAPS) {
    // Skip confirm/cancel if not pending submit confirmation unless explicitly uttered
    if (
      (entry.type === 'CONFIRM_SUBMIT' || entry.type === 'CANCEL_SUBMIT') &&
      !isPendingSubmitConfirmation
    ) {
      continue;
    }

    for (const kw of entry.keywords) {
      if (matchesKeyword(cleaned, kw)) {
        return {
          type: entry.type,
          confidence: cleaned === kw.toLowerCase().trim() ? 1.0 : 0.88,
          matchedKeyword: kw,
          optionIndex: entry.optionIndex,
          audioConfirmationEn: entry.audioConfirmationEn,
          audioConfirmationHi: entry.audioConfirmationHi,
        };
      }
    }
  }

  return {
    type: 'UNKNOWN',
    confidence: 0,
    audioConfirmationEn: "Command not recognized. Say 'Next', 'Previous', or an option like 'Option A'.",
    audioConfirmationHi: "आदेश समझ नहीं आया। 'अगला', 'पिछला' या 'विकल्प ए' बोलें।",
  };
}
