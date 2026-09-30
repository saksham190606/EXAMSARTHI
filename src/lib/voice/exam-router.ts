/**
 * EXAMSARTHI — Intelligent Fuzzy Voice Router for Exam Hub & Selection
 * 
 * Maps partial, acronym, English, Hindi, and compound speech phrases
 * directly to target mock examinations for instant hands-free launching.
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
      "एसएससी सीजीएल"
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
      "यूपीएससी", 
      "प्रीलिम्स", 
      "सिविल सर्विसेज"
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
      "आईबीपीएस", 
      "पीओ", 
      "बैंक",
      "बैंक पीओ",
      "बैंक आईपीओ"
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
      "stage 1", 
      "आरआरबी", 
      "एनटीपीसी", 
      "रेलवे"
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
      "डायग्राम", 
      "विज़न"
    ],
  },
];

/**
 * Robust Partial / Fuzzy Matching Algorithm
 * Prioritizes:
 * 1. Compound phrases ("ssc cgl", "ibps po", "vision ai", "railway")
 * 2. High-specificity acronym tokens (e.g. "cgl" -> SSC CGL, "upsc" -> UPSC CSE)
 * 3. Individual token inclusion across all multilingual keywords
 */
export function matchExamVoiceRoute(transcript: string): ExamVoiceRoute | null {
  if (!transcript) return null;

  // Normalize: lowercase, trim, strip punctuation
  const clean = transcript
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");

  if (!clean) return null;

  const tokens = clean.split(/\s+/).filter(Boolean);

  // 1. Priority A: Exact / Compound multi-word phrase match (longer phrases matched first)
  for (const exam of EXAM_VOICE_ROUTES) {
    const multiWordKeywords = exam.keywords
      .filter((k) => k.includes(' '))
      .sort((a, b) => b.length - a.length);

    for (const kw of multiWordKeywords) {
      if (clean.includes(kw)) {
        return exam;
      }
    }
  }

  // 2. Priority B: Highly specific distinct acronyms (resolves combined phrases like "UPSC CGL")
  // "cgl" uniquely identifies SSC CGL
  if (tokens.includes('cgl') || clean.includes('सीजीएल')) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'ssc-cgl') || null;
  }

  // "ntpc" uniquely identifies RRB NTPC
  if (tokens.includes('ntpc') || clean.includes('एनटीपीसी')) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'rrb-ntpc') || null;
  }

  // "cse" or "prelims" or "ias" uniquely identifies UPSC CSE
  if (
    tokens.includes('cse') || 
    clean.includes('ias') || 
    tokens.includes('prelims') || 
    clean.includes('प्रीलिम्स') ||
    clean.includes('civil services') ||
    clean.includes('सिविल सर्विसेज')
  ) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'upsc-prelims') || null;
  }

  // "upsc"
  if (tokens.includes('upsc') || clean.includes('यूपीएससी')) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'upsc-prelims') || null;
  }

  // "ibps" or "po" or "bank po"
  if (
    tokens.includes('ibps') || 
    clean.includes('आईबीपीएस') || 
    tokens.includes('po') || 
    clean.includes('पीओ') || 
    clean.includes('banking') || 
    clean.includes('bank po')
  ) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'ibps-po') || null;
  }

  // "vision", "diagram", "scribe", "multimodal"
  if (
    tokens.includes('vision') || 
    clean.includes('विज़न') || 
    tokens.includes('diagram') || 
    clean.includes('डायग्राम') || 
    tokens.includes('scribe') || 
    tokens.includes('multimodal')
  ) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'vision-ai-diagram') || null;
  }

  // "rrb", "railway", "railways"
  if (
    tokens.includes('rrb') || 
    clean.includes('आरआरबी') || 
    clean.includes('railway') || 
    clean.includes('railways') || 
    clean.includes('रेलवे')
  ) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'rrb-ntpc') || null;
  }

  // "ssc", "staff selection"
  if (tokens.includes('ssc') || clean.includes('एसएससी') || clean.includes('staff selection')) {
    return EXAM_VOICE_ROUTES.find((e) => e.id === 'ssc-cgl') || null;
  }

  // 3. Priority C: Token inclusion across all defined keywords
  for (const exam of EXAM_VOICE_ROUTES) {
    for (const kw of exam.keywords) {
      if (tokens.includes(kw) || clean.includes(kw)) {
        return exam;
      }
    }
  }

  return null;
}

