import { Question, QuestionType, getQuestionType } from '@/lib/examData';

export type CommandLanguage = 'en' | 'hi' | 'mixed';

export type ParsedCommand = 
  | { type: 'SELECT_OPTION'; letterIndex: number; rawText: string; detectedLanguage: CommandLanguage }
  | { type: 'SELECT_MULTIPLE_OPTIONS'; letterIndices: number[]; rawText: string; detectedLanguage: CommandLanguage }
  | { type: 'TRUE_FALSE'; value: boolean; rawText: string; detectedLanguage: CommandLanguage }
  | { type: 'TEXT_ANSWER'; text: string; rawText: string; detectedLanguage: CommandLanguage }
  | { type: 'NEXT'; detectedLanguage: CommandLanguage }
  | { type: 'PREVIOUS'; detectedLanguage: CommandLanguage }
  | { type: 'REPEAT'; detectedLanguage: CommandLanguage }
  | { type: 'READ_QUESTION'; detectedLanguage: CommandLanguage }
  | { type: 'READ_OPTIONS'; detectedLanguage: CommandLanguage }
  | { type: 'READ_ALL'; detectedLanguage: CommandLanguage }
  | { type: 'FLAG_QUESTION'; detectedLanguage: CommandLanguage }
  | { type: 'START_EXAM'; detectedLanguage: CommandLanguage }
  | { type: 'SUBMIT'; detectedLanguage: CommandLanguage }
  | { type: 'GOTO'; questionNumber: number; detectedLanguage: CommandLanguage }
  | { type: 'TIME_LEFT'; detectedLanguage: CommandLanguage }
  | { type: 'YES'; detectedLanguage: CommandLanguage }
  | { type: 'NO'; detectedLanguage: CommandLanguage }
  | { type: 'ENABLE_VOICE'; detectedLanguage: CommandLanguage }
  | { type: 'DISABLE_VOICE'; detectedLanguage: CommandLanguage }
  | { type: 'UNKNOWN'; rawText: string; detectedLanguage: CommandLanguage };

export interface VoiceParserContext {
  questionType?: QuestionType;
  currentQuestion?: Question;
  isPendingConfirmation?: boolean;
}

/**
 * Detects whether the input transcript contains Devanagari (Hindi), Latin (English),
 * or mixed/transliterated script features.
 */
export function detectLanguage(text: string): CommandLanguage {
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);

  if (hasDevanagari && hasLatin) return 'mixed';
  if (hasDevanagari) return 'hi';

  const lower = text.toLowerCase();
  const transliteratedHindiWords = [
    'agla', 'pichhla', 'pichla', 'sawal', 'prashna', 'padho', 'dohrao',
    'vikalp', 'samay', 'kitna', 'shuru', 'karo', 'band', 'chalu',
    'jama', 'khatam', 'chuno', 'pehla', 'doosra', 'dusra', 'teesra',
    'tisra', 'chautha', 'haan', 'nahi', 'nahin', 'wapas', 'aage', 'peeche',
    'chinhit', 'samiksha', 'sahi', 'galat', 'satya', 'asatya', 'uttar', 'jawab'
  ];
  const words = lower.split(/\s+/);
  const containsHindiWord = words.some(w => transliteratedHindiWords.includes(w));
  if (containsHindiWord) {
    const hasEnglishWord = words.some(w => ['question', 'option', 'test', 'exam', 'submit', 'start', 'next', 'previous', 'flag', 'review'].includes(w));
    return hasEnglishWord ? 'mixed' : 'hi';
  }

  return 'en';
}

/**
 * Cleans conversational prefixes and fillers from spoken text answers.
 * Used for short-answer and fill-in-the-blank questions.
 */
