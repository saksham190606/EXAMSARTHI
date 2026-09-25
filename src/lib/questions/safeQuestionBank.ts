/**
 * EXAMSARTHI — Candidate-Safe Question Bank
 * 
 * Provides local candidate-safe fallback question sets with strictly ZERO answer keys.
 * Used when offline or if remote Supabase connection is unreachable.
 * Guaranteed to omit correctAnswerId, correctAnswerIds, correctAnswer, and acceptableAnswers.
 */

import { CandidateQuestion } from '@/types/question';

// --- 1. QUANTITATIVE APTITUDE (SAFE) ---
export const SafeQuantitativeQuestions: CandidateQuestion[] = [
  {
    id: "quant-1",
    type: "single-choice",
    text: "If the price of a commodity decreases by 20% and its consumption increases by 25%, what is the net percentage change in expenditure?",
    options: [
      { id: "qo-1", text: "No change (0%)" },
      { id: "qo-2", text: "4% decrease" },
      { id: "qo-3", text: "5% increase" },
      { id: "qo-4", text: "2% decrease" },
    ],
    subject: "Quantitative Aptitude",
    topic: "Percentages",
    difficulty: "Intermediate",
    explanation: "Let initial expenditure be 100. New expenditure = (100 - 20) * (1 + 0.25) = 80 * 1.25 = 100. Net change is 0%.",
  },
  {
    id: "quant-2",
    type: "single-choice",
    text: "A train running at a speed of 72 km/h crosses a 250 m long platform in 20 seconds. What is the length of the train?",
    options: [
      { id: "qo-5", text: "120 metres" },
      { id: "qo-6", text: "150 metres" },
      { id: "qo-7", text: "180 metres" },
      { id: "qo-8", text: "200 metres" },
    ],
    subject: "Quantitative Aptitude",
    topic: "Time and Distance",
    difficulty: "Beginner",
    explanation: "Speed in m/s = 72 * (5/18) = 20 m/s. Total distance = Speed * Time = 20 * 20 = 400 m. Train length = 400 - 250 = 150 metres.",
  },
  {
    id: "quant-3",
    type: "single-choice",
    text: "The ratio of two positive numbers is 3:4 and their HCF is 4. What is their Lowest Common Multiple (LCM)?",
    options: [
      { id: "qo-9", text: "12" },
      { id: "qo-10", text: "24" },
      { id: "qo-11", text: "36" },
      { id: "qo-12", text: "48" },
    ],
    subject: "Quantitative Aptitude",
    topic: "Ratio and Proportion",
    difficulty: "Intermediate",
    explanation: "The numbers are 3 * 4 = 12 and 4 * 4 = 16. LCM(12, 16) = 48.",
  },
  {
    id: "quant-4",
    type: "single-choice",
    text: "A sum of money invested at simple interest amounts to Rs. 815 in 3 years and to Rs. 854 in 4 years. What is the original principal sum?",
    options: [
      { id: "qo-13", text: "Rs. 650" },
      { id: "qo-14", text: "Rs. 690" },
      { id: "qo-15", text: "Rs. 698" },
      { id: "qo-16", text: "Rs. 700" },
    ],
    subject: "Quantitative Aptitude",
    topic: "Simple Interest",
    difficulty: "Advanced",
    explanation: "Simple interest for 1 year = 854 - 815 = Rs. 39. Interest for 3 years = 39 * 3 = Rs. 117. Principal = 815 - 117 = Rs. 698.",
  },
  {
    id: "quant-5",
    type: "multiple-choice",
    text: "Which of the following numbers are prime numbers? (Select all that apply)",
    options: [
      { id: "qo-17", text: "29" },
      { id: "qo-18", text: "33" },
      { id: "qo-19", text: "37" },
      { id: "qo-20", text: "49" },
    ],
    subject: "Quantitative Aptitude",
    topic: "Number Systems",
    difficulty: "Beginner",
    explanation: "29 and 37 are prime numbers as their only divisors are 1 and themselves. 33 is divisible by 3 and 11; 49 is divisible by 7.",
  },
  {
    id: "quant-6",
    type: "multiple-choice",
    text: "Which of the following statements regarding integers and numbers are mathematically correct? (Select all that apply)",
    options: [
      { id: "qo-21", text: "The product of two negative integers is always positive" },
      { id: "qo-22", text: "Every natural number is a whole number" },
      { id: "qo-23", text: "Zero is an odd integer" },
      { id: "qo-24", text: "The sum of any two odd integers is always an even integer" },
    ],
    subject: "Quantitative Aptitude",
    topic: "Number Systems",
    difficulty: "Intermediate",
    explanation: "Product of negative integers is positive. Whole numbers include all natural numbers plus 0. Zero is an even number. Sum of two odd integers is always even.",
  },
  {
    id: "quant-7",
    type: "true-false",
    text: "In standard arithmetic and real analysis, zero (0) is classified as a positive integer.",
    subject: "Quantitative Aptitude",
    topic: "Number Systems",
    difficulty: "Beginner",
    explanation: "False. Zero is neither positive nor negative; it is a sign-neutral integer.",
  },
  {
    id: "quant-8",
    type: "true-false",
    text: "In Euclidean planar geometry, the sum of all three interior angles of any triangle is always strictly equal to 180 degrees.",
    subject: "Quantitative Aptitude",
    topic: "Geometry",
    difficulty: "Beginner",
    explanation: "True. In Euclidean plane geometry, the sum of internal angles of any planar triangle is exactly 180°.",
  },
  {
    id: "quant-9",
    type: "short-answer",
    text: "What is the square root of 625?",
    placeholder: "Enter numerical value",
    subject: "Quantitative Aptitude",
    topic: "Arithmetic",
    difficulty: "Beginner",
    explanation: "25 * 25 = 625. Thus the principal square root is 25.",
  },
  {
    id: "quant-10",
    type: "fill-blank",
    text: "A triangle in which all three sides are of equal length and all interior angles measure 60 degrees is called an ___ triangle.",
    placeholder: "e.g. Equilateral",
    subject: "Quantitative Aptitude",
    topic: "Geometry",
    difficulty: "Beginner",
    explanation: "An equilateral triangle has all three sides congruent and internal angles equal to 60 degrees.",
  },
];

