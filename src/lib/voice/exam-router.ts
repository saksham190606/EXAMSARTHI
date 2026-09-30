/**
 * EXAMSARTHI — Intelligent Fuzzy Voice Router for Exam Hub & Selection
 * 
 * Maps partial, acronym, English, Hindi, and compound speech phrases
 * directly to target mock examinations and practice sets for instant hands-free launching.
 */

export interface ExamVoiceRoute {
  id: string;
  param: string;
  title: string;
  authority: string;
  keywords: string[];
}

export const EXAM_VOICE_ROUTES: ExamVoiceRoute[] = [
  {
    id: 'ssc-cgl',
    param: 'cgl-mock-1',
    title: 'SSC CGL Tier-I Full Mock',
    authority: 'Staff Selection Commission',
    keywords: [
      "ssc", 
      "cgl", 
      "ssc cgl", 
      "tier 1", 
      "tier one", 
      "staff selection", 
      "एसएससी", 
      "सीजीएल", 
      "एसएससी सीजीएल",
      "स्टाफ सिलेक्शन"
    ],
  },
  {
    id: 'upsc-prelims',
    param: 'upsc-mock-1',
    title: 'UPSC CSE Prelims General Studies',
    authority: 'Union Public Service Commission',
    keywords: [
      "upsc", 
      "cse", 
      "prelims", 
      "general studies", 
      "civil services", 
      "ias", 
      "csat",
      "यूपीएससी", 
      "प्रीलिम्स", 
      "सिविल सर्विसेज",
      "आईएएस",
      "सीसैट"
    ],
  },
  {
    id: 'ibps-po',
    param: 'ibps-mock-1',
    title: 'IBPS PO Prelims Speed Mock',
    authority: 'Institute of Banking Personnel Selection',
    keywords: [
      "ibps", 
      "po", 
      "ibps po", 
      "banking", 
      "bank po", 
      "bank ipo",
      "bank",
      "ipo",
      "bank exam",
      "banking prelims",
      "sbi",
      "sbi po",
      "आईबीपीएस", 
      "पीओ", 
      "बैंक",
      "बैंक पीओ",
      "बैंक आईपीओ",
      "बैंक परीक्षा"
    ],
  },
  {
    id: 'rrb-ntpc',
    param: 'rrb-mock-1',
    title: 'RRB NTPC Stage-I CBT',
    authority: 'Railway Recruitment Board',
    keywords: [
      "rrb", 
      "ntpc", 
      "railway", 
      "railways", 
      "railway exam",
      "stage 1", 
      "आरआरबी", 
      "एनटीपीसी", 
      "रेलवे",
      "रेलवे परीक्षा"
    ],
  },
  {
    id: 'ugc-net',
    param: 'ugc-mock-1',
    title: 'UGC NET Paper 1 Mock',
    authority: 'University Grants Commission (NTA)',
    keywords: [
      "ugc", 
      "ugc net", 
      "net", 
      "net exam", 
      "ugc mock", 
      "ugc test", 
      "national eligibility test", 
      "teaching aptitude", 
      "यूजीसी", 
      "नेट", 
      "यूजीसी नेट", 
      "नेट परीक्षा"
    ],
  },
  {
    id: 'vision-ai-diagram',
    param: 'p6',
    title: 'Diagram & Visual Interpretation (Vision AI)',
    authority: 'Multimodal Assistive Scribe Test',
    keywords: [
      "vision", 
      "diagram", 
      "vision ai", 
      "visual", 
      "scribe", 
      "multimodal", 
      "diagram exam",
      "डायग्राम", 
      "विज़न",
      "चित्र"
    ],
  },
  {
    id: 'practice-quant',
    param: 'p1',
    title: 'Percentages, Ratios & Arithmetic (Quantitative Aptitude)',
    authority: 'Practice Set',
    keywords: [
      "math",
      "maths",
      "mathematics",
      "quant",
      "quantitative",
      "quantitative aptitude",
      "arithmetic",
      "percentages",
      "ratios",
      "percentage",
      "ratio",
      "गणित",
      "मैथ्स",
      "मैथ",
      "क्वांट",
      "अंकगणित",
      "प्रतिशत"
    ],
  },
  {
    id: 'practice-gk',
    param: 'p2',
    title: 'General Knowledge & Geography',
    authority: 'Practice Set',
    keywords: [
      "gk",
      "general knowledge",
      "geography",
      "constitution",
      "general awareness",
      "gk practice",
      "geography practice",
      "सामान्य ज्ञान",
      "भूगोल",
      "जीके",
      "सामान्य अध्ययन"
    ],
  },
  {
    id: 'practice-reasoning',
    param: 'p3',
    title: 'Logical Reasoning & Coding',
    authority: 'Practice Set',
    keywords: [
      "reasoning",
      "logical reasoning",
      "logic",
      "coding",
      "deduction",
      "mental ability",
      "रीजनिंग",
      "तर्कशक्ति",
      "तर्क",
      "लॉजिक"
    ],
  },
  {
    id: 'practice-english',
    param: 'p4',
    title: 'English Grammar & Comprehension',
    authority: 'Practice Set',
    keywords: [
      "english",
      "grammar",
      "comprehension",
      "vocabulary",
      "verbal",
      "english practice",
      "अंग्रेजी",
      "अंग्रेज़ी",
      "व्याकरण",
      "इंग्लिश"
    ],
  },
  {
    id: 'practice-showcase',
    param: 'p5',
    title: 'Accessible Multi-Format Showcase',
    authority: 'Practice Set',
    keywords: [
      "showcase",
      "multi format",
      "multi-format",
      "multi format showcase",
      "accessible showcase",
      "मल्टी फॉर्मेट",
      "मल्टी"
    ],
  },
];

