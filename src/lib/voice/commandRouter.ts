export type VoiceContextName = 'global-nav' | 'exam' | 'review' | 'practice' | 'hub';

export type CommandType =
  | 'next'
  | 'previous'
  | 'go-to-question'
  | 'repeat-question'
  | 'read-options'
  | 'read-everything'
  | 'clear-answer'
  | 'flag-unflag'
  | 'submit'
  | 'confirm'
  | 'cancel'
  | 'describe-diagram'
  | 'time-left'
  | 'how-many-answered'
  | 'next-section'
  | 'select-option'
  | 'true-false'
  | 'dictated-text'
  | 'continue'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'route'
  | 'unknown';

export interface CommandRouterResult {
  type: CommandType;
  context: VoiceContextName;
  normalized: string;
  handled: boolean;
  optionIndex?: number;
  path?: string;
  message?: string;
  readback?: string;
  confidence?: number;
  deduped?: boolean;
}

const contextHandlers = new Map<VoiceContextName, (transcript: string) => void>();
const cooldownMap = new Map<string, number>();
const idempotencyMap = new Map<string, number>();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function registerVoiceContext(context: VoiceContextName, handler: (transcript: string) => void): void {
  contextHandlers.set(context, handler);
}

export function unregisterVoiceContext(context: VoiceContextName): void {
  contextHandlers.delete(context);
}

export function hasActiveContext(contexts?: VoiceContextName[]): boolean {
  if (!contexts || contexts.length === 0) return contextHandlers.size > 0;
  return contexts.some(c => contextHandlers.has(c));
}