// --- 2. REASONING (SAFE) ---
export const SafeReasoningQuestions: CandidateQuestion[] = [
  {
    id: "reason-1",
    type: "single-choice",
    text: "Select the related word from the given alternatives: Ocean : Water :: Glacier : ?",
    options: [
      { id: "ro-1", text: "Mountain" },
      { id: "ro-2", text: "Ice" },
      { id: "ro-3", text: "Cave" },
      { id: "ro-4", text: "River" },
    ],
    subject: "Reasoning",
    topic: "Analogy",
    difficulty: "Beginner",
    explanation: "As an ocean consists primarily of water, a glacier consists of solid ice.",
  },
  {
    id: "reason-2",
    type: "single-choice",
    text: "Find the missing number in the sequence: 3, 8, 15, 24, 35, ?",
    options: [
      { id: "ro-5", text: "46" },
      { id: "ro-6", text: "48" },
      { id: "ro-7", text: "50" },
      { id: "ro-8", text: "52" },
    ],
    subject: "Reasoning",
    topic: "Series",
    difficulty: "Intermediate",
    explanation: "Pattern is n^2 - 1 for n = 2, 3, 4, 5, 6, 7. For n = 7: 7^2 - 1 = 49 - 1 = 48.",
  },
  {
    id: "reason-3",
    type: "single-choice",
    text: "Pointing to a photograph, a man said, 'I have no brother or sister, but that man's father is my father's son.' Whose photograph was it?",
    options: [
      { id: "ro-9", text: "His own" },
      { id: "ro-10", text: "His son's" },
      { id: "ro-11", text: "His father's" },
      { id: "ro-12", text: "His nephew's" },
    ],
    subject: "Reasoning",
    topic: "Blood Relations",
    difficulty: "Intermediate",
    explanation: "Since the speaker has no siblings, 'my father's son' is the speaker himself. Thus 'that man's father is me', making it his son's photograph.",
  },
  {
    id: "reason-4",
    type: "single-choice",
    text: "If 'DELHI' is coded as '73541' and 'CALCUTTA' as '82589662', how can 'CALICUT' be coded in this numerical system?",
    options: [
      { id: "ro-13", text: "5279431" },
      { id: "ro-14", text: "5978213" },
      { id: "ro-15", text: "8251896" },
      { id: "ro-16", text: "8543261" },
    ],
    subject: "Reasoning",
    topic: "Coding and Decoding",
    difficulty: "Beginner",
    explanation: "Letter map: C=8, A=2, L=5, I=1, C=8, U=9, T=6. Result = 8251896.",
  },
  {
    id: "reason-5",
    type: "multiple-choice",
    text: "Given Statements: (I) All roses are flowers. (II) All flowers are plants. Which of the following conclusions logically follow? (Select all that apply)",
    options: [
      { id: "ro-17", text: "All roses are plants" },
      { id: "ro-18", text: "Some plants are flowers" },
      { id: "ro-19", text: "All plants are roses" },
      { id: "ro-20", text: "Some flowers are roses" },
    ],
    subject: "Reasoning",
    topic: "Syllogisms",
    difficulty: "Intermediate",
    explanation: "By transitivity, All roses are plants. By conversion, Some plants are flowers, and Some flowers are roses.",
  },
  {
    id: "reason-6",
    type: "true-false",
    text: "In deductive logic: If all squares are rectangles, and all rectangles are polygons, then every square is necessarily a polygon.",
    subject: "Reasoning",
    topic: "Deductive Logic",
    difficulty: "Beginner",
    explanation: "True. The transitive rule of universal categorical syllogisms states that (A ⊆ B) and (B ⊆ C) logically entails (A ⊆ C).",
  },
  {
    id: "reason-7",
    type: "short-answer",
    text: "In a class of 40 students, Rohan's rank is 15th from the top. What is his rank from the bottom?",
    placeholder: "Enter numerical rank",
    subject: "Reasoning",
    topic: "Ranking and Order",
    difficulty: "Beginner",
    explanation: "Rank from bottom = Total students - Rank from top + 1 = 40 - 15 + 1 = 26th.",
  },
  {
    id: "reason-8",
    type: "fill-blank",
    text: "Complete the alphabet letter series: A, C, F, J, ___ (Difference increments by +2, +3, +4, +5).",
    placeholder: "Enter next letter",
    subject: "Reasoning",
    topic: "Series",
    difficulty: "Beginner",
    explanation: "Position sequence: A(1) + 2 = C(3); C(3) + 3 = F(6); F(6) + 4 = J(10); J(10) + 5 = O(15). The next letter is O.",
  },
];