/**
 * Strips conversational filler and action verbs (e.g., "open", "start", "take", "practice", "exam")
 * so the core topic / subject is highlighted.
 */
function cleanActionWords(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\b(open|start|begin|take|launch|go to|show|run|play|खोलो|खोलें|शुरू करो|शुरू करें|चलाओ|दिखाओ)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Robust Partial / Fuzzy Matching Algorithm
 * Maps user speech to either a Mock Examination or a Practice Set.
 */
export function matchExamVoiceRoute(transcript: string): ExamVoiceRoute | null {
  if (!transcript) return null;

  const rawClean = transcript
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");

  const clean = rawClean.replace(/\s+/g, " ").trim();
  if (!clean) return null;

  const stripped = cleanActionWords(clean);
  const targetText = stripped || clean;
  const tokens = targetText.split(/\s+/).filter(Boolean);
  const rawTokens = clean.split(/\s+/).filter(Boolean);

  // 1. Priority A: Multi-word phrase matches (longest phrase first)
  for (const exam of EXAM_VOICE_ROUTES) {
    const multiWordKeywords = exam.keywords
      .filter((k) => k.includes(' '))
      .sort((a, b) => b.length - a.length);

    for (const kw of multiWordKeywords) {
      if (clean.includes(kw) || targetText.includes(kw)) {
        return exam;
      }
    }
  }

  // 2. Priority B: Highly specific distinct acronyms and subject tokens

  // Quantitative Aptitude / Math (p1)
  if (
    tokens.some(t => ['math', 'maths', 'quant', 'arithmetic', 'percentages', 'ratios', 'गणित', 'मैथ्स', 'मैथ', 'क्वांट'].includes(t)) ||
    targetText.includes('quantitative') ||
    clean.includes('math practice') ||
    clean.includes('quant practice') ||
    clean.includes('गणित')
  ) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'practice-quant') || null;
  }

  // Logical Reasoning & Coding (p3)
  if (
    tokens.some(t => ['reasoning', 'logic', 'रीजनिंग', 'तर्कशक्ति', 'तर्क'].includes(t)) ||
    clean.includes('logical reasoning') ||
    clean.includes('reasoning practice')
  ) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'practice-reasoning') || null;
  }

  // English Grammar & Comprehension (p4)
  if (
    tokens.some(t => ['grammar', 'comprehension', 'vocabulary', 'अंग्रेजी', 'व्याकरण', 'इंग्लिश'].includes(t)) ||
    (tokens.includes('english') && (clean.includes('practice') || clean.includes('exam') || clean.includes('test') || clean.includes('open') || clean.includes('start'))) ||
    clean.includes('english practice')
  ) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'practice-english') || null;
  }

  // General Knowledge & Geography (p2)
  if (
    tokens.some(t => ['gk', 'geography', 'constitution', 'सामान्य ज्ञान', 'भूगोल', 'जीके'].includes(t)) ||
    clean.includes('general knowledge') ||
    clean.includes('gk practice') ||
    clean.includes('geography practice')
  ) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'practice-gk') || null;
  }

  // Multi-Format Showcase (p5)
  if (
    clean.includes('showcase') ||
    clean.includes('multi format') ||
    clean.includes('मल्टी फॉर्मेट')
  ) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'practice-showcase') || null;
  }

  // Vision AI / Diagram (p6)
  if (
    tokens.some(t => ['vision', 'diagram', 'visual', 'scribe', 'multimodal', 'डायग्राम', 'विज़न', 'चित्र'].includes(t)) ||
    clean.includes('vision ai')
  ) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'vision-ai-diagram') || null;
  }

  // SSC CGL (cgl-mock-1)
  if (
    rawTokens.includes('cgl') || 
    clean.includes('सीजीएल') || 
    clean.includes('ssc cgl') ||
    clean.includes('staff selection') ||
    rawTokens.includes('ssc') || 
    clean.includes('एसएससी')
  ) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'ssc-cgl') || null;
  }

  // UPSC CSE Prelims (upsc-mock-1)
  if (
    rawTokens.includes('upsc') || 
    clean.includes('यूपीएससी') || 
    rawTokens.includes('cse') || 
    clean.includes('ias') || 
    rawTokens.includes('prelims') || 
    rawTokens.includes('csat') ||
    clean.includes('प्रीलिम्स') ||
    clean.includes('civil services') ||
    clean.includes('सिविल सर्विसेज')
  ) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'upsc-prelims') || null;
  }

  // IBPS PO / Banking Prelims (ibps-mock-1)
  if (
    rawTokens.includes('ibps') || 
    clean.includes('आईबीपीएस') || 
    rawTokens.includes('po') || 
    clean.includes('पीओ') || 
    clean.includes('banking') || 
    clean.includes('bank po') ||
    clean.includes('bank ipo') ||
    clean.includes('bank exam') ||
    rawTokens.includes('bank') ||
    clean.includes('बैंक')
  ) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'ibps-po') || null;
  }

  // RRB NTPC / Railway (rrb-mock-1)
  if (
    rawTokens.includes('rrb') || 
    clean.includes('आरआरबी') || 
    rawTokens.includes('ntpc') || 
    clean.includes('एनटीपीसी') || 
    clean.includes('railway') || 
    clean.includes('railways') || 
    clean.includes('रेलवे')
  ) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'rrb-ntpc') || null;
  }

  // UGC NET (ugc-mock-1)
  if (
    rawTokens.includes('ugc') || 
    clean.includes('यूजीसी') || 
    rawTokens.includes('net') || 
    clean.includes('नेट') || 
    clean.includes('ugc net') || 
    clean.includes('national eligibility test') || 
    clean.includes('teaching aptitude')
  ) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'ugc-net') || null;
  }

  // 3. Priority C: Token inclusion across all defined keywords
  for (const exam of EXAM_VOICE_ROUTES) {
    for (const kw of exam.keywords) {
      if (rawTokens.includes(kw) || clean.includes(kw) || targetText.includes(kw)) {
        return exam;
      }
    }
  }

  return null;
}