export function cleanTextAnswer(raw: string): string {
  let cleaned = raw.trim();

  // Strip leading conversational phrases (English)
  cleaned = cleaned.replace(/^(?:the\s+answer\s+is|my\s+answer\s+is|answer\s+is|the\s+answer|my\s+answer)\s+/i, '');
  cleaned = cleaned.replace(/^(?:fill\s+in\s+the\s+blank\s+with|fill\s+in\s+the\s+blank|fill\s+in|fill)\s+/i, '');
  cleaned = cleaned.replace(/^(?:enter|put|write|type)\s+/i, '');
  cleaned = cleaned.replace(/^(?:it\s+is|it's|its)\s+/i, '');

  // Strip leading conversational phrases (Hindi - Devanagari & Transliterated)
  cleaned = cleaned.replace(/^(?:मेरा\s+उत्तर\s+है|मेरा\s+उत्तर|उत्तर\s+है|उत्तर|मेरा\s+जवाब\s+है|मेरा\s+जवाब|जवाब\s+है|जवाब)\s+/i, '');
  cleaned = cleaned.replace(/^(?:mera\s+uttar\s+hai|mera\s+uttar|uttar\s+hai|uttar|mera\s+jawab\s+hai|mera\s+jawab|jawab\s+hai|jawab)\s+/i, '');
  cleaned = cleaned.replace(/^(?:लिखो|डालो|भरो)\s+/i, '');

  // Strip trailing fillers
  cleaned = cleaned.replace(/\s+(?:is\s+the\s+answer|is\s+my\s+answer)$/i, '');
  cleaned = cleaned.replace(/\s+(?:है|था|h|hai)$/i, '');

  // Remove edge punctuation
  cleaned = cleaned.replace(/^[.,!?:;\-_"']+|[.,!?:;\-_"']+$/g, '').trim();

  // Capitalize first character if word starts with lowercase ASCII letter
  if (cleaned.length > 0 && /^[a-z]/.test(cleaned)) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

/**
 * Extracts multiple choice option indices from spoken phrases like:
 * "A and C", "select A and C", "option A and option C", "A B and D", "ए और सी"
 */
export function parseMultipleChoiceOptions(t: string): number[] | null {
  const tokens = t
    .replace(/[,\+]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const optionIndexMap: Record<string, number> = {
    // A
    'a': 0, '1': 0, 'one': 0, 'pehla': 0, 'पहला': 0, 'ए': 0,
    // B
    'b': 1, '2': 1, 'two': 1, 'dusra': 1, 'doosra': 1, 'दूसरा': 1, 'बी': 1, 'bee': 1,
    // C
    'c': 2, '3': 2, 'three': 2, 'tisra': 2, 'teesra': 2, 'तीसरा': 2, 'सी': 2, 'see': 2, 'sea': 2,
    // D
    'd': 3, '4': 3, 'four': 3, 'chautha': 3, 'चौथा': 3, 'डी': 3, 'dee': 3
  };

  const ignoredWords = new Set([
    'and', 'or', '&', 'aur', 'और', 'तथा', 'एवं',
    'option', 'options', 'vikalp', 'विकल्प', 'ऑप्शन',
    'select', 'choose', 'mark', 'pick', 'chuno', 'चुनो'
  ]);

  const matchedIndices = new Set<number>();
  let hasValidOptionToken = false;
  let hasInvalidToken = false;

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (ignoredWords.has(lower)) {
      continue;
    }
    if (lower in optionIndexMap) {
      matchedIndices.add(optionIndexMap[lower]);
      hasValidOptionToken = true;
    } else {
      hasInvalidToken = true;
    }
  }

  if (hasValidOptionToken && !hasInvalidToken && matchedIndices.size > 0) {
    return Array.from(matchedIndices).sort((a, b) => a - b);
  }

  return null;
}

/**
 * Parses user speech transcripts across English, Hindi, and natural mixed-language commands,
 * with full question-type awareness.
 */
export function parseVoiceCommand(
  transcript: string, 
  context?: VoiceParserContext
): ParsedCommand {
  if (!transcript || typeof transcript !== 'string') {
    return { type: 'UNKNOWN', rawText: '', detectedLanguage: 'en' };
  }

  // Normalize transcript: lowercase, remove punctuation, collapse whitespace
  const t = transcript
    .toLowerCase()
    .replace(/[.,!?;:()[\]{}'"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!t) {
    return { type: 'UNKNOWN', rawText: transcript, detectedLanguage: 'en' };
  }

  const lang = detectLanguage(t);
  const qType = context?.questionType || (context?.currentQuestion ? getQuestionType(context.currentQuestion) : undefined);

  // 1. Voice Mode Lifecycle Controls (highest priority)
  if (
    /^(?:disable voice mode|stop voice mode|stop listening|turn off voice mode|voice mode off|exit voice mode)$/i.test(t) ||
    /^(?:वॉइस मोड बंद करो|आवाज़ मोड बंद करो|आवाज मोड बंद करो|सुनना बंद करो|वॉइस बंद करो|आवाज बंद करो)$/i.test(t) ||
    /^(?:voice mode band karo|sunna band karo|awaaz mode band karo)$/i.test(t)
  ) {
    return { type: 'DISABLE_VOICE', detectedLanguage: lang };
  }

  if (
    /^(?:enable voice mode|start voice mode|start listening|turn on voice mode)$/i.test(t) ||
    /^(?:वॉइस मोड चालू करो|आवाज़ मोड चालू करो|आवाज मोड चालू करो|सुनना शुरू करो|सुनना चालू करो)$/i.test(t) ||
    /^(?:voice mode chalu karo|awaaz mode chalu karo|sunna shuru karo)$/i.test(t)
  ) {
    return { type: 'ENABLE_VOICE', detectedLanguage: lang };
  }

  // 2. Exam Controls: Start Exam
  if (
    /^(?:start exam|begin exam|start test|begin test|start the exam|start the test)$/i.test(t) ||
    /^(?:परीक्षा शुरू करो|परीक्षा चालू करो|टेस्ट शुरू करो|टेस्ट चालू करो|परीक्षा शुरू|टेस्ट शुरू)$/i.test(t) ||
    /^(?:pariksha shuru karo|test shuru karo|exam start karo|test start karo|test start करो|exam start करो)$/i.test(t)
  ) {
    return { type: 'START_EXAM', detectedLanguage: lang };
  }

  // 3. Exam Controls: Mark for Review / Flag Question
  if (
    /^(?:mark for review|flag question|flag for review|flag|review question|review this question|review)$/i.test(t) ||
    /^(?:समीक्षा के लिए चिन्हित करो|समीक्षा के लिए चिह्नित करो|समीक्षा के लिए मार्क करो|चिन्हित करो|चिह्नित करो|फ्लैग करो|समीक्षा)$/i.test(t) ||
    /^(?:samiksha ke liye chinhit karo|flag karo|chinhit karo)$/i.test(t)
  ) {
    return { type: 'FLAG_QUESTION', detectedLanguage: lang };
  }

  // 4. Two-Step Submission Controls (Strict command matching - never accidental from answers)
  if (
    /^(?:submit exam|submit test|finish exam|finish test|end exam|end test|submit)$/i.test(t) ||
    /^(?:परीक्षा जमा करो|परीक्षा खत्म करो|परीक्षा समाप्त करो|टेस्ट जमा करो|सबमिट करो|परीक्षा सबमिट करो|टेस्ट सबमिट करो|परीक्षा सबमिट|सबमिट)$/i.test(t) ||
    /^(?:परीक्षा submit करो|टेस्ट submit करो|exam submit करो|submit परीक्षा|submit pariksha)$/i.test(t) ||
    /^(?:pariksha jama karo|pariksha submit karo|submit karo|test submit karo|jama karo)$/i.test(t)
  ) {
    return { type: 'SUBMIT', detectedLanguage: lang };
  }

  // 5. Submit Confirmation Dialog Responses (active only during pending confirmation)
  if (context?.isPendingConfirmation) {
    if (/^(?:yes|yeah|sure|confirm|yep|ok|okay|haan|ha|हाँ|हा|पुष्टि|पुष्टि करो|हाँ जमा करो)$/i.test(t)) {
      return { type: 'YES', detectedLanguage: lang };
    }
    if (/^(?:no|cancel|stop|nope|nahi|nahin|don t submit|dont submit|नहीं|ना|रद्द|रद्द करो|मत करो|रोको)$/i.test(t)) {
      return { type: 'NO', detectedLanguage: lang };
    }
  }

  // 6. Navigation Controls
  if (
    /^(?:next|next question|go next|forward|next one)$/i.test(t) ||
    /^(?:अगला|अगला सवाल|अगला प्रश्न|आगे|आगे बढ़ो|अगला वाला)$/i.test(t) ||
    /^(?:agla|agla sawal|agla prashna|aage|aage badho)$/i.test(t) ||
    /^(?:अगला question|next सवाल|next प्रश्न|नेक्स्ट|नेक्स्ट सवाल|नेक्स्ट क्वेश्चन)$/i.test(t)
  ) {
    return { type: 'NEXT', detectedLanguage: lang };
  }

  if (
    /^(?:previous|previous question|go back|back|previous one)$/i.test(t) ||
    /^(?:पिछला|पिछला सवाल|पिछला प्रश्न|पीछे|वापस|पिछला वाला)$/i.test(t) ||
    /^(?:pichhla|pichla|pichla sawal|pichhla prashna|peeche|wapas)$/i.test(t) ||
    /^(?:पिछला question|previous सवाल|प्रीवियस|प्रीवियस सवाल)$/i.test(t)
  ) {
    return { type: 'PREVIOUS', detectedLanguage: lang };
  }

  // Jump to Question (e.g. "go to question 5", "question 5", "सवाल 5", "प्रश्न 5 पर जाओ")
  const gotoMatch = t.match(/^(?:go to |goto |jump to )?(?:question|prashna|sawal|सवाल|प्रश्न)\s*(\d+)$/i) ||
                    t.match(/^(?:सवाल|प्रश्न|question)\s*(\d+)\s*(?:पर जाओ|par jao)?$/i) ||
                    t.match(/^(?:नंबर|number)\s*(\d+)$/i);
  if (gotoMatch && gotoMatch[1]) {
    const qNum = parseInt(gotoMatch[1], 10);
    if (!isNaN(qNum) && qNum > 0) {
      return { type: 'GOTO', questionNumber: qNum, detectedLanguage: lang };
    }
  }

  // 7. Reading Controls
  if (
    /^(?:read everything|read all|read full question|read entire question)$/i.test(t) ||
    /^(?:सब पढ़ो|सब कुछ पढ़ो|पूरा पढ़ो|पूरा सवाल पढ़ो)$/i.test(t) ||
    /^(?:sab padho|sab kuch padho|poora padho)$/i.test(t)
  ) {
    return { type: 'READ_ALL', detectedLanguage: lang };
  }

  if (
    /^(?:read question|read the question|what is the question|question please)$/i.test(t) ||
    /^(?:सवाल पढ़ो|प्रश्न पढ़ो|सवाल क्या है|प्रश्न क्या है)$/i.test(t) ||
    /^(?:sawal padho|prashna padho|question padho|क्वेश्चन पढ़ो)$/i.test(t)
  ) {
    return { type: 'READ_QUESTION', detectedLanguage: lang };
  }

  if (
    /^(?:read options|read the options|what are the options|options please)$/i.test(t) ||
    /^(?:विकल्प पढ़ो|ऑप्शन पढ़ो|विकल्प क्या हैं|ऑप्शन क्या हैं)$/i.test(t) ||
    /^(?:vikalp padho|options padho|option padho)$/i.test(t)
  ) {
    return { type: 'READ_OPTIONS', detectedLanguage: lang };
  }

  if (
    /^(?:repeat|repeat question|read again|say again)$/i.test(t) ||
    /^(?:दोबारा पढ़ो|फिर से बोलो|फिर से पढ़ो|दोहराओ)$/i.test(t) ||
    /^(?:dohrao|dobara padho|phir se bolo)$/i.test(t)
  ) {
    return { type: 'REPEAT', detectedLanguage: lang };
  }

  // 8. Time Inquiry
  if (
    /^(?:time|time left|time remaining|how much time is left|how much time is remaining|remaining time|how much time left|how much time remaining|what is the time left)$/i.test(t) ||
    /^(?:कितना समय बचा है|कितना समय बाकी है|समय कितना बचा है|समय|कितना टाइम बचा है|टाइम कितना बचा है)$/i.test(t) ||
    /^(?:kitna samay bacha hai|kitna samay baaki hai|samay|time left|time remaining|kitna time bacha hai)$/i.test(t)
  ) {
    return { type: 'TIME_LEFT', detectedLanguage: lang };
  }

  // =========================================================================
  // 9. QUESTION-TYPE AWARE ANSWER PROCESSING
  // =========================================================================

  // --- A. TRUE / FALSE QUESTION ---
  if (qType === 'true-false') {
    const isTrue = 
      /^(?:(?:the |my )?answer is |option |select |choose |mark )?(?:true|correct|right)(?: answer)?$/i.test(t) ||
      /^(?:(?:the |my )?answer is |option |select |choose |mark )?yes$/i.test(t) ||
      /^(?:(?:मेरा |यह )?उत्तर |जवाब )?(?:सही|सत्य|हाँ)(?: है)?$/i.test(t) ||
      /^(?:विकल्प |ऑप्शन )?(?:सही|सत्य|हाँ)$/i.test(t) ||
      /^(?:सही उत्तर|सत्य उत्तर)$/i.test(t) ||
      /^(?:true|yes|sahi|satya|haan|ha|सही|सत्य|हाँ)$/i.test(t);

    const isFalse = 
      /^(?:(?:the |my )?answer is |option |select |choose |mark )?(?:false|incorrect|wrong)(?: answer)?$/i.test(t) ||
      /^(?:(?:the |my )?answer is |option |select |choose |mark )?no$/i.test(t) ||
      /^(?:(?:मेरा |यह )?उत्तर |जवाब )?(?:गलत|असत्य|नहीं)(?: है)?$/i.test(t) ||
      /^(?:विकल्प |ऑप्शन )?(?:गलत|असत्य|नहीं)$/i.test(t) ||
      /^(?:गलत उत्तर|असत्य उत्तर)$/i.test(t) ||
      /^(?:false|no|galat|asatya|nahi|nahin|गलत|असत्य|नहीं)$/i.test(t);

    if (isTrue) {
      return { type: 'TRUE_FALSE', value: true, rawText: transcript, detectedLanguage: lang };
    }
    if (isFalse) {
      return { type: 'TRUE_FALSE', value: false, rawText: transcript, detectedLanguage: lang };
    }

    // Support visual option letter badges T (True) and F (False)
    if (/^(?:option |vikalp |विकल्प |ऑप्शन )?(?:t|टी)$/i.test(t)) {
      return { type: 'TRUE_FALSE', value: true, rawText: transcript, detectedLanguage: lang };
    }
    if (/^(?:option |vikalp |विकल्प |ऑप्शन )?(?:f|एफ़|एफ)$/i.test(t)) {
      return { type: 'TRUE_FALSE', value: false, rawText: transcript, detectedLanguage: lang };
    }

    return { type: 'UNKNOWN', rawText: transcript, detectedLanguage: lang };
  }

  // --- B. SHORT ANSWER & FILL IN THE BLANK QUESTIONS ---
  if (qType === 'short-answer' || qType === 'fill-blank') {
    const cleaned = cleanTextAnswer(transcript);
    if (cleaned.length > 0) {
      return { type: 'TEXT_ANSWER', text: cleaned, rawText: transcript, detectedLanguage: lang };
    }
    return { type: 'UNKNOWN', rawText: transcript, detectedLanguage: lang };
  }

  // --- C. MULTIPLE CHOICE QUESTION ---
  if (qType === 'multiple-choice') {
    const mcIndices = parseMultipleChoiceOptions(t);
    if (mcIndices && mcIndices.length > 1) {
      return { type: 'SELECT_MULTIPLE_OPTIONS', letterIndices: mcIndices, rawText: transcript, detectedLanguage: lang };
    }
    if (mcIndices && mcIndices.length === 1) {
      return { type: 'SELECT_OPTION', letterIndex: mcIndices[0], rawText: transcript, detectedLanguage: lang };
    }
    // Fall through to standard single option matching if no multi-tokens found
  }

  // --- D. SINGLE CHOICE (or MULTIPLE CHOICE single option fallback) ---
  // Option A (Index 0)
  if (
    /^(?:select |choose |mark |answer )?(?:option |vikalp |विकल्प |ऑप्शन )?(?:a|1|one|पहला|पहला विकल्प|ए)$/i.test(t) ||
    /^(?:option|vikalp|विकल्प|ऑप्शन)\s+(?:a|1|one|पहला|ए)$/i.test(t) ||
    /^(?:ए चुनो|ए विकल्प|पहला चुनो|mark a|choose a|select a)$/i.test(t) ||
    t === 'a' || t === '1' || t === 'ए' || t === 'पहला' || t === 'pehla'
  ) {
    return { type: 'SELECT_OPTION', letterIndex: 0, rawText: transcript, detectedLanguage: lang };
  }

  // Option B (Index 1)
  if (
    /^(?:select |choose |mark |answer )?(?:option |vikalp |विकल्प |ऑप्शन )?(?:b|2|two|दो|दूसरा|दूसरा विकल्प|बी|bee)$/i.test(t) ||
    /^(?:option|vikalp|विकल्प|ऑप्शन)\s+(?:b|2|two|दो|दूसरा|बी)$/i.test(t) ||
    /^(?:बी चुनो|बी विकल्प|दूसरा चुनो|mark b|choose b|select b)$/i.test(t) ||
    t === 'b' || t === '2' || t === 'बी' || t === 'दूसरा' || t === 'doosra' || t === 'dusra'
  ) {
    return { type: 'SELECT_OPTION', letterIndex: 1, rawText: transcript, detectedLanguage: lang };
  }

  // Option C (Index 2)
  if (
    /^(?:select |choose |mark |answer )?(?:option |vikalp |विकल्प |ऑप्शन )?(?:c|3|three|तीन|तीसरा|तीसरा विकल्प|सी|see|sea)$/i.test(t) ||
    /^(?:option|vikalp|विकल्प|ऑप्शन)\s+(?:c|3|three|तीन|तीसरा|सी)$/i.test(t) ||
    /^(?:सी चुनो|सी विकल्प|तीसरा चुनो|mark c|choose c|select c)$/i.test(t) ||
    t === 'c' || t === '3' || t === 'सी' || t === 'तीसरा' || t === 'teesra' || t === 'tisra'
  ) {
    return { type: 'SELECT_OPTION', letterIndex: 2, rawText: transcript, detectedLanguage: lang };
  }

  // Option D (Index 3)
  if (
    /^(?:select |choose |mark |answer )?(?:option |vikalp |विकल्प |ऑप्शन )?(?:d|4|four|चार|चौथा|चौथा विकल्प|डी|dee)$/i.test(t) ||
    /^(?:option|vikalp|विकल्प|ऑप्शन)\s+(?:d|4|four|चार|चौथा|डी)$/i.test(t) ||
    /^(?:डी चुनो|डी विकल्प|चौथा चुनो|mark d|choose d|select d)$/i.test(t) ||
    t === 'd' || t === '4' || t === 'डी' || t === 'चौथा' || t === 'chautha'
  ) {
    return { type: 'SELECT_OPTION', letterIndex: 3, rawText: transcript, detectedLanguage: lang };
  }

  // Fallback for True/False if context wasn't explicitly supplied
  if (!qType) {
    if (/^(?:true|yes|sahi|satya|हाँ|सही|सत्य)$/i.test(t)) {
      return { type: 'TRUE_FALSE', value: true, rawText: transcript, detectedLanguage: lang };
    }
    if (/^(?:false|no|galat|asatya|नहीं|गलत|असत्य)$/i.test(t)) {
      return { type: 'TRUE_FALSE', value: false, rawText: transcript, detectedLanguage: lang };
    }
  }

  return { type: 'UNKNOWN', rawText: transcript, detectedLanguage: lang };
}