// --- 3. ENGLISH LANGUAGE (SAFE) ---
export const SafeEnglishQuestions: CandidateQuestion[] = [
  {
    id: "eng-1",
    type: "single-choice",
    text: "Choose the correct synonym for the capitalized word: 'ABUNDANT'.",
    options: [
      { id: "eo-1", text: "Scarce" },
      { id: "eo-2", text: "Plentiful" },
      { id: "eo-3", text: "Rare" },
      { id: "eo-4", text: "Limited" },
    ],
    subject: "English",
    topic: "Vocabulary",
    difficulty: "Beginner",
    explanation: "'Abundant' means existing or available in large quantities; plentiful.",
  },
  {
    id: "eng-2",
    type: "single-choice",
    text: "Identify the segment containing a grammatical error: 'Neither of the two candidates have submitted their verification documents.'",
    options: [
      { id: "eo-5", text: "Neither of" },
      { id: "eo-6", text: "the two candidates" },
      { id: "eo-7", text: "have submitted" },
      { id: "eo-8", text: "their verification documents" },
    ],
    subject: "English",
    topic: "Grammar",
    difficulty: "Intermediate",
    explanation: "The subject 'Neither' is singular, requiring the singular auxiliary verb 'has submitted' instead of 'have submitted'.",
  },
  {
    id: "eng-3",
    type: "single-choice",
    text: "Select the correctly spelt word from the options.",
    options: [
      { id: "eo-9", text: "Accommodate" },
      { id: "eo-10", text: "Acommodate" },
      { id: "eo-11", text: "Accomodate" },
      { id: "eo-12", text: "Acomodate" },
    ],
    subject: "English",
    topic: "Spelling",
    difficulty: "Advanced",
    explanation: "'Accommodate' is correctly spelled with double 'c' and double 'm'.",
  },
  {
    id: "eng-4",
    type: "single-choice",
    text: "Select the word that is the most appropriate ANTONYM for 'METICULOUS'.",
    options: [
      { id: "eo-13", text: "Careless" },
      { id: "eo-14", text: "Thorough" },
      { id: "eo-15", text: "Detailed" },
      { id: "eo-16", text: "Diligent" },
    ],
    subject: "English",
    topic: "Vocabulary",
    difficulty: "Intermediate",
    explanation: "'Meticulous' means showing great attention to detail. Its opposite is 'careless'.",
  },
  {
    id: "eng-5",
    type: "multiple-choice",
    text: "In which of the following sentences does the word 'fast' function as an ADVERB? (Select all that apply)",
    options: [
      { id: "eo-17", text: "She ran very fast to catch the morning train" },
      { id: "eo-18", text: "He was a fast runner during his college years" },
      { id: "eo-19", text: "The ship was held fast in the thick polar ice" },
      { id: "eo-20", text: "They observed a strict dawn-to-dusk fast" },
    ],
    subject: "English",
    topic: "Parts of Speech",
    difficulty: "Advanced",
    explanation: "In 'ran fast' and 'held fast', 'fast' modifies verbs ('ran' and 'held') as an adverb.",
  },
  {
    id: "eng-6",
    type: "true-false",
    text: "In English grammar, a sentence formed in the passive voice must always contain the past participle (V3) form of the main verb.",
    subject: "English",
    topic: "Grammar",
    difficulty: "Beginner",
    explanation: "True. All passive voice constructions require a form of the auxiliary 'to be' followed by the past participle (V3) of the main verb.",
  },
  {
    id: "eng-7",
    type: "short-answer",
    text: "Provide the one-word substitution for: 'A person who collects or has a great love for books'.",
    placeholder: "e.g. Bibliophile",
    subject: "English",
    topic: "Vocabulary",
    difficulty: "Beginner",
    explanation: "A bibliophile is an enthusiastic book collector or lover.",
  },
  {
    id: "eng-8",
    type: "fill-blank",
    text: "The executive committee unanimously agreed ___ the new accessibility recommendations submitted by the panel.",
    placeholder: "Enter preposition (e.g. to)",
    subject: "English",
    topic: "Prepositions",
    difficulty: "Intermediate",
    explanation: "One agrees 'to' a proposal/plan, 'with' a person, and 'on/upon' a topic after deliberation.",
  },
];

