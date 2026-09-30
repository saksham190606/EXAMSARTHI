export type VoiceContextName = 'global-nav' | 'exam' | 'review' | 'practice' | 'hub' | 'results' | 'instruction';

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

export function registerVoiceContext(context: VoiceContextName, handler?: (transcript: string) => void): void {
  contextHandlers.set(context, handler || (() => {}));
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
  const norm = normalized.toLowerCase().trim();
  const optionMap: Record<string, number> = {
    // English single tokens & homophones
    a: 0,
    b: 1,
    c: 2,
    d: 3,
    ay: 0,
    hey: 0,
    eight: 0,
    bee: 1,
    be: 1,
    see: 2,
    sea: 2,
    si: 2,
    dee: 3,
    '1': 0,
    '2': 1,
    '3': 2,
    '4': 3,
    one: 0,
    two: 1,
    three: 2,
    four: 3,
    first: 0,
    second: 1,
    third: 2,
    fourth: 3,

    // Hindi single tokens
    'ए': 0,
    'बी': 1,
    'सी': 2,
    'डी': 3,
    'पहला': 0,
    'दूसरा': 1,
    'तीसरा': 2,
    'चौथा': 3,
    'एक': 0,
    'दो': 1,
    'तीन': 2,
    'चार': 3,
    pehla: 0,
    doosra: 1,
    teesra: 2,
    chautha: 3,
    ek: 0,
    do: 1,
    teen: 2,
    char: 3,
    chaar: 3,

    // Option phrases (Letters)
    'option a': 0,
    'option b': 1,
    'option c': 2,
    'option d': 3,
    'opt a': 0,
    'opt b': 1,
    'opt c': 2,
    'opt d': 3,
    'choice a': 0,
    'choice b': 1,
    'choice c': 2,
    'choice d': 3,

    // Option phrases (Numbers)
    'option 1': 0,
    'option 2': 1,
    'option 3': 2,
    'option 4': 3,
    'opt 1': 0,
    'opt 2': 1,
    'opt 3': 2,
    'opt 4': 3,
    'choice 1': 0,
    'choice 2': 1,
    'choice 3': 2,
    'choice 4': 3,
    'option one': 0,
    'option two': 1,
    'option three': 2,
    'option four': 3,
    'option ek': 0,
    'option do': 1,
    'option teen': 2,
    'option char': 3,
    'option chaar': 3,

    // Vikalp phrases
    'vikalp a': 0,
    'vikalp b': 1,
    'vikalp c': 2,
    'vikalp d': 3,
    'vikalp 1': 0,
    'vikalp 2': 1,
    'vikalp 3': 2,
    'vikalp 4': 3,
    'vikalp ek': 0,
    'vikalp do': 1,
    'vikalp teen': 2,
    'vikalp char': 3,
    'vikalp chaar': 3,

    // Hindi script phrases
    'विकल्प a': 0,
    'विकल्प b': 1,
    'विकल्प c': 2,
    'विकल्प d': 3,
    'विकल्प 1': 0,
    'विकल्प 2': 1,
    'विकल्प 3': 2,
    'विकल्प 4': 3,
    'विकल्प ए': 0,
    'विकल्प बी': 1,
    'विकल्प सी': 2,
    'विकल्प डी': 3,
    'विकल्प एक': 0,
    'विकल्प दो': 1,
    'विकल्प तीन': 2,
    'विकल्प चार': 3,

    // Option script variants
    'ऑप्शन ए': 0,
    'ऑप्शन बी': 1,
    'ऑप्शन सी': 2,
    'ऑप्शन डी': 3,
    'ऑप्शन 1': 0,
    'ऑप्शन 2': 1,
    'ऑप्शन 3': 2,
    'ऑप्शन 4': 3,
    'ऑप्शन a': 0,
    'ऑप्शन b': 1,
    'ऑप्शन c': 2,
    'ऑप्शन d': 3,

    // Ordinal option phrases
    'पहला विकल्प': 0,
    'दूसरा विकल्प': 1,
    'तीसरा विकल्प': 2,
    'चौथा विकल्प': 3,
    'पहला ऑप्शन': 0,
    'दूसरा ऑप्शन': 1,
    'तीसरा ऑप्शन': 2,
    'चौथा ऑप्शन': 3,
    'pehla option': 0,
    'doosra option': 1,
    'teesra option': 2,
    'chautha option': 3,
    'first option': 0,
    'second option': 1,
    'third option': 2,
    'fourth option': 3,
  };

  const exact = optionMap[norm];
  if (exact !== undefined) return exact;

  // Verb + Option patterns: e.g. "select option a", "choose b", "mark option 3", "answer is c"
  const optionRegex = /^(?:select|choose|mark|pick|answer|ans)\s+(?:is\s+)?(?:option\s+|vikalp\s+|विकल्प\s+|ऑप्शन\s+)?([a-d1-4]|ay|bee|see|sea|si|dee|one|two|three|four|first|second|third|fourth|pehla|doosra|teesra|chautha|ए|बी|सी|डी|एक|दो|तीन|चार)$/i;
  const match = norm.match(optionRegex);
  if (match && match[1]) {
    const val = match[1].toLowerCase();
    if (optionMap[val] !== undefined) {
      return optionMap[val];
    }
  }

  // Check "option X", "vikalp X", "विकल्प X", "ऑप्शन X"
  const prefixMatch = /^(?:option|vikalp|विकल्प|ऑप्शन)\s+([a-d1-4]|ay|bee|see|sea|si|dee|one|two|three|four|ek|do|teen|char|chaar|ए|बी|सी|डी|एक|दो|तीन|चार)$/i.exec(norm);
  if (prefixMatch && prefixMatch[1]) {
    const val = prefixMatch[1].toLowerCase();
    if (optionMap[val] !== undefined) {
      return optionMap[val];
    }
  }

  return undefined;
}