/**
 * Clean token matching strictly aligning with user-specified keywords:
 * - SSC CGL: ["cgl", "ssc", "tier 1", "staff selection", "सीजीएल", "एसएससी"]
 * - UPSC CSE: ["upsc", "cse", "prelims", "civil services", "ias", "यूपीएससी", "प्रीलिम्स"]
 * - IBPS PO: ["ibps", "po", "banking", "bank", "आईबीपीएस", "पीओ", "बैंक"]
 * - RRB NTPC: ["rrb", "ntpc", "railway", "railways", "stage 1", "आरआरबी", "एनटीपीसी", "रेलवे"]
 * - VISION AI (Assistive Test): ["vision", "diagram", "visual", "scribe", "multimodal", "डायग्राम", "विज़न"]
 */
export function matchExamTokens(transcript: string): { route: ExamVoiceRoute; examName: string } | null {
  if (!transcript) return null;
  const lower = transcript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();

  // 1. UPSC CSE: ["upsc", "cse", "prelims", "civil services", "ias", "यूपीएससी", "प्रीलिम्स", "सिविल सर्विसेज"]
  const upscTokens = ["upsc", "cse", "prelims", "civil services", "ias", "यूपीएससी", "प्रीलिम्स", "सिविल सर्विसेज"];
  if (upscTokens.some((t) => lower === t || lower.includes(t))) {
    const route = EXAM_VOICE_ROUTES.find((r) => r.id === 'upsc-prelims') || EXAM_VOICE_ROUTES[1];
    return { route, examName: "UPSC Prelims" };
  }

  // 2. SSC CGL: ["cgl", "ssc cgl", "ssc", "tier 1", "staff selection", "सीजीएल", "एसएससी"]
  const sscTokens = ["cgl", "ssc cgl", "ssc", "tier 1", "staff selection", "सीजीएल", "एसएससी"];
  if (sscTokens.some((t) => lower === t || lower.includes(t))) {
    const route = EXAM_VOICE_ROUTES.find((r) => r.id === 'ssc-cgl') || EXAM_VOICE_ROUTES[0];
    return { route, examName: "SSC CGL" };
  }

  // 3. IBPS PO / Bank PO / Bank IPO:
  const ibpsTokens = [
    "bank ipo", "bank po", "ibps po", "bank exam", "banking", "ibps", "bank", "ipo", "po",
    "आईबीपीएस", "बैंक पीओ", "बैंक आईपीओ", "बैंक", "पीओ"
  ];
  if (ibpsTokens.some((t) => lower === t || lower.includes(t))) {
    const route = EXAM_VOICE_ROUTES.find((r) => r.id === 'ibps-po') || EXAM_VOICE_ROUTES[2];
    return { route, examName: "IBPS Bank PO" };
  }

  // 4. RRB NTPC: ["rrb", "ntpc", "railway", "railways", "stage 1", "आरआरबी", "एनटीपीसी", "रेलवे"]
  const rrbTokens = ["rrb", "ntpc", "railway", "railways", "stage 1", "आरआरबी", "एनटीपीसी", "रेलवे"];
  if (rrbTokens.some((t) => lower === t || lower.includes(t))) {
    const route = EXAM_VOICE_ROUTES.find((r) => r.id === 'rrb-ntpc') || EXAM_VOICE_ROUTES[3];
    return { route, examName: "Railway RRB" };
  }

  // 5. VISION AI (Assistive Test): ["vision", "diagram", "visual", "scribe", "multimodal", "डायग्राम", "विज़न"]
  const visionTokens = ["vision", "diagram", "visual", "scribe", "multimodal", "डायग्राम", "विज़न"];
  if (visionTokens.some((t) => lower === t || lower.includes(t))) {
    const route = EXAM_VOICE_ROUTES.find((r) => r.id === 'vision-ai-diagram') || EXAM_VOICE_ROUTES[4];
    return { route, examName: "Vision AI" };
  }

  return null;
}