// --- 4. GENERAL KNOWLEDGE (SAFE) ---
export const SafeGKQuestions: CandidateQuestion[] = [
  {
    id: "gk-1",
    type: "single-choice",
    text: "Which city is the administrative capital of the Indian state of Madhya Pradesh?",
    options: [
      { id: "go-1", text: "Indore" },
      { id: "go-2", text: "Bhopal" },
      { id: "go-3", text: "Jabalpur" },
      { id: "go-4", text: "Gwalior" },
    ],
    subject: "General Knowledge",
    topic: "Geography",
    difficulty: "Beginner",
    explanation: "Bhopal is the capital city of Madhya Pradesh.",
  },
  {
    id: "gk-2",
    type: "single-choice",
    text: "Who served as the Chairman of the Drafting Committee of the Constituent Assembly of India?",
    options: [
      { id: "go-5", text: "Mahatma Gandhi" },
      { id: "go-6", text: "Jawaharlal Nehru" },
      { id: "go-7", text: "B. R. Ambedkar" },
      { id: "go-8", text: "Sardar Vallabhbhai Patel" },
    ],
    subject: "General Knowledge",
    topic: "Polity",
    difficulty: "Beginner",
    explanation: "Dr. B. R. Ambedkar was the Chairman of the Drafting Committee of the Indian Constitution.",
  },
  {
    id: "gk-3",
    type: "single-choice",
    text: "Which planet in our solar system is commonly designated as the 'Red Planet'?",
    options: [
      { id: "go-9", text: "Venus" },
      { id: "go-10", text: "Jupiter" },
      { id: "go-11", text: "Saturn" },
      { id: "go-12", text: "Mars" },
    ],
    subject: "General Knowledge",
    topic: "Science",
    difficulty: "Beginner",
    explanation: "Mars appears reddish due to the prevalence of iron oxide on its surface.",
  },
  {
    id: "gk-4",
    type: "single-choice",
    text: "The Reserve Bank of India (RBI) was established on April 1 of which year?",
    options: [
      { id: "go-13", text: "1935" },
      { id: "go-14", text: "1947" },
      { id: "go-15", text: "1950" },
      { id: "go-16", text: "1955" },
    ],
    subject: "General Knowledge",
    topic: "Economy",
    difficulty: "Intermediate",
    explanation: "The RBI was established on April 1, 1935, under the Reserve Bank of India Act, 1934.",
  },
  {
    id: "gk-5",
    type: "multiple-choice",
    text: "Which of the following are Fundamental Rights guaranteed under Part III of the Constitution of India? (Select all that apply)",
    options: [
      { id: "go-17", text: "Right to Equality" },
      { id: "go-18", text: "Right to Freedom" },
      { id: "go-19", text: "Right to Property" },
      { id: "go-20", text: "Right against Exploitation" },
    ],
    subject: "General Knowledge",
    topic: "Polity",
    difficulty: "Intermediate",
    explanation: "Right to Equality, Freedom, and against Exploitation are Fundamental Rights. Right to Property was moved to Article 300A as a legal right in 1978.",
  },
  {
    id: "gk-6",
    type: "multiple-choice",
    text: "Which of the following major Indian rivers originate within the Himalayan mountain system? (Select all that apply)",
    options: [
      { id: "go-21", text: "Ganga" },
      { id: "go-22", text: "Godavari" },
      { id: "go-23", text: "Brahmaputra" },
      { id: "go-24", text: "Narmada" },
    ],
    subject: "General Knowledge",
    topic: "Geography",
    difficulty: "Intermediate",
    explanation: "Ganga and Brahmaputra originate in the Himalayas. Godavari originates in Western Ghats, and Narmada in the Amarkantak plateau.",
  },
  {
    id: "gk-7",
    type: "true-false",
    text: "The Tropic of Cancer (23.5° N latitude) passes through exactly eight states across India.",
    subject: "General Knowledge",
    topic: "Geography",
    difficulty: "Beginner",
    explanation: "True. It passes through Gujarat, Rajasthan, MP, Chhattisgarh, Jharkhand, West Bengal, Tripura, and Mizoram.",
  },
  {
    id: "gk-8",
    type: "true-false",
    text: "Sound waves are able to propagate through a complete physical vacuum without requiring any material medium.",
    subject: "General Knowledge",
    topic: "Science",
    difficulty: "Intermediate",
    explanation: "False. Sound is a mechanical longitudinal wave requiring a material medium to travel.",
  },
  {
    id: "gk-9",
    type: "short-answer",
    text: "What is the official currency of the United Kingdom?",
    placeholder: "e.g. Pound Sterling",
    subject: "General Knowledge",
    topic: "Economy",
    difficulty: "Beginner",
    explanation: "The official currency of the United Kingdom is the Pound Sterling (GBP).",
  },
  {
    id: "gk-10",
    type: "fill-blank",
    text: "The chemical symbol for Gold in the periodic table of elements is ___.",
    placeholder: "Enter chemical symbol",
    subject: "General Knowledge",
    topic: "Science",
    difficulty: "Beginner",
    explanation: "Gold's symbol 'Au' derives from its Latin name 'Aurum', meaning shining dawn.",
  },
];

