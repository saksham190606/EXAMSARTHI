"use client";

/**
 * EXAMSARTHI — Resilient Phonetic & Grammar-Weighted Speech Recognition
 * 
 * Provides:
 * 1. JSGF SpeechGrammarList injection to bias speech recognition toward exam navigation commands.
 * 2. Multi-alternative recognition evaluation (checks event.results[i][j]).
 * 3. Levenshtein edit distance & phonetic homophone resolution for near-sounds ('necks' -> NEXT, 'paws' -> PAUSE).
 */

export type CanonicalAction =
  | 'SELECT_A'
  | 'SELECT_B'
  | 'SELECT_C'
  | 'SELECT_D'
  | 'SELECT_TRUE'
  | 'SELECT_FALSE'
  | 'NAVIGATE_NEXT'
  | 'NAVIGATE_PREVIOUS'
  | 'PAUSE_PLAYBACK'
  | 'RESUME_PLAYBACK'
  | 'REPEAT_QUESTION'
  | 'FLAG_REVIEW'
  | 'CLEAR_RESPONSE'
  | 'SUBMIT_EXAM';

export interface ResolvedVoiceCommand {
  action: CanonicalAction;
  matchedToken: string;
  confidence: number;
  rawTranscript: string;
}

// 1. Phonetic Homophones & Command Dictionary
const PHONETIC_MAP: Record<CanonicalAction, string[]> = {
  SELECT_A: [
    "a", "ay", "hey", "eight", "eh", "an", "at", "option a", "opt a", "choice a", "select a", "विकल्प ए", "पहला", "ए", "एक", "1", "one"
  ],
  SELECT_B: [
    "b", "be", "bee", "beat", "me", "option b", "opt b", "choice b", "select b", "विकल्प बी", "दूसरा", "बी", "दो", "2", "two"
  ],
  SELECT_C: [
    "c", "see", "sea", "si", "she", "option c", "opt c", "choice c", "select c", "विकल्प सी", "तीसरा", "सी", "तीन", "3", "three"
  ],
  SELECT_D: [
    "d", "dee", "the", "deal", "option d", "opt d", "choice d", "select d", "विकल्प डी", "चौथा", "डी", "चार", "4", "four"
  ],
  SELECT_TRUE: [
    "true", "through", "truth", "two", "to", "too", "yes", "sahi", "satya", "ट्रू", "सत्य", "सही", "हाँ", "हा", "haan"
  ],
  SELECT_FALSE: [
    "false", "falls", "fault", "folks", "no", "galat", "asatya", "फॉल्स", "गलत", "असत्य", "नहीं", "ना", "nahin"
  ],
  NAVIGATE_NEXT: [
    "next", "necks", "nest", "text", "agla", "अगला", "आगे", "next question", "skip", "aage"
  ],
  NAVIGATE_PREVIOUS: [
    "previous", "privious", "back", "pichla", "पिछला", "पीछे", "piche", "prev", "previous question"
  ],
  PAUSE_PLAYBACK: [
    "pause", "paws", "pass", "pose", "रुको", "पॉज़", "रुकिए", "wait", "hold", "stop speaking", "ruko"
  ],
  RESUME_PLAYBACK: [
    "resume", "play", "continue", "start", "आगे बोलो", "जारी रखें", "chalu", "shuru", "aage bolo"
  ],
  REPEAT_QUESTION: [
    "repeat", "repeet", "re-read", "दोबारा", "फिर से", "read again", "repeat question", "dobara padho", "दोबारा बोलो", "फिर से पढ़ो"
  ],
  FLAG_REVIEW: [
    "flag", "mark", "review", "flag for review", "mark for review", "review later", "रिव्यू", "चिह्नित करो", "बाद में देखेंगे", "फ्लैग", "bookmark", "चिह्नित"
  ],
  CLEAR_RESPONSE: [
    "clear", "clear response", "clear answer", "unselect", "remove answer", "erase", "साफ करो", "हटाओ", "खाली करो", "remove"
  ],
  SUBMIT_EXAM: [
    "submit", "submit exam", "submit test", "finish exam", "end test", "सबमिट करो", "परीक्षा समाप्त", "finish"
  ]
};

/**
 * Standard Levenshtein Distance implementation.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Normalizes input string by lowering case and removing trailing punctuation.
 */
export function normalizeToken(token: string): string {
  return (token || '')
    .toLowerCase()
    .replace(/[.,;!?]+$/, '')
    .trim();
}

/**
 * Fuzzy matches a candidate token against command dictionary using phonetic dictionary & edit distance.
 */
