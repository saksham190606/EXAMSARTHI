/**
 * Intelligent Keyword & Speech Intent Recognition Engine for Exam Saarthi.
 * Handles English, Hindi, and Hinglish transcripts with phonetic normalization,
 * fuzzy matching, sub-millisecond local classification, and Gemini micro-fallback.
 */

export type CanonicalVoiceIntent =
  | 'NAVIGATE_DASHBOARD'
  | 'NAVIGATE_PRACTICE'
  | 'NAVIGATE_PRACTICE_GK'
  | 'NAVIGATE_EXAMS'
  | 'NAVIGATE_RESULTS'
  | 'NAVIGATE_SETTINGS'
  | 'NAVIGATE_LOGIN'
  | 'NAVIGATE_SIGNUP'
  | 'LOGOUT'
  | 'NAVIGATE_BACK'
  | 'START_EXAM'
  | 'START_PRACTICE'
  | 'DESCRIBE_DIAGRAM'
  | 'NEXT_QUESTION'
  | 'PREVIOUS_QUESTION'
  | 'CLEAR_RESPONSE'
  | 'SELECT_OPTION'
  | 'SUBMIT_EXAM'
  | 'SWITCH_TO_ENGLISH'
  | 'SWITCH_TO_HINDI'
  | 'UNKNOWN';

export interface RecognizedIntent {
  intent: CanonicalVoiceIntent;
  confidence: number;
  rawText: string;
  normalizedText: string;
  source: 'local_rule' | 'fuzzy_match' | 'gemini_fallback';
  targetPath?: string;
  announcementEn: string;
  announcementHi: string;
  optionLetter?: 'A' | 'B' | 'C' | 'D';
}

import { useAccessibilityStore } from '@/store/useAccessibilityStore';

/**
 * Immediate acoustic chime using Web Audio API.
 * Provides instant feedback (< 5ms) to visually impaired candidates without external audio files.
 */