// --- MASTER SAFE POOL & MAP ---
export const SafeMasterQuestionBank: CandidateQuestion[] = [
  ...SafeQuantitativeQuestions,
  ...SafeReasoningQuestions,
  ...SafeEnglishQuestions,
  ...SafeGKQuestions,
];

export const SafeQuestionMap: Record<string, CandidateQuestion> = Object.fromEntries(
  SafeMasterQuestionBank.map((q) => [q.id, q])
);

// --- COHORT BANKS (PRECISE REPLICA OF DATABASE COHORTS) ---

/**
 * SSC CGL Tier 1 Mock (e1) - 12 questions (3 Reasoning, 3 GK, 3 Quant, 3 English)
 */
export const SafeSscCglMockQuestions: CandidateQuestion[] = [
  // 1. Reasoning
  SafeQuestionMap["reason-3"],
  SafeQuestionMap["reason-4"],
  SafeQuestionMap["reason-7"],
  // 2. General Knowledge
  SafeQuestionMap["gk-2"],
  SafeQuestionMap["gk-4"],
  SafeQuestionMap["gk-9"],
  // 3. Quantitative Aptitude
  SafeQuestionMap["quant-2"],
  SafeQuestionMap["quant-3"],
  SafeQuestionMap["quant-9"],
  // 4. English
  SafeQuestionMap["eng-2"],
  SafeQuestionMap["eng-3"],
  SafeQuestionMap["eng-4"],
].filter(Boolean);