export function matchTokenToCommand(rawCandidate: string): { action: CanonicalAction; matchedToken: string; confidence: number } | null {
  const candidate = normalizeToken(rawCandidate);
  if (!candidate) return null;

  const actions = Object.keys(PHONETIC_MAP) as CanonicalAction[];

  // 1. Direct exact or phrase match
  for (const action of actions) {
    const list = PHONETIC_MAP[action];
    for (const phrase of list) {
      if (candidate === phrase) {
        return { action, matchedToken: phrase, confidence: 1.0 };
      }
      // If candidate is a multi-word phrase containing the exact trigger phrase
      if (phrase.includes(' ') && candidate.includes(phrase)) {
        return { action, matchedToken: phrase, confidence: 0.95 };
      }
    }
  }

  // 2. Individual word token matching
  const words = candidate.split(/\s+/).map(normalizeToken);
  for (const word of words) {
    if (!word) continue;
    for (const action of actions) {
      const list = PHONETIC_MAP[action];
      for (const phrase of list) {
        if (!phrase.includes(' ') && word === phrase) {
          return { action, matchedToken: phrase, confidence: 0.9 };
        }
      }
    }
  }

  // 3. Levenshtein edit-distance match for near-sounds
  // Only evaluate for tokens of length >= 3 to avoid false positive collapses on 'a', 'b', 'c', 'd'
  for (const word of words) {
    if (word.length < 3) continue;

    for (const action of actions) {
      const list = PHONETIC_MAP[action];
      for (const phrase of list) {
        // Skip single-character targets
        if (phrase.length < 3 || phrase.includes(' ')) continue;

        const dist = levenshteinDistance(word, phrase);
        const maxLen = Math.max(word.length, phrase.length);
        const similarity = 1 - dist / maxLen;

        // Allow distance of 1 for 4-5 letter words ('next' vs 'nest', 'pass' vs 'pause')
        // Allow distance of 2 for words >= 7 letters ('previous' vs 'privious')
        const isClose = (maxLen <= 5 && dist <= 1) || (maxLen > 5 && dist <= 2);
        if (isClose && similarity >= 0.75) {
          return { action, matchedToken: phrase, confidence: similarity };
        }
      }
    }
  }

  return null;
}

/**
 * Multi-Alternative Speech Intent Resolver.
 * Inspects all speech recognition alternatives in order of likelihood.
 */
export function resolveMultiAlternativeCommand(transcripts: string[]): ResolvedVoiceCommand | null {
  for (const raw of transcripts) {
    const match = matchTokenToCommand(raw);
    if (match) {
      return {
        action: match.action,
        matchedToken: match.matchedToken,
        confidence: match.confidence,
        rawTranscript: raw
      };
    }
  }
  return null;
}

/**
 * Extracts all alternative transcripts from a SpeechRecognitionEvent.
 */
export function extractTranscriptsFromEvent(event: any): string[] {
  const results: string[] = [];
  if (!event || !event.results) return results;

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const item = event.results[i];
    if (!item) continue;
    for (let j = 0; j < item.length; j++) {
      const alt = item[j];
      if (alt && alt.transcript) {
        const text = alt.transcript.trim();
        if (text && !results.includes(text)) {
          results.push(text);
        }
      }
    }
  }
  return results;
}

/**
 * Injects a JSGF Grammar list into a Web Speech Recognition instance.
 */
export function injectExamGrammar(recognition: any): boolean {
  if (typeof window === "undefined" || !recognition) return false;
  try {
    const grammar = '#JSGF V1.0; grammar examCommands; public <command> = a | b | c | d | 1 | 2 | 3 | 4 | true | false | next | previous | pause | resume | repeat | review | flag | clear | submit ;';
    const SpeechGrammarList = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
    if (SpeechGrammarList) {
      const speechRecognitionList = new SpeechGrammarList();
      speechRecognitionList.addFromString(grammar, 1);
      recognition.grammars = speechRecognitionList;
      return true;
    }
  } catch (e) {
    // Unsupported or restricted in current engine
  }
  return false;
}

export interface ResilientRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onCommand?: (command: ResolvedVoiceCommand) => void;
  onRawTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (err: any) => void;
  onEnd?: () => void;
  onStart?: () => void;
}

/**
 * Creates and configures a resilient SpeechRecognition instance with grammar weighting and multi-alternative matching.
 */
export function createResilientRecognition(options: ResilientRecognitionOptions = {}): any {
  if (typeof window === "undefined") return null;

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  try {
    const recognition = new SpeechRecognition();
    recognition.lang = options.lang || 'en-US';
    recognition.continuous = options.continuous ?? false;
    recognition.interimResults = options.interimResults ?? false;
    recognition.maxAlternatives = options.maxAlternatives ?? 5;

    // Inject JSGF grammar
    injectExamGrammar(recognition);

    recognition.onstart = () => {
      if (options.onStart) options.onStart();
    };

    recognition.onresult = (event: any) => {
      const candidates = extractTranscriptsFromEvent(event);
      const primaryTranscript = candidates[0] || '';
      const isFinal = Boolean(event.results?.[event.resultIndex]?.isFinal);

      if (options.onRawTranscript && primaryTranscript) {
        options.onRawTranscript(primaryTranscript, isFinal);
      }

      // Check multi-alternatives against phonetic dictionary
      if (options.onCommand && candidates.length > 0) {
        const resolved = resolveMultiAlternativeCommand(candidates);
        if (resolved) {
          options.onCommand(resolved);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (options.onError) options.onError(event);
    };

    recognition.onend = () => {
      if (options.onEnd) options.onEnd();
    };

    return recognition;
  } catch (err) {
    console.warn('[SpeechRecognition] Factory instantiation failed:', err);
    return null;
  }
}