export function normalizeSpeechInput(raw: string): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, ' ')
    .replace(/[.,!?;:()\[\]{}"'`/\\|@#$%^&*_+=<>~]/g, ' ')
    .replace(/[।،؛،]/g, ' ')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function wholeWordMatch(text: string, token: string): boolean {
  if (!text || !token) return false;
  const regex = new RegExp(`(^|\\s)${escapeRegExp(token)}(?=\\s|$)`, 'i');
  return regex.test(text);
}

function matchesAnyWholeWord(text: string, tokens: string[]): boolean {
  return tokens.some((token) => wholeWordMatch(text, token));
}

function optionFromText(normalized: string): number | undefined {
  const optionMap: Record<string, number> = {
    a: 0,
    b: 1,
    c: 2,
    d: 3,
    'option a': 0,
    'option b': 1,
    'option c': 2,
    'option d': 3,
    'vikalp a': 0,
    'vikalp b': 1,
    'vikalp c': 2,
    'vikalp d': 3,
    'विकल्प a': 0,
    'विकल्प b': 1,
    'विकल्प c': 2,
    'विकल्प d': 3,
    'विकल्प ए': 0,
    'विकल्प बी': 1,
    'विकल्प सी': 2,
    'विकल्प डी': 3,
    'ए': 0,
    'बी': 1,
    'सी': 2,
    'डी': 3,
    'पहला': 0,
    'दूसरा': 1,
    'तीसरा': 2,
    'चौथा': 3,
    'doosra': 1,
    'teesra': 2,
    'chautha': 3,
    'pehla': 0,
    '1': 0,
    '2': 1,
    '3': 2,
    '4': 3,
  };

  const exact = optionMap[normalized];
  if (exact !== undefined) return exact;

  const words = normalized.split(/\s+/);
  for (const word of words) {
    if (optionMap[word] !== undefined) return optionMap[word];
  }

  return undefined;
}

function isSingleOptionUtterance(normalized: string): boolean {
  return /^(a|b|c|d|1|2|3|4|option a|option b|option c|option d|vikalp a|vikalp b|vikalp c|vikalp d|\u090f|\u092c|\u0938|\u0921|\u092a\u0939\u0932\u093e|\u0926\u0942\u0938\u0930\u093e|\u0924\u0940\u0938\u0930\u093e|\u091a\u094c\u0925\u093e)$/.test(normalized);
}

function maybeDedupe(type: CommandType, normalized: string): { deduped: boolean; reason?: string } {
  const now = Date.now();
  const cooldownUntil = cooldownMap.get(type) || 0;
  if (now - cooldownUntil < 1500) {
    return { deduped: true };
  }

  const idKey = `${type}:${normalized}`;
  const lastSeen = idempotencyMap.get(idKey) || 0;
  if (now - lastSeen < 1500) {
    return { deduped: true };
  }

  cooldownMap.set(type, now);
  idempotencyMap.set(idKey, now);
  return { deduped: false };
}

function buildReadback(type: CommandType, optionIndex?: number): string | undefined {
  switch (type) {
    case 'select-option':
      return optionIndex !== undefined ? `Option ${String.fromCharCode(65 + optionIndex)} selected` : 'Option selected';
    case 'next':
      return 'Next question';
    case 'previous':
      return 'Previous question';
    case 'flag-unflag':
      return 'Question marked for review';
    case 'clear-answer':
      return 'Response cleared';
    case 'submit':
      return 'Submit exam';
    case 'confirm':
      return 'Confirmed';
    case 'cancel':
      return 'Cancelled';
    case 'describe-diagram':
      return 'Describing diagram';
    case 'repeat-question':
      return 'Repeating question';
    case 'continue':
      return 'Continuing';
    default:
      return undefined;
  }
}

export function routeVoiceCommand(raw: string, context: VoiceContextName = 'global-nav'): CommandRouterResult {
  const normalized = normalizeSpeechInput(raw);
  const base: CommandRouterResult = {
    type: 'unknown',
    context,
    normalized,
    handled: false,
    confidence: 0,
  };

  if (!normalized) return base;

  const inExam = typeof window !== 'undefined' && window.location.pathname.startsWith('/exam');
  if (context === 'global-nav' && inExam && ['next', 'previous', 'select-option', 'clear-answer', 'flag-unflag', 'submit', 'confirm', 'cancel'].includes(base.type as any)) {
    return { ...base, handled: false, message: 'exam command ignored by global-nav context' };
  }

  const shouldConfirm = /^(yes|haan|haan ji|हाँ|हां|confirm|submit|proceed)$/.test(normalized) || /^(no|nahin|nahi|cancel|रद्द|नहीं)$/.test(normalized);
  if (shouldConfirm) {
    const deduped = maybeDedupe('confirm', normalized);
    if (deduped.deduped) return { ...base, type: 'confirm', handled: true, deduped: true, readback: 'Confirmation already processed' };
    return { ...base, type: 'confirm', handled: true, confidence: 1, readback: 'Confirmed', deduped: false };
  }

  const optionIndex = optionFromText(normalized);
  if (optionIndex !== undefined && (normalized === 'a' || normalized === 'b' || normalized === 'c' || normalized === 'd' || normalized === '1' || normalized === '2' || normalized === '3' || normalized === '4' || isSingleOptionUtterance(normalized))) {
    const dedupe = maybeDedupe('select-option', normalized);
    if (dedupe.deduped) {
      return { ...base, type: 'select-option', handled: true, optionIndex, deduped: true, readback: 'Selection already processed' };
    }
    return {
      ...base,
      type: 'select-option',
      handled: true,
      optionIndex,
      confidence: 1,
      readback: buildReadback('select-option', optionIndex),
      deduped: false,
    };
  }

  const positivePhrases = ['next', 'next question', 'agla', 'aage', 'अगला', 'आगे', 'next question please'];
  const negativePhrases = ['previous', 'back', 'pichla', 'पिछला', 'पीछे', 'prev'];
  const repeatPhrases = ['repeat', 'repeat question', 'read again', 'dobara', 'दोबारा', 'फिर से', 'read question'];
  const clearPhrases = ['clear', 'clear answer', 'remove answer', 'erase', 'साफ करो', 'खाली करो', 'हटाओ'];
  const flagPhrases = ['flag', 'mark for review', 'review', 'फ्लैग', 'रिव्यू', 'चिह्नित करो'];
  const submitPhrases = ['submit', 'submit exam', 'finish exam', 'submit test', 'सबमिट', 'परीक्षा समाप्त'];
  const confirmPhrases = ['yes', 'confirm', 'haan', 'हाँ', 'हां', 'proceed'];
  const cancelPhrases = ['no', 'cancel', 'nahin', 'नहीं', 'रद्द'];
  const describePhrases = ['describe diagram', 'explain diagram', 'diagram', 'चित्र समझाओ', 'विवरण'];
  const pausePhrases = ['pause', 'ruko', 'रुको', 'pause speech'];
  const resumePhrases = ['resume', 'continue', 'chalu', 'जारी रखें', 'आगे'];
  const stopPhrases = ['stop', 'stop speaking', 'band karo', 'बंद करो'];
  const timePhrases = ['time left', 'samay bacha', 'समय बचा', 'time remaining'];
  const answeredPhrases = ['how many answered', 'kitne jawab', 'कितने उत्तर'];
  const nextSectionPhrases = ['next section', 'agla section', 'अगला सेक्शन'];
  const readOptionsPhrases = ['read options', 'option read', 'options', 'vikalp', 'विकल्प'];
  const readAllPhrases = ['read everything', 'read all', 'sara padho', 'सभी पढ़ो', 'सब पढ़ो'];
  const navPhrases: Record<string, string> = {
    dashboard: '/dashboard',
    'go to dashboard': '/dashboard',
    home: '/dashboard',
    exam: '/exam',
    exams: '/exam',
    practice: '/practice',
    'go to practice': '/practice',
    settings: '/settings',
    'go to settings': '/settings',
    login: '/login',
    'go to login': '/login',
    'open dashboard': '/dashboard',
    'open exam': '/exam',
    'open practice': '/practice',
    'open settings': '/settings',
    'open login': '/login',
    'dashboard page': '/dashboard',
    'exam page': '/exam',
    'practice page': '/practice',
    'settings page': '/settings',
    'login page': '/login',
  };

  for (const [phrase, path] of Object.entries(navPhrases)) {
    if (matchesAnyWholeWord(normalized, [phrase])) {
      return { ...base, type: 'route', handled: true, confidence: 0.85, path, readback: `Navigating to ${path}` };
    }
  }

  if (matchesAnyWholeWord(normalized, positivePhrases)) {
    const dedupe = maybeDedupe('next', normalized);
    return { ...base, type: 'next', handled: true, confidence: 0.92, readback: dedupe.deduped ? 'Next already processed' : 'Next question', deduped: dedupe.deduped };
  }
  if (matchesAnyWholeWord(normalized, negativePhrases)) {
    const dedupe = maybeDedupe('previous', normalized);
    return { ...base, type: 'previous', handled: true, confidence: 0.92, readback: dedupe.deduped ? 'Previous already processed' : 'Previous question', deduped: dedupe.deduped };
  }
  if (matchesAnyWholeWord(normalized, repeatPhrases)) {
    const dedupe = maybeDedupe('repeat-question', normalized);
    return { ...base, type: 'repeat-question', handled: true, confidence: 0.9, readback: dedupe.deduped ? 'Repeat already processed' : 'Repeating question', deduped: dedupe.deduped };
  }
  if (matchesAnyWholeWord(normalized, clearPhrases)) {
    const dedupe = maybeDedupe('clear-answer', normalized);
    return { ...base, type: 'clear-answer', handled: true, confidence: 0.9, readback: dedupe.deduped ? 'Clear already processed' : 'Response cleared', deduped: dedupe.deduped };
  }
  if (matchesAnyWholeWord(normalized, flagPhrases)) {
    const dedupe = maybeDedupe('flag-unflag', normalized);
    return { ...base, type: 'flag-unflag', handled: true, confidence: 0.9, readback: dedupe.deduped ? 'Flag already processed' : 'Question flagged', deduped: dedupe.deduped };
  }
  if (matchesAnyWholeWord(normalized, submitPhrases)) {
    const dedupe = maybeDedupe('submit', normalized);
    return { ...base, type: 'submit', handled: true, confidence: 0.93, readback: dedupe.deduped ? 'Submit already processed' : 'Submit exam', deduped: dedupe.deduped };
  }
  if (matchesAnyWholeWord(normalized, confirmPhrases)) {
    const dedupe = maybeDedupe('confirm', normalized);
    return { ...base, type: 'confirm', handled: true, confidence: 1, readback: dedupe.deduped ? 'Confirmation already processed' : 'Confirmed', deduped: dedupe.deduped };
  }
  if (matchesAnyWholeWord(normalized, cancelPhrases)) {
    const dedupe = maybeDedupe('cancel', normalized);
    return { ...base, type: 'cancel', handled: true, confidence: 1, readback: dedupe.deduped ? 'Cancellation already processed' : 'Cancelled', deduped: dedupe.deduped };
  }
  if (matchesAnyWholeWord(normalized, describePhrases)) {
    const dedupe = maybeDedupe('describe-diagram', normalized);
    return { ...base, type: 'describe-diagram', handled: true, confidence: 0.9, readback: dedupe.deduped ? 'Diagram description already processed' : 'Describing diagram', deduped: dedupe.deduped };
  }
  if (matchesAnyWholeWord(normalized, pausePhrases)) {
    return { ...base, type: 'pause', handled: true, confidence: 0.9, readback: 'Paused' };
  }
  if (matchesAnyWholeWord(normalized, resumePhrases)) {
    return { ...base, type: 'resume', handled: true, confidence: 0.9, readback: 'Resumed' };
  }
  if (matchesAnyWholeWord(normalized, stopPhrases)) {
    return { ...base, type: 'stop', handled: true, confidence: 0.9, readback: 'Stopped' };
  }
  if (matchesAnyWholeWord(normalized, timePhrases)) {
    return { ...base, type: 'time-left', handled: true, confidence: 0.8, readback: 'Time left requested' };
  }
  if (matchesAnyWholeWord(normalized, answeredPhrases)) {
    return { ...base, type: 'how-many-answered', handled: true, confidence: 0.8, readback: 'How many answered requested' };
  }
  if (matchesAnyWholeWord(normalized, nextSectionPhrases)) {
    return { ...base, type: 'next-section', handled: true, confidence: 0.8, readback: 'Next section' };
  }
  if (matchesAnyWholeWord(normalized, readOptionsPhrases)) {
    return { ...base, type: 'read-options', handled: true, confidence: 0.8, readback: 'Reading options' };
  }
  if (matchesAnyWholeWord(normalized, readAllPhrases)) {
    return { ...base, type: 'read-everything', handled: true, confidence: 0.8, readback: 'Reading everything' };
  }

  if (context === 'exam' || context === 'review' || context === 'practice') {
    const isGoToQuestion = /^go to question\s*\d+$|^question\s*\d+$|^\d+$/.test(normalized);
    if (isGoToQuestion) {
      const match = normalized.match(/(\d+)/);
      const questionNumber = match ? Number(match[1]) : undefined;
      if (questionNumber) {
        return { ...base, type: 'go-to-question', handled: true, confidence: 0.8, readback: `Go to question ${questionNumber}` };
      }
    }
  }

  if (normalized.includes('the answer is ') || normalized.includes('उत्तर है ') || normalized.includes('answer is ')) {
    return { ...base, type: 'dictated-text', handled: true, confidence: 0.8, readback: 'Answer recorded' };
  }

  return base;
}

export function dispatchVoiceCommand(raw: string, context: VoiceContextName = 'global-nav'): CommandRouterResult {
  const result = routeVoiceCommand(raw, context);
  if (!result.handled || !result.type || result.type === 'unknown') {
    return result;
  }

  const handler = contextHandlers.get(context);
  if (handler) {
    try {
      handler(raw);
    } catch (error) {
      console.warn('[voice-router] handler failed', error);
    }
  }

  return result;
}

export function getActiveContextHandlers(): VoiceContextName[] {
  return Array.from(contextHandlers.keys());
}

export function getCommandReadback(result: CommandRouterResult): string | undefined {
  return result.readback || buildReadback(result.type, result.optionIndex);
}

export default {
  registerVoiceContext,
  unregisterVoiceContext,
  normalizeSpeechInput,
  routeVoiceCommand,
  dispatchVoiceCommand,
  getActiveContextHandlers,
  getCommandReadback,
};