/**
 * Banking Prelims Mock (e2) - 12 questions (4 Quant, 4 Reasoning, 4 English, ZERO GK)
 */
export const SafeBankingPrelimsMockQuestions: CandidateQuestion[] = [
  // 1. Quantitative Aptitude
  SafeQuestionMap["quant-1"],
  SafeQuestionMap["quant-4"],
  SafeQuestionMap["quant-5"],
  SafeQuestionMap["quant-7"],
  // 2. Reasoning Ability
  SafeQuestionMap["reason-1"],
  SafeQuestionMap["reason-2"],
  SafeQuestionMap["reason-5"],
  SafeQuestionMap["reason-8"],
  // 3. English Language
  SafeQuestionMap["eng-1"],
  SafeQuestionMap["eng-5"],
  SafeQuestionMap["eng-7"],
  SafeQuestionMap["eng-8"],
].filter(Boolean);

/**
 * UPSC CSAT Paper-II Mock (e3) - 9 questions (3 Reasoning, 3 Quant, 3 English, ZERO GK)
 */
export const SafeUpscCsatMockQuestions: CandidateQuestion[] = [
  // 1. Reasoning
  SafeQuestionMap["reason-2"],
  SafeQuestionMap["reason-5"],
  SafeQuestionMap["reason-6"],
  // 2. Quantitative Aptitude
  SafeQuestionMap["quant-1"],
  SafeQuestionMap["quant-6"],
  SafeQuestionMap["quant-10"],
  // 3. English
  SafeQuestionMap["eng-1"],
  SafeQuestionMap["eng-6"],
  SafeQuestionMap["eng-8"],
].filter(Boolean);

/**
 * Practice Set 1 (p1): Quantitative Aptitude (8 questions)
 */