function isSingleOptionUtterance(normalized: string): boolean {
  return optionFromText(normalized) !== undefined;
}

function maybeDedupe(type: CommandType, normalized: string): { deduped: boolean; reason?: string } {
  const now = Date.now();
  const cooldownUntil = cooldownMap.get(type) || 0;
  if (now - cooldownUntil < 800) {
    return { deduped: true };
  }

  const idKey = `${type}:${normalized}`;
  const lastSeen = idempotencyMap.get(idKey) || 0;
  if (now - lastSeen < 800) {
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
  const inResults = (typeof window !== 'undefined' && window.location.pathname.startsWith('/results')) || context === 'results';
  const inInstruction = context === 'instruction' || hasActiveContext(['instruction']) || (typeof window !== 'undefined' && Boolean((window as any).__examsarthi_instruction_active));

  if (context === 'instruction' || inInstruction) {
    const isStart = ['start exam', 'start test', 'start mock', 'begin exam', 'begin test', 'start the exam', 'start the test', 'take exam', 'take test', 'start', 'begin', 'परीक्षा शुरू करें', 'शुरू करें', 'स्टार्ट', 'परीक्षा शुरू', 'एग्जाम शुरू', 'टेस्ट शुरू'].some(p => wholeWordMatch(normalized, p) || normalized.includes(p));
    if (isStart) {
      return { ...base, type: 'continue', handled: true, confidence: 1, readback: 'Starting examination' };
    }
    const isRepeat = ['repeat', 'repeat instruction', 'repeat instructions', 'repeat the instruction', 'read again', 'tell again', 'speak again', 'again', 'दोबारा', 'फिर से', 'दोबारा बोलो', 'दोबारा बताओ', 'निर्देश दोबारा', 'दोहराएं', 'dobara'].some(p => wholeWordMatch(normalized, p) || normalized.includes(p));
    if (isRepeat) {
      return { ...base, type: 'repeat-question', handled: true, confidence: 1, readback: 'Repeating instructions' };
    }
    const isBack = ['back', 'go back', 'return', 'exit', 'cancel', 'वापस', 'पीछे', 'वापस जाएं', 'बाहर', 'रद्द', 'wapas'].some(p => wholeWordMatch(normalized, p) || normalized.includes(p));
    if (isBack) {
      return { ...base, type: 'route', path: 'back', handled: true, confidence: 1, readback: 'Going back' };
    }
    return { ...base, handled: false, message: 'Invalid command on instruction screen' };
  }

  if (context === 'global-nav' && inExam && (['next', 'previous', 'select-option', 'clear-answer', 'flag-unflag', 'submit', 'confirm', 'cancel'] as CommandType[]).includes(base.type)) {
    return { ...base, handled: false, message: 'exam command ignored by global-nav context' };
  }

  const optionIndex = optionFromText(normalized);
  if (optionIndex !== undefined) {
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

  const positivePhrases = ['next', 'next question', 'agla', 'aage', 'अगला', 'next question please', 'forward', 'aage badho', 'आगे'];
  const negativePhrases = ['previous', 'back', 'pichla', 'पिछला', 'पीछे', 'prev', 'previous question', 'piche', 'peeche'];
  const repeatPhrases = ['repeat', 'repeat question', 'read again', 'dobara', 'दोबारा', 'फिर से', 'read question', 'once more', 'dohrao'];
  const clearPhrases = ['clear', 'clear answer', 'remove answer', 'erase', 'साफ करो', 'खाली करो', 'हटाओ'];
  const flagPhrases = [
    'flag', 'flag for review', 'flagfor review', 'flagfor', 'mark for review', 'flag this', 'flag question',
    'mark', 'review later', 'bookmark', 'review', 'फ्लैग', 'रिव्यू', 'चिह्नित करो', 'चिह्नित'
  ];
  const submitPhrases = [
    'submit',
    'submit exam',
    'submit the exam',
    'submit my exam',
    'submit final exam',
    'finish exam',
    'finish the exam',
    'submit test',
    'submit the test',
    'finish test',
    'submit practice',
    'submit practice set',
    'submit practice exam',
    'submit paper',
    'submit session',
    'end exam',
    'end test',
    'complete exam',
    'complete test',
    'सबमिट',
    'सबमिट करो',
    'सबमिट करें',
    'परीक्षा समाप्त',
    'परीक्षा सबमिट',
    'सबमिट परीक्षा',
    'एग्जाम सबमिट',
    'सबमिट एग्जाम',
    'टेस्ट सबमिट',
    'सबमिट टेस्ट',
    'पेपर सबमिट',
    'सबमिट पेपर',
    'pariksha submit',
    'exam submit',
    'test submit',
  ];
  const confirmPhrases = [
    'yes',
    'confirm',
    'haan',
    'हाँ',
    'हां',
    'proceed',
    'yes submit',
    'confirm submit',
    'haan submit',
    'yes confirm',
    'submit it',
    'kar do',
    'सबमिट कर दो',
    'हाँ सबमिट',
    'ha',
    'sure',
    'ok',
    'okay',
    'yes please',
    'bilkul',
    'पुष्टि',
  ];
  const cancelPhrases = [
    'no',
    'cancel',
    'nahin',
    'nahi',
    'नहीं',
    'रद्द',
    'cancel submit',
    'dont submit',
    "don't submit",
    'छोड़ो',
    'वापस',
    'wapas',
  ];
  const describePhrases = ['describe diagram', 'explain diagram', 'diagram', 'चित्र समझाओ', 'विवरण'];
  const pausePhrases = ['pause', 'ruko', 'रुको', 'pause speech'];
  const resumePhrases = (context === 'review' || context === 'practice') ? ['resume', 'continue', 'आगे', 'chalu', 'जारी रखें'] : ['resume', 'chalu', 'जारी रखें'];
  const stopPhrases = ['stop', 'stop speaking', 'band karo', 'बंद करो'];
  const timePhrases = ['time left', 'samay bacha', 'समय बचा', 'time remaining'];
  const answeredPhrases = ['how many answered', 'kitne jawab', 'कितने उत्तर'];
  const nextSectionPhrases = ['next section', 'agla section', 'अगला सेक्शन'];
  const readOptionsPhrases = ['read options', 'option read'];
  const readAllPhrases = ['read everything', 'read all', 'sara padho', 'सभी पढ़ो', 'सब पढ़ो'];

  // Navigation phrases apply in all contexts to enable switching sections from anywhere
  const navPhrases: Record<string, string> = {
    // Specific Practice Sub-sections (checked with highest priority)
    'open practice gk and geography': '/practice?subject=gk',
    'open practice gk geography': '/practice?subject=gk',
    'open gk and geography': '/practice?subject=gk',
    'open gk geography': '/practice?subject=gk',
    'go to practice gk': '/practice?subject=gk',
    'open geography practice': '/practice?subject=gk',
    'practice gk and geography': '/practice?subject=gk',
    'gk and geography': '/practice?subject=gk',
    'gk geography': '/practice?subject=gk',
    'geography practice': '/practice?subject=gk',
    'practice gk': '/practice?subject=gk',
    'geography': '/practice?subject=gk',
    'सामान्य ज्ञान और भूगोल': '/practice?subject=gk',
    'भूगोल प्रैक्टिस': '/practice?subject=gk',
    'जीके और भूगोल': '/practice?subject=gk',
    'भूगोल': '/practice?subject=gk',

    // Section 1: Dashboard
    'dashboard': '/dashboard',
    'go to dashboard': '/dashboard',
    'open dashboard': '/dashboard',
    'show dashboard': '/dashboard',
    'dashboard page': '/dashboard',
    'dashboard section': '/dashboard',
    'home': '/dashboard',
    'go home': '/dashboard',
    'home page': '/dashboard',
    'main screen': '/dashboard',
    'main menu': '/dashboard',
    'डैशबोर्ड': '/dashboard',
    'डैशबोर्ड खोलो': '/dashboard',
    'डैशबोर्ड पर जाओ': '/dashboard',
    'होम': '/dashboard',
    'मुख्य पृष्ठ': '/dashboard',

    // Section 2: Practice
    'practice': '/practice',
    'go to practice': '/practice',
    'open practice': '/practice',
    'show practice': '/practice',
    'practice page': '/practice',
    'practice section': '/practice',
    'practice questions': '/practice',
    'start practice': '/practice',
    'अभ्यास': '/practice',
    'प्रैक्टिस': '/practice',
    'पढ़ाई': '/practice',
    'प्रैक्टिस खोलो': '/practice',
    'अभ्यास खोलो': '/practice',

    // Section 3: Exams
    'exam': '/exam',
    'exams': '/exam',
    'go to exam': '/exam',
    'go to exams': '/exam',
    'open exam': '/exam',
    'open exams': '/exam',
    'show exams': '/exam',
    'show exam': '/exam',
    'exam page': '/exam',
    'exams page': '/exam',
    'exam section': '/exam',
    'exams section': '/exam',
    'exam hub': '/exam',
    'exams hub': '/exam',
    'open exam hub': '/exam',
    'take exam': '/exam',
    'start exam': '/exam',
    'mock exam': '/exam',
    'mock test': '/exam',
    'test series': '/exam',
    'exam kholo': '/exam',
    'exam shuru karo': '/exam',
    'exam shuru': '/exam',
    'परीक्षा': '/exam',
    'एग्जाम': '/exam',
    'मॉक टेस्ट': '/exam',
    'टेस्ट': '/exam',
    'परीक्षा खोलो': '/exam',
    'एग्जाम खोलो': '/exam',

    // Specific Examination Portals (UPSC, SSC, Bank PO / Bank IPO, Railway)
    'open upsc': '/exam?set=upsc-mock-1',
    'open upsc exam': '/exam?set=upsc-mock-1',
    'start upsc': '/exam?set=upsc-mock-1',
    'start upsc exam': '/exam?set=upsc-mock-1',
    'take upsc': '/exam?set=upsc-mock-1',
    'take upsc exam': '/exam?set=upsc-mock-1',
    'upsc exam': '/exam?set=upsc-mock-1',
    'upsc mock': '/exam?set=upsc-mock-1',
    'upsc prelims': '/exam?set=upsc-mock-1',
    'upsc cse': '/exam?set=upsc-mock-1',
    'upsc': '/exam?set=upsc-mock-1',
    'यूपीएससी': '/exam?set=upsc-mock-1',
    'यूपीएससी परीक्षा': '/exam?set=upsc-mock-1',

    'open ssc': '/exam?set=cgl-mock-1',
    'open ssc exam': '/exam?set=cgl-mock-1',
    'open ssc cgl': '/exam?set=cgl-mock-1',
    'start ssc': '/exam?set=cgl-mock-1',
    'start ssc exam': '/exam?set=cgl-mock-1',
    'start ssc cgl': '/exam?set=cgl-mock-1',
    'take ssc': '/exam?set=cgl-mock-1',
    'take ssc exam': '/exam?set=cgl-mock-1',
    'ssc cgl': '/exam?set=cgl-mock-1',
    'ssc exam': '/exam?set=cgl-mock-1',
    'cgl mock': '/exam?set=cgl-mock-1',
    'cgl exam': '/exam?set=cgl-mock-1',
    'ssc': '/exam?set=cgl-mock-1',
    'एसएससी': '/exam?set=cgl-mock-1',
    'सीजीएल': '/exam?set=cgl-mock-1',

    'open bank po': '/exam?set=ibps-mock-1',
    'open bank ipo': '/exam?set=ibps-mock-1',
    'open ibps': '/exam?set=ibps-mock-1',
    'open ibps po': '/exam?set=ibps-mock-1',
    'start bank po': '/exam?set=ibps-mock-1',
    'start bank ipo': '/exam?set=ibps-mock-1',
    'start ibps': '/exam?set=ibps-mock-1',
    'take bank po': '/exam?set=ibps-mock-1',
    'take bank ipo': '/exam?set=ibps-mock-1',
    'bank po': '/exam?set=ibps-mock-1',
    'bank ipo': '/exam?set=ibps-mock-1',
    'ibps po': '/exam?set=ibps-mock-1',
    'ibps': '/exam?set=ibps-mock-1',
    'bank exam': '/exam?set=ibps-mock-1',
    'banking': '/exam?set=ibps-mock-1',
    'बैंक पीओ': '/exam?set=ibps-mock-1',
    'बैंक आईपीओ': '/exam?set=ibps-mock-1',
    'आईबीपीएस': '/exam?set=ibps-mock-1',

    'open railway': '/exam?set=rrb-mock-1',
    'open railway exam': '/exam?set=rrb-mock-1',
    'open rrb': '/exam?set=rrb-mock-1',
    'start railway': '/exam?set=rrb-mock-1',
    'start rrb': '/exam?set=rrb-mock-1',
    'railway exam': '/exam?set=rrb-mock-1',
    'rrb ntpc': '/exam?set=rrb-mock-1',
    'railway': '/exam?set=rrb-mock-1',
    'railways': '/exam?set=rrb-mock-1',
    'rrb': '/exam?set=rrb-mock-1',
    'रेलवे': '/exam?set=rrb-mock-1',
    'आरआरबी': '/exam?set=rrb-mock-1',

    'open ugc': '/exam?set=ugc-mock-1',
    'open ugc net': '/exam?set=ugc-mock-1',
    'open net': '/exam?set=ugc-mock-1',
    'open net exam': '/exam?set=ugc-mock-1',
    'start ugc': '/exam?set=ugc-mock-1',
    'start ugc net': '/exam?set=ugc-mock-1',
    'start net': '/exam?set=ugc-mock-1',
    'start net exam': '/exam?set=ugc-mock-1',
    'take ugc': '/exam?set=ugc-mock-1',
    'take ugc net': '/exam?set=ugc-mock-1',
    'ugc': '/exam?set=ugc-mock-1',
    'ugc net': '/exam?set=ugc-mock-1',
    'ugc exam': '/exam?set=ugc-mock-1',
    'net exam': '/exam?set=ugc-mock-1',
    'यूजीसी': '/exam?set=ugc-mock-1',
    'नेट': '/exam?set=ugc-mock-1',
    'यूजीसी नेट': '/exam?set=ugc-mock-1',
    'नेट परीक्षा': '/exam?set=ugc-mock-1',

    'vision ai': '/exam?set=p6',
    'diagram exam': '/exam?set=p6',
    'diagram test': '/exam?set=p6',
    'open diagram': '/exam?set=p6',
    'open vision ai': '/exam?set=p6',
    'vision ai exam': '/exam?set=p6',
    'diagram practice': '/exam?set=p6',
    'चित्र': '/exam?set=p6',
    'डायग्राम': '/exam?set=p6',

    // Specific Practice Sets: Math / Quant (p1)
    'open math practice': '/exam?set=p1',
    'open maths practice': '/exam?set=p1',
    'practice math': '/exam?set=p1',
    'practice maths': '/exam?set=p1',
    'open math': '/exam?set=p1',
    'open maths': '/exam?set=p1',
    'open quant': '/exam?set=p1',
    'open quantitative': '/exam?set=p1',
    'open quantitative aptitude': '/exam?set=p1',
    'quant practice': '/exam?set=p1',
    'math practice': '/exam?set=p1',
    'maths practice': '/exam?set=p1',
    'math exam': '/exam?set=p1',
    'quant exam': '/exam?set=p1',
    'percentages': '/exam?set=p1',
    'arithmetic': '/exam?set=p1',
    'गणित': '/exam?set=p1',
    'मैथ्स': '/exam?set=p1',
    'क्वांट': '/exam?set=p1',

    // Specific Practice Sets: Logical Reasoning (p3)
    'open reasoning practice': '/exam?set=p3',
    'practice reasoning': '/exam?set=p3',
    'open reasoning': '/exam?set=p3',
    'open logical reasoning': '/exam?set=p3',
    'reasoning practice': '/exam?set=p3',
    'reasoning exam': '/exam?set=p3',
    'logic practice': '/exam?set=p3',
    'open logic': '/exam?set=p3',
    'रीजनिंग': '/exam?set=p3',
    'तर्कशक्ति': '/exam?set=p3',
    'तर्क': '/exam?set=p3',

    // Specific Practice Sets: English Grammar & Comprehension (p4)
    'open english practice': '/exam?set=p4',
    'practice english': '/exam?set=p4',
    'open english': '/exam?set=p4',
    'open grammar': '/exam?set=p4',
    'english practice': '/exam?set=p4',
    'grammar practice': '/exam?set=p4',
    'english exam': '/exam?set=p4',
    'अंग्रेजी': '/exam?set=p4',
    'इंग्लिश': '/exam?set=p4',

    // Specific Practice Sets: Multi-Format Showcase (p5)
    'open showcase': '/exam?set=p5',
    'open showcase practice': '/exam?set=p5',
    'open multi format': '/exam?set=p5',
    'open multi format practice': '/exam?set=p5',
    'showcase practice': '/exam?set=p5',
    'multi format showcase': '/exam?set=p5',
    'मल्टी फॉर्मेट': '/exam?set=p5',

    // Generic Practice Exam Commands (route to Practice Hub)
    'open practice exam': '/practice',
    'take practice exam': '/practice',
    'start practice exam': '/practice',
    'practice exam': '/practice',
    'practice test': '/practice',
    'start practice test': '/practice',

    // Section 4: Results
    'results': '/results',
    'result': '/results',
    'go to results': '/results',
    'go to result': '/results',
    'open results': '/results',
    'open result': '/results',
    'show results': '/results',
    'show result': '/results',
    'results page': '/results',
    'result page': '/results',
    'results section': '/results',
    'result section': '/results',
    'my results': '/results',
    'score': '/results',
    'scores': '/results',
    'scorecard': '/results',
    'marks': '/results',
    'रिजल्ट': '/results',
    'स्कोर': '/results',
    'परिणाम': '/results',
    'नतीजे': '/results',
    'रिजल्ट खोलो': '/results',
    'रिजल्ट दिखाओ': '/results',
    'परिणाम खोलो': '/results',

    // Section 5: Settings
    'settings': '/settings',
    'setting': '/settings',
    'go to settings': '/settings',
    'go to setting': '/settings',
    'open settings': '/settings',
    'open setting': '/settings',
    'show settings': '/settings',
    'show setting': '/settings',
    'settings page': '/settings',
    'setting page': '/settings',
    'settings section': '/settings',
    'setting section': '/settings',
    'preferences': '/settings',
    'accessibility': '/settings',
    'accessibility settings': '/settings',
    'सेटिंग': '/settings',
    'सेटिंग्स': '/settings',
    'सेटिंग खोलो': '/settings',
    'सेटिंग्स खोलो': '/settings',
    'सेटिंग दिखाओ': '/settings',
    'सेटिंग्स दिखाओ': '/settings',

    // Auth / Login
    'login': '/login',
    'go to login': '/login',
    'open login': '/login',
    'login page': '/login',
    'sign in': '/login',
    'लॉगिन': '/login',
  };

  // 1. Cancel commands (Evaluated before submit so "cancel submit", "don't submit" are treated as cancellation)
  const isCancelRegex = /(?:cancel\s*submit|don\s*t\s*submit|dont\s*submit|nahi\s*karo|submit\s*mat\s*karo)/i.test(normalized);
  if (matchesAnyWholeWord(normalized, cancelPhrases) || isCancelRegex) {
    const dedupe = maybeDedupe('cancel', normalized);
    return { ...base, type: 'cancel', handled: true, confidence: 1, readback: dedupe.deduped ? 'Cancellation already processed' : 'Cancelled', deduped: dedupe.deduped };
  }

  // 2. Confirm commands (Evaluated before submit so "yes submit", "confirm submit", "haan submit" are treated as confirmation)
  const isConfirmRegex = /(?:confirm\s*submit|yes\s*(?:please|submit|confirm)|haan\s*(?:submit|karo)|submit\s*kar\s*do|haan\s*kar\s*do)/i.test(normalized);
  if (matchesAnyWholeWord(normalized, confirmPhrases) || isConfirmRegex) {
    const dedupe = maybeDedupe('confirm', normalized);
    return { ...base, type: 'confirm', handled: true, confidence: 1, readback: dedupe.deduped ? 'Confirmation already processed' : 'Confirmed', deduped: dedupe.deduped };
  }

  // 3. Submit commands (Checked before navigation so "submit exam" / "submit practice" won't route to /exam or /practice)
  const isSubmitRegex = /(?:submit|finish|end|complete)\s*(?:the\s*)?(?:my\s*)?(?:final\s*)?(?:exam|test|practice|paper|session)/i.test(normalized) ||
    /(?:exam|test|practice|paper|pariksha|परीक्षा|एग्जाम|टेस्ट)\s*(?:ko\s*)?(?:submit|finish|end|samapt|समाप्त|सबमिट)/i.test(normalized);
  if (matchesAnyWholeWord(normalized, submitPhrases) || isSubmitRegex) {
    const dedupe = maybeDedupe('submit', normalized);
    return { ...base, type: 'submit', handled: true, confidence: 0.95, readback: dedupe.deduped ? 'Submit already processed' : 'Submit exam', deduped: dedupe.deduped };
  }

  // 2. Question / Section Action commands (Checked before navigation so "next section" isn't misrouted)
  if (matchesAnyWholeWord(normalized, nextSectionPhrases)) {
    return { ...base, type: 'next-section', handled: true, confidence: 0.8, readback: 'Next section' };
  }
  if (matchesAnyWholeWord(normalized, readOptionsPhrases)) {
    return { ...base, type: 'read-options', handled: true, confidence: 0.8, readback: 'Reading options' };
  }
  if (matchesAnyWholeWord(normalized, readAllPhrases)) {
    return { ...base, type: 'read-everything', handled: true, confidence: 0.8, readback: 'Reading everything' };
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

  // Sort navigation phrases by length descending so multi-word commands are matched first
  const sortedNavEntries = Object.entries(navPhrases).sort((a, b) => b[0].length - a[0].length);
  for (const [phrase, path] of sortedNavEntries) {
    if (
      normalized === phrase ||
      matchesAnyWholeWord(normalized, [phrase]) ||
      (phrase.split(' ').length > 1 && normalized.includes(phrase))
    ) {
      if (inResults && path.startsWith('/exam?set=')) {
        const hasExplicitLaunchVerb = /(?:start|take|launch|begin|kholo|shuru|खोल|शुरू)/i.test(normalized);
        if (!hasExplicitLaunchVerb) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('examsarthi_select_result_by_name', {
                detail: { raw, normalized, phrase, path },
              })
            );
          }
          return {
            ...base,
            type: 'unknown',
            handled: true,
            confidence: 0.95,
            message: 'Handled by results exam switcher',
          };
        }
      }

      const isGk = path.includes('gk');
      const detectedIntent = isGk ? 'NAVIGATE_PRACTICE_GK' : 'NAVIGATE_ROUTE';
      const readback = isGk
        ? 'Opening General Knowledge and Geography practice'
        : (path === '/dashboard' ? 'Navigating to Dashboard' :
           path === '/practice' ? 'Opening Practice section' :
           path === '/exam' ? 'Opening Exams Hub' :
           path.includes('p1') ? 'Opening Quantitative Aptitude and Mathematics practice' :
           path.includes('p2') ? 'Opening General Knowledge and Geography practice' :
           path.includes('p3') ? 'Opening Logical Reasoning and Coding practice' :
           path.includes('p4') ? 'Opening English Grammar and Comprehension practice' :
           path.includes('p5') ? 'Opening Multi-Format Showcase practice' :
           path.includes('p6') ? 'Opening Vision AI and Diagram practice' :
           path.includes('upsc') ? 'Opening UPSC examination portal' :
           path.includes('cgl') ? 'Opening SSC CGL examination portal' :
           path.includes('ibps') ? 'Opening Bank PO examination portal' :
           path.includes('rrb') ? 'Opening Railway examination portal' :
           path === '/results' ? 'Navigating to Results' :
           path === '/settings' ? 'Navigating to Settings' :
           `Navigating to ${path}`);

      console.log('Voice transcript:', raw);
      console.log('Normalized command:', normalized);
      console.log('Detected intent:', detectedIntent);
      console.log('Action:', 'navigate');
      console.log('Navigation route:', path);

      return {
        ...base,
        type: 'route',
        handled: true,
        confidence: 0.95,
        path,
        readback,
      };
    }
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

const commandRouter = {
  registerVoiceContext,
  unregisterVoiceContext,
  normalizeSpeechInput,
  routeVoiceCommand,
  dispatchVoiceCommand,
  getActiveContextHandlers,
  getCommandReadback,
};

export default commandRouter;