/**
 * Clean token matching strictly aligning with user-specified keywords
 * for both Full Mock Exams and Subject Practice Sets.
 */
export function matchExamTokens(transcript: string): { route: ExamVoiceRoute; examName: string } | null {
  if (!transcript) return null;
  const lower = transcript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ").replace(/\s+/g, " ").trim();

  // Disambiguate banking prelims before generic prelims
  if (lower.includes('banking prelims') || lower.includes('bank prelims') || lower.includes('bank po') || lower.includes('bank ipo')) {
    const route = EXAM_VOICE_ROUTES.find((r) => r.id === 'ibps-po') || EXAM_VOICE_ROUTES[2];
    return { route, examName: "IBPS Bank PO" };
  }

  // 1. UPSC CSE Prelims
  const upscTokens = ["upsc", "cse", "civil services", "ias", "csat", "यूपीएससी", "सिविल सर्विसेज", "आईएएस", "सीसैट"];
  if (upscTokens.some((t) => lower === t || lower.includes(t)) || (lower.includes('prelims') && !lower.includes('bank'))) {
    const route = EXAM_VOICE_ROUTES.find((r) => r.id === 'upsc-prelims') || EXAM_VOICE_ROUTES[1];
    return { route, examName: "UPSC Prelims" };
  }

  // 2. SSC CGL Mock
  const sscTokens = ["cgl", "ssc cgl", "ssc", "tier 1", "tier one", "staff selection", "सीजीएल", "एसएससी", "स्टाफ सिलेक्शन"];
  if (sscTokens.some((t) => lower === t || lower.includes(t))) {
    const route = EXAM_VOICE_ROUTES.find((r) => r.id === 'ssc-cgl') || EXAM_VOICE_ROUTES[0];
    return { route, examName: "SSC CGL" };
  }

  // 3. IBPS PO / Banking Prelims
  const ibpsTokens = [
    "bank exam", "banking", "ibps", "bank", "ipo", "po", "sbi po", "sbi",
    "आईबीपीएस", "बैंक पीओ", "बैंक आईपीओ", "बैंक", "पीओ", "बैंक परीक्षा"
  ];
  if (ibpsTokens.some((t) => lower === t || lower.includes(t))) {
    const route = EXAM_VOICE_ROUTES.find((r) => r.id === 'ibps-po') || EXAM_VOICE_ROUTES[2];
    return { route, examName: "IBPS Bank PO" };
  }

  // 4. RRB NTPC / Railway
  const rrbTokens = ["rrb ntpc", "rrb", "ntpc", "railway", "railways", "railway exam", "stage 1", "आरआरबी", "एनटीपीसी", "रेलवे", "रेलवे परीक्षा"];
  if (rrbTokens.some((t) => lower === t || lower.includes(t))) {
    const route = EXAM_VOICE_ROUTES.find((r) => r.id === 'rrb-ntpc') || EXAM_VOICE_ROUTES[3];
    return { route, examName: "Railway RRB" };
  }

  // 5. UGC NET Mock
  const ugcTokens = ["ugc net", "ugc", "net exam", "net", "ugc mock", "national eligibility test", "teaching aptitude", "यूजीसी", "नेट", "यूजीसी नेट", "नेट परीक्षा"];
  if (ugcTokens.some((t) => lower === t || lower.includes(t))) {
    const route = EXAM_VOICE_ROUTES.find((r) => r.id === 'ugc-net') || EXAM_VOICE_ROUTES[4];
    return { route, examName: "UGC NET Mock" };
  }

  // 6. Vision AI Diagram
  const visionTokens = ["vision ai", "vision", "diagram exam", "diagram", "visual", "scribe", "multimodal", "डायग्राम", "विज़न", "चित्र"];
  if (visionTokens.some((t) => lower === t || lower.includes(t))) {
    const route = EXAM_VOICE_ROUTES.find((r) => r.id === 'vision-ai-diagram') || EXAM_VOICE_ROUTES[5];
    return { route, examName: "Vision AI Diagram" };
  }

  // 6. Quantitative Aptitude / Math Practice (p1)
  const quantTokens = [
    "quantitative aptitude", "quantitative", "quant", "arithmetic", "percentages", "ratios", "percentage", "ratio",
    "maths practice", "math practice", "maths", "math", "mathematics",
    "गणित", "मैथ्स", "मैथ", "क्वांट", "अंकगणित", "प्रतिशत"
  ];
  if (quantTokens.some((t) => lower === t || lower.includes(t))) {
    const route = EXAM_VOICE_ROUTES.find((r) => r.id === 'practice-quant') || EXAM_VOICE_ROUTES[5];
    return { route, examName: "Quantitative Aptitude" };
  }

  // 7. General Knowledge & Geography Practice (p2)
  const gkTokens = [
    "general knowledge", "geography practice", "geography", "gk practice", "gk", "constitution",
    "सामान्य ज्ञान", "भूगोल", "जीके", "सामान्य अध्ययन"
  ];
  if (gkTokens.some((t) => lower === t || lower.includes(t))) {
    const route = EXAM_VOICE_ROUTES.find((r) => r.id === 'practice-gk') || EXAM_VOICE_ROUTES[6];
    return { route, examName: "General Knowledge & Geography" };
  }

  // 8. Logical Reasoning Practice (p3)
  const reasoningTokens = [
    "logical reasoning", "reasoning practice", "reasoning", "logic", "coding practice", "coding", "deduction",
    "रीजनिंग", "तर्कशक्ति", "तर्क", "लॉजिक"
  ];
  if (reasoningTokens.some((t) => lower === t || lower.includes(t))) {
    const route = EXAM_VOICE_ROUTES.find((r) => r.id === 'practice-reasoning') || EXAM_VOICE_ROUTES[7];
    return { route, examName: "Logical Reasoning" };
  }

  // 9. English Practice (p4)
  const englishTokens = [
    "english practice", "english grammar", "english", "grammar", "comprehension", "vocabulary",
    "अंग्रेजी", "अंग्रेज़ी", "व्याकरण", "इंग्लिश"
  ];
  if (englishTokens.some((t) => lower === t || lower.includes(t))) {
    const route = EXAM_VOICE_ROUTES.find((r) => r.id === 'practice-english') || EXAM_VOICE_ROUTES[8];
    return { route, examName: "English Grammar & Comprehension" };
  }

  // 10. Multi-Format Showcase (p5)
  const showcaseTokens = ["multi format showcase", "multi-format", "multi format", "showcase", "मल्टी फॉर्मेट", "मल्टी"];
  if (showcaseTokens.some((t) => lower === t || lower.includes(t))) {
    const route = EXAM_VOICE_ROUTES.find((r) => r.id === 'practice-showcase') || EXAM_VOICE_ROUTES[9];
    return { route, examName: "Multi-Format Showcase" };
  }

  return null;
}