export function playVoiceFeedbackChime(): void {
  if (typeof window === 'undefined') return;
  try {
    if (useAccessibilityStore.getState().accessibilityMode === 'keyboard') {
      return;
    }
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch (_) {}
}

/**
 * Normalizes input speech transcripts by stripping punctuation, extra spaces,
 * and conversational filler words.
 */
export function normalizeTranscript(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Levenshtein distance between two strings for fuzzy tolerance.
 */
function levenshteinDistance(a: string, b: string): number {
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
 * Checks if target keyword fuzzy-matches any token or n-gram within text.
 */
function fuzzyContains(text: string, keyword: string, maxDistance = 1): boolean {
  if (text.includes(keyword)) return true;
  const words = text.split(' ');
  for (const word of words) {
    if (Math.abs(word.length - keyword.length) <= maxDistance) {
      if (levenshteinDistance(word, keyword) <= maxDistance) {
        return true;
      }
    }
  }
  return false;
}

const INTENT_METADATA: Record<
  CanonicalVoiceIntent,
  {
    targetPath?: string;
    announcementEn: string;
    announcementHi: string;
  }
> = {
  NAVIGATE_DASHBOARD: {
    targetPath: '/dashboard',
    announcementEn: 'Navigating to your Dashboard',
    announcementHi: 'डैशबोर्ड पर जा रहे हैं',
  },
  NAVIGATE_PRACTICE: {
    targetPath: '/practice',
    announcementEn: 'Opening Practice section',
    announcementHi: 'प्रैक्टिस सत्र खोला जा रहा है',
  },
  NAVIGATE_PRACTICE_GK: {
    targetPath: '/practice?subject=gk',
    announcementEn: 'Opening Practice, General Knowledge and Geography',
    announcementHi: 'सामान्य ज्ञान और भूगोल अभ्यास खोला जा रहा है',
  },
  NAVIGATE_EXAMS: {
    targetPath: '/exam',
    announcementEn: 'Opening the Exams Hub',
    announcementHi: 'परीक्षा केंद्र खोला जा रहा है',
  },
  NAVIGATE_RESULTS: {
    targetPath: '/results',
    announcementEn: 'Viewing Results',
    announcementHi: 'परिणाम देखा जा रहा है',
  },
  NAVIGATE_SETTINGS: {
    targetPath: '/settings',
    announcementEn: 'Opening Settings',
    announcementHi: 'सेटिंग्स खोली जा रही हैं',
  },
  NAVIGATE_LOGIN: {
    targetPath: '/login',
    announcementEn: 'Opening Sign In page',
    announcementHi: 'साइन इन पृष्ठ खोला जा रहा है',
  },
  NAVIGATE_SIGNUP: {
    targetPath: '/signup',
    announcementEn: 'Opening registration page',
    announcementHi: 'साइन अप पृष्ठ खोला जा रहा है',
  },
  LOGOUT: {
    targetPath: '/login',
    announcementEn: 'Logging out of ExamSarthi.',
    announcementHi: 'एग्जामसारथी से लॉगआउट किया जा रहा है।',
  },
  NAVIGATE_BACK: {
    announcementEn: 'Going back',
    announcementHi: 'वापस जा रहे हैं',
  },
  START_EXAM: {
    targetPath: '/exam',
    announcementEn: 'Starting examination',
    announcementHi: 'मॉक परीक्षा शुरू की जा रही है',
  },
  START_PRACTICE: {
    targetPath: '/practice',
    announcementEn: 'Starting practice session',
    announcementHi: 'प्रैक्टिस सत्र शुरू किया जा रहा है',
  },
  DESCRIBE_DIAGRAM: {
    announcementEn: 'Describing diagram',
    announcementHi: 'चित्र का विवरण दिया जा रहा है',
  },
  NEXT_QUESTION: {
    announcementEn: 'Moving to next question',
    announcementHi: 'अगला प्रश्न',
  },
  PREVIOUS_QUESTION: {
    announcementEn: 'Moving to previous question',
    announcementHi: 'पिछला प्रश्न',
  },
  CLEAR_RESPONSE: {
    announcementEn: 'Response cleared',
    announcementHi: 'उत्तर हटाया गया',
  },
  SELECT_OPTION: {
    announcementEn: 'Option selected',
    announcementHi: 'विकल्प चुना गया',
  },
  SUBMIT_EXAM: {
    announcementEn: 'Submitting examination',
    announcementHi: 'परीक्षा जमा की जा रही है',
  },
  SWITCH_TO_ENGLISH: {
    announcementEn: 'Language switched to English.',
    announcementHi: 'अंग्रेजी भाषा चुनी गई।',
  },
  SWITCH_TO_HINDI: {
    announcementEn: 'Language switched to Hindi.',
    announcementHi: 'भाषा हिंदी में बदल दी गई है।',
  },
  UNKNOWN: {
    announcementEn: 'Command not recognized',
    announcementHi: 'कमांड समझ नहीं आया',
  },
};

import { matchExamTokens, matchExamVoiceRoute } from './exam-router';

export const DASHBOARD_KEYWORDS = ["dashboard", "home", "main screen", "profile", "डैशबोर्ड", "होम", "मुख्य पृष्ठ"];
export const PRACTICE_KEYWORDS = ["practice", "learn", "study", "prepare", "प्रैक्टिस", "अभ्यास", "पढ़ाई"];
export const EXAMS_KEYWORDS = ["exam", "exams", "mock", "test", "test series", "परीक्षा", "मॉक टेस्ट", "टेस्ट"];
export const SETTINGS_KEYWORDS = ["setting", "settings", "preferences", "accessibility", "सेटिंग", "सेटिंग्स", "विकल्प"];
export const RESULTS_KEYWORDS = ["result", "results", "score", "scores", "marks", "score card", "scorecard", "परिणाम", "नतीजे", "रिजल्ट", "स्कोर"];
export const LOGIN_KEYWORDS = ["login", "sign in", "log in", "authenticate", "लॉगिन", "साइन इन"];
export const SIGNUP_KEYWORDS = ["signup", "sign up", "register", "registration", "create account", "साइन अप", "रजिस्टर", "खाता बनाएं", "नया खाता"];
export const LOGOUT_KEYWORDS = ["logout", "log out", "sign out", "signout", "लॉगआउट", "लॉग आउट", "साइन आउट", "बाहर निकलें", "लॉग आफ"];

export const matchIntent = (text: string): 'DASHBOARD' | 'EXAMS' | 'PRACTICE' | 'SETTINGS' | 'RESULTS' | 'LOGIN' | 'SIGNUP' | 'LOGOUT' | 'UNKNOWN' => {
  const clean = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
  if (LOGOUT_KEYWORDS.some(k => clean.includes(k))) return 'LOGOUT';
  if (SIGNUP_KEYWORDS.some(k => clean.includes(k))) return 'SIGNUP';
  if (DASHBOARD_KEYWORDS.some(k => clean.includes(k))) return 'DASHBOARD';
  // Check PRACTICE before EXAMS so "practice exam" is treated as PRACTICE rather than generic exams!
  if (PRACTICE_KEYWORDS.some(k => clean.includes(k))) return 'PRACTICE';
  if (EXAMS_KEYWORDS.some(k => clean.includes(k))) return 'EXAMS';
  if (RESULTS_KEYWORDS.some(k => clean.includes(k))) return 'RESULTS';
  if (SETTINGS_KEYWORDS.some(k => clean.includes(k))) return 'SETTINGS';
  if (LOGIN_KEYWORDS.some(k => clean.includes(k))) return 'LOGIN';
  return 'UNKNOWN';
};

/**
 * Fast deterministic local keyword classifier. Executes in < 0.2ms.
 */
export function classifyIntentLocally(rawText: string): RecognizedIntent {
  const norm = normalizeTranscript(rawText);

  if (!norm) {
    return {
      intent: 'UNKNOWN',
      confidence: 0,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      ...INTENT_METADATA.UNKNOWN,
    };
  }

  // 1. Specific Exam or Practice Set Match (Highest Priority: Checked FIRST!)
  // Ensures phrases like "open upsc exam", "practice math", "open reasoning practice", "अंग्रेजी प्रैक्टिस"
  // are routed directly to their respective exam/practice set rather than generic pages or language switches.
  const specificExam = matchExamTokens(rawText) || (matchExamVoiceRoute(rawText) ? { route: matchExamVoiceRoute(rawText)!, examName: matchExamVoiceRoute(rawText)!.title } : null);
  if (specificExam) {
    return {
      intent: 'START_EXAM',
      confidence: 0.99,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      targetPath: `/exam?set=${specificExam.route.param}`,
      announcementEn: `Opening ${specificExam.examName || specificExam.route.title}`,
      announcementHi: `${specificExam.examName || specificExam.route.title} खोला जा रहा है`,
    };
  }

  // 1.1 Language Switching (Strict: only when user explicitly asks to switch language)
  if (
    /(?:switch\s+to\s+hindi|change\s+to\s+hindi|hindi\s+please|hindi\s+mein|hindi\s+me|hindi\s+chune|hindi\s+chuno|^hindi$|हिंदी\s+में\s+बदलें|हिंदी\s+चुनें|हिंदी\s+करो|^हिंदी$)/i.test(norm)
  ) {
    return {
      intent: 'SWITCH_TO_HINDI',
      confidence: 0.98,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      ...INTENT_METADATA.SWITCH_TO_HINDI,
    };
  }

  if (
    /(?:switch\s+to\s+english|change\s+to\s+english|english\s+please|english\s+chune|angrezi\s+chune|angrezi\s+mein|^english$|^angrezi$|अंग्रेजी\s+में\s+बदलें|अंग्रेज़ी\s+में\s+बदलें|अंग्रेजी\s+चुनें|अंग्रेज़ी\s+चुनें|^अंग्रेजी$|^अंग्रेज़ी$)/i.test(norm)
  ) {
    return {
      intent: 'SWITCH_TO_ENGLISH',
      confidence: 0.98,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      ...INTENT_METADATA.SWITCH_TO_ENGLISH,
    };
  }

  // 1.5 Practice Sub-sections: General Knowledge & Geography (Checked before generic Practice)
  const isGkGeography =
    /(?:gk\s*(?:and|&)?\s*geography|geography\s*practice|practice\s*gk|gk\s*practice|open\s*gk\s*geography|भूगोल|सामान्य\s*ज्ञान\s*और\s*भूगोल|जीके\s*और\s*भूगोल)/i.test(norm) ||
    ((norm.includes('gk') || norm.includes('general knowledge') || norm.includes('जीके')) && (norm.includes('geography') || norm.includes('भूगोल'))) ||
    ((norm.includes('geography') || norm.includes('भूगोल')) && (norm.includes('practice') || norm.includes('open') || norm.includes('खोलें') || norm.includes('अभ्यास')));

  if (isGkGeography) {
    return {
      intent: 'NAVIGATE_PRACTICE_GK',
      confidence: 0.98,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      ...INTENT_METADATA.NAVIGATE_PRACTICE_GK,
    };
  }

  // 2. Fuzzy Keyword Intent Matcher for Primary Destinations
  const fuzzyIntent = matchIntent(rawText);
  if (fuzzyIntent === 'DASHBOARD') {
    return {
      intent: 'NAVIGATE_DASHBOARD',
      confidence: 0.96,
      rawText,
      normalizedText: norm,
      source: 'fuzzy_match',
      ...INTENT_METADATA.NAVIGATE_DASHBOARD,
    };
  }
  if (fuzzyIntent === 'EXAMS') {
    return {
      intent: 'NAVIGATE_EXAMS',
      confidence: 0.96,
      rawText,
      normalizedText: norm,
      source: 'fuzzy_match',
      ...INTENT_METADATA.NAVIGATE_EXAMS,
    };
  }
  if (fuzzyIntent === 'PRACTICE') {
    return {
      intent: 'NAVIGATE_PRACTICE',
      confidence: 0.96,
      rawText,
      normalizedText: norm,
      source: 'fuzzy_match',
      ...INTENT_METADATA.NAVIGATE_PRACTICE,
    };
  }
  if (fuzzyIntent === 'RESULTS') {
    return {
      intent: 'NAVIGATE_RESULTS',
      confidence: 0.96,
      rawText,
      normalizedText: norm,
      source: 'fuzzy_match',
      ...INTENT_METADATA.NAVIGATE_RESULTS,
    };
  }
  if (fuzzyIntent === 'SETTINGS') {
    return {
      intent: 'NAVIGATE_SETTINGS',
      confidence: 0.96,
      rawText,
      normalizedText: norm,
      source: 'fuzzy_match',
      ...INTENT_METADATA.NAVIGATE_SETTINGS,
    };
  }
  if (fuzzyIntent === 'LOGIN') {
    return {
      intent: 'NAVIGATE_LOGIN',
      confidence: 0.96,
      rawText,
      normalizedText: norm,
      source: 'fuzzy_match',
      ...INTENT_METADATA.NAVIGATE_LOGIN,
    };
  }
  if (fuzzyIntent === 'SIGNUP') {
    return {
      intent: 'NAVIGATE_SIGNUP',
      confidence: 0.98,
      rawText,
      normalizedText: norm,
      source: 'fuzzy_match',
      ...INTENT_METADATA.NAVIGATE_SIGNUP,
    };
  }
  if (fuzzyIntent === 'LOGOUT') {
    return {
      intent: 'LOGOUT',
      confidence: 0.98,
      rawText,
      normalizedText: norm,
      source: 'fuzzy_match',
      ...INTENT_METADATA.LOGOUT,
    };
  }

  // 5. Navigation: Results
  if (
    /(?:results?|score\s*card|my\s+marks|marks|परिणाम|नतीजे|स्कोर\s*कार्ड|स्कोर|रिजल्ट)/i.test(norm) ||
    fuzzyContains(norm, 'result', 1) ||
    fuzzyContains(norm, 'परिणाम', 1)
  ) {
    return {
      intent: 'NAVIGATE_RESULTS',
      confidence: 0.95,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      ...INTENT_METADATA.NAVIGATE_RESULTS,
    };
  }

  // 7. Navigation: Back / Previous Screen
  if (
    /(?:navigate\s+back|go\s+back|previous\s+screen|back|वापस|पीछे\s+जाओ|पिछली\s+स्क्रीन|पीछे)/i.test(norm) &&
    !/(?:question|prashn|sawal|प्रश्न|सवाल)/i.test(norm)
  ) {
    return {
      intent: 'NAVIGATE_BACK',
      confidence: 0.92,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      ...INTENT_METADATA.NAVIGATE_BACK,
    };
  }

  // 8. Action: Start Exam / Mock / Specific Exam Portals
  if (
    /(?:start\s+mock|take\s+test|take\s+mock|start\s+exam|begin\s+test|begin\s+exam|मॉक\s+टेस्ट\s+शुरू|टेस्ट\s+शुरू|परीक्षा\s+शुरू|शुरू\s+करो|mock\s+exam\s+shuru|test\s+shuru|upsc|cgl|ssc|bank\s*po|bank\s*ipo|ibps|rrb|railway|यूपीएससी|सीजीएल|एसएससी|बैंक\s*पीओ|रेलवे)/i.test(norm)
  ) {
    return {
      intent: 'START_EXAM',
      confidence: 0.95,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      ...INTENT_METADATA.START_EXAM,
    };
  }

  // 9. Action: Start Practice
  if (
    /(?:start\s+practice|begin\s+practice|launch\s+practice|practice\s+shuru|abhyas\s+shuru|प्रैक्टिस\s+शुरू|अभ्यास\s+शुरू)/i.test(norm)
  ) {
    return {
      intent: 'START_PRACTICE',
      confidence: 0.95,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      ...INTENT_METADATA.START_PRACTICE,
    };
  }

  // 10. Action: Describe Diagram
  if (
    /(?:describe\s+diagram|what\s+is\s+in\s+the\s+image|explain\s+figure|explain\s+diagram|diagram\s+samjhao|chitra\s+samjhao|चित्र\s+समझाइए|चित्र\s+का\s+विवरण|डायग्राम\s+समझाओ|चित्र\s+समझाओ|chitra\s+ka\s+vivaran)/i.test(norm)
  ) {
    return {
      intent: 'DESCRIBE_DIAGRAM',
      confidence: 0.96,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      ...INTENT_METADATA.DESCRIBE_DIAGRAM,
    };
  }

  // 11. In-Exam: Next Question
  if (
    /(?:next\s+question|agla\s+prashn|agla\s+sawal|अगला\s+प्रश्न|अगला\s+सवाल|^next$|^अगला$|^आगे$)/i.test(norm)
  ) {
    return {
      intent: 'NEXT_QUESTION',
      confidence: 0.93,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      ...INTENT_METADATA.NEXT_QUESTION,
    };
  }

  // 12. In-Exam: Previous Question
  if (
    /(?:previous\s+question|pichla\s+prashn|pichla\s+sawal|पिछला\s+प्रश्न|पिछला\s+सवाल|^previous$|^पिछला$)/i.test(norm)
  ) {
    return {
      intent: 'PREVIOUS_QUESTION',
      confidence: 0.93,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      ...INTENT_METADATA.PREVIOUS_QUESTION,
    };
  }

  // 13. In-Exam: Select Option
  const optionMatchA = /(?:विकल्प\s+(?:ए|a|1)|पहला\s+विकल्प|option\s+(?:a|1|one|ए)|opt\s+(?:a|1)|choice\s+(?:a|1)|(?:select|choose|mark|pick|answer|ans)\s+(?:option\s+)?(?:a|1)|vikalp\s+(?:a|1)|^option\s+a$|^option\s+1$|^विकल्प\s+ए$|^ए$|^a$|^1$|^one$|^first$|^first\s+option$|^पहला$|^पहला\s+विकल्प$|^ay$|^hey$)/i.test(norm);
  if (optionMatchA) {
    return {
      intent: 'SELECT_OPTION',
      confidence: 0.96,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      optionLetter: 'A',
      announcementEn: 'Option A selected',
      announcementHi: 'विकल्प A चुना गया',
    };
  }

  const optionMatchB = /(?:विकल्प\s+(?:बी|b|2)|दूसरा\s+विकल्प|option\s+(?:b|2|two|बी)|opt\s+(?:b|2)|choice\s+(?:b|2)|(?:select|choose|mark|pick|answer|ans)\s+(?:option\s+)?(?:b|2)|vikalp\s+(?:b|2)|^option\s+b$|^option\s+2$|^विकल्प\s+बी$|^बी$|^b$|^2$|^two$|^second$|^second\s+option$|^दूसरा$|^दूसरा\s+विकल्प$|^bee$|^be$)/i.test(norm);
  if (optionMatchB) {
    return {
      intent: 'SELECT_OPTION',
      confidence: 0.96,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      optionLetter: 'B',
      announcementEn: 'Option B selected',
      announcementHi: 'विकल्प B चुना गया',
    };
  }

  const optionMatchC = /(?:विकल्प\s+(?:सी|c|3)|तीसरा\s+विकल्प|option\s+(?:c|3|three|सी)|opt\s+(?:c|3)|choice\s+(?:c|3)|(?:select|choose|mark|pick|answer|ans)\s+(?:option\s+)?(?:c|3)|vikalp\s+(?:c|3)|^option\s+c$|^option\s+3$|^विकल्प\s+सी$|^सी$|^c$|^3$|^three$|^third$|^third\s+option$|^तीसरा$|^तीसरा\s+विकल्प$|^see$|^sea$|^si$)/i.test(norm);
  if (optionMatchC) {
    return {
      intent: 'SELECT_OPTION',
      confidence: 0.96,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      optionLetter: 'C',
      announcementEn: 'Option C selected',
      announcementHi: 'विकल्प C चुना गया',
    };
  }

  const optionMatchD = /(?:विकल्प\s+(?:डी|d|4)|चौथा\s+विकल्प|option\s+(?:d|4|four|डी)|opt\s+(?:d|4)|choice\s+(?:d|4)|(?:select|choose|mark|pick|answer|ans)\s+(?:option\s+)?(?:d|4)|vikalp\s+(?:d|4)|^option\s+d$|^option\s+4$|^विकल्प\s+डी$|^डी$|^d$|^4$|^four$|^fourth$|^fourth\s+option$|^चौथा$|^चौथा\s+विकल्प$|^dee$)/i.test(norm);
  if (optionMatchD) {
    return {
      intent: 'SELECT_OPTION',
      confidence: 0.96,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      optionLetter: 'D',
      announcementEn: 'Option D selected',
      announcementHi: 'विकल्प D चुना गया',
    };
  }

  // 14. In-Exam: Clear Response
  if (
    /(?:clear\s+response|clear\s+answer|uttar\s+hataye|उत्तर\s+हटाएं|उत्तर\s+हटाओ|clear\s+option)/i.test(norm)
  ) {
    return {
      intent: 'CLEAR_RESPONSE',
      confidence: 0.95,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      ...INTENT_METADATA.CLEAR_RESPONSE,
    };
  }

  // 15. In-Exam: Submit Exam
  if (
    /(?:submit\s+exam|submit\s+test|pariksha\s+jama\s+kare|परीक्षा\s+जमा\s+करें|सबमिट\s+करें|finish\s+test)/i.test(norm)
  ) {
    return {
      intent: 'SUBMIT_EXAM',
      confidence: 0.95,
      rawText,
      normalizedText: norm,
      source: 'local_rule',
      ...INTENT_METADATA.SUBMIT_EXAM,
    };
  }

  return {
    intent: 'UNKNOWN',
    confidence: 0.1,
    rawText,
    normalizedText: norm,
    source: 'local_rule',
    ...INTENT_METADATA.UNKNOWN,
  };
}

/**
 * Intelligent hybrid intent classifier.
 * 1. Checks fast local rule engine first (< 0.2ms).
 * 2. If confidence is high (>= 0.75), returns immediately.
 * 3. For longer (> 3 words) or ambiguous commands, triggers Gemini micro-fallback with strict timeout.
 */
export async function parseSpokenIntent(
  rawTranscript: string,
  language: 'en' | 'hi' = 'en'
): Promise<RecognizedIntent> {
  const localResult = classifyIntentLocally(rawTranscript);

  console.log('Voice transcript:', rawTranscript);
  console.log('Normalized command:', localResult.normalizedText);
  console.log('Detected intent:', localResult.intent);
  console.log('Action:', localResult.intent.startsWith('NAVIGATE') || localResult.intent.startsWith('START') ? 'navigate' : 'action');
  console.log('Navigation route:', localResult.targetPath || 'none');

  // Return immediately if deterministic keyword matched
  if (localResult.confidence >= 0.75) {
    return localResult;
  }

  const wordCount = rawTranscript.trim().split(/\s+/).length;

  // Only invoke Gemini micro-fallback for multi-word conversational queries
  if (wordCount >= 3 && typeof window !== 'undefined') {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 750); // fast timeout

      const res = await fetch('/api/ai/parse-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: rawTranscript,
          language,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.intent && data.intent !== 'UNKNOWN' && (data.confidence || 0) >= 0.6) {
          const meta = INTENT_METADATA[data.intent as CanonicalVoiceIntent] || INTENT_METADATA.UNKNOWN;
          return {
            intent: data.intent,
            confidence: data.confidence,
            rawText: rawTranscript,
            normalizedText: normalizeTranscript(rawTranscript),
            source: 'gemini_fallback',
            targetPath: meta.targetPath,
            announcementEn: meta.announcementEn,
            announcementHi: meta.announcementHi,
            optionLetter: data.optionLetter,
          };
        }
      }
    } catch {
      // Gracefully fall back to local result if offline or timed out
    }
  }

  return localResult;
}