export const SafePracticeQuantQuestions: CandidateQuestion[] = [
  SafeQuestionMap["quant-1"],
  SafeQuestionMap["quant-2"],
  SafeQuestionMap["quant-3"],
  SafeQuestionMap["quant-4"],
  SafeQuestionMap["quant-5"],
  SafeQuestionMap["quant-7"],
  SafeQuestionMap["quant-9"],
  SafeQuestionMap["quant-10"],
].filter(Boolean);

/**
 * Practice Set 2 (p2): General Knowledge (8 questions)
 */
export const SafePracticeGKQuestions: CandidateQuestion[] = [
  SafeQuestionMap["gk-1"],
  SafeQuestionMap["gk-2"],
  SafeQuestionMap["gk-3"],
  SafeQuestionMap["gk-4"],
  SafeQuestionMap["gk-5"],
  SafeQuestionMap["gk-7"],
  SafeQuestionMap["gk-9"],
  SafeQuestionMap["gk-10"],
].filter(Boolean);

/**
 * Practice Set 3 (p3): Reasoning (8 questions)
 */
export const SafePracticeReasoningQuestions: CandidateQuestion[] = [
  SafeQuestionMap["reason-1"],
  SafeQuestionMap["reason-2"],
  SafeQuestionMap["reason-3"],
  SafeQuestionMap["reason-4"],
  SafeQuestionMap["reason-5"],
  SafeQuestionMap["reason-6"],
  SafeQuestionMap["reason-7"],
  SafeQuestionMap["reason-8"],
].filter(Boolean);

/**
 * Practice Set 4 (p4): English (8 questions)
 */
export const SafePracticeEnglishQuestions: CandidateQuestion[] = [
  SafeQuestionMap["eng-1"],
  SafeQuestionMap["eng-2"],
  SafeQuestionMap["eng-3"],
  SafeQuestionMap["eng-4"],
  SafeQuestionMap["eng-5"],
  SafeQuestionMap["eng-6"],
  SafeQuestionMap["eng-7"],
  SafeQuestionMap["eng-8"],
].filter(Boolean);

/**
 * Practice Set 5 (p5): Multi-Format Showcase (5 questions containing all 5 formats)
 */
export const SafePracticeShowcaseQuestions: CandidateQuestion[] = [
  SafeQuestionMap["quant-1"],  // Single Choice
  SafeQuestionMap["gk-5"],     // Multiple Choice
  SafeQuestionMap["reason-6"], // True / False
  SafeQuestionMap["eng-7"],    // Short Answer
  SafeQuestionMap["quant-10"], // Fill in the Blank
].filter(Boolean);

export interface SafeExamContextParams {
  setId?: string | null;
  examId?: string | null;
}

export function getSafeQuestionsForContext(params: SafeExamContextParams): CandidateQuestion[] {
  const { setId, examId } = params;

  if (setId) {
    const s = setId.toLowerCase().trim();
    if (s === "p1" || s.includes("quant")) return SafePracticeQuantQuestions;
    if (s === "p2" || s.includes("gk") || s.includes("general")) return SafePracticeGKQuestions;
    if (s === "p3" || s.includes("reason")) return SafePracticeReasoningQuestions;
    if (s === "p4" || s.includes("english")) return SafePracticeEnglishQuestions;
    if (s === "p5" || s.includes("showcase") || s.includes("multi")) return SafePracticeShowcaseQuestions;
  }

  if (examId) {
    const e = examId.toLowerCase().trim();
    if (e === "e2" || e.includes("bank") || e.includes("ibps") || e.includes("sbi")) {
      return SafeBankingPrelimsMockQuestions;
    }
    if (e === "e3" || e.includes("csat") || e.includes("upsc")) {
      return SafeUpscCsatMockQuestions;
    }
    if (e === "e1" || e.includes("ssc") || e.includes("cgl")) {
      return SafeSscCglMockQuestions;
    }
  }

  return SafeSscCglMockQuestions;
}
