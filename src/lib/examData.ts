import { 
  CandidateQuestion, 
  QuestionOption, 
  QuestionType, 
  UserAnswer, 
  ExamAnswers,
  normalizeText as safeNormalizeText,
  isQuestionAnswered as safeIsQuestionAnswered,
  getQuestionType as safeGetQuestionType
} from '@/types/question';

export type { UserAnswer, ExamAnswers, QuestionOption, QuestionType };

export interface BaseQuestion extends CandidateQuestion {
  id: string;
  text: string;
  subject: string;
  topic?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  explanation?: string;
}

export interface SingleChoiceQuestion extends Omit<BaseQuestion, 'type'> {
  type?: 'single-choice';
  options: QuestionOption[];
  correctAnswerId?: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: QuestionOption[];
  correctAnswerIds?: string[];
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true-false';
  correctAnswer?: boolean;
  options?: QuestionOption[];
}

export interface ShortAnswerQuestion extends BaseQuestion {
  type: 'short-answer';
  correctAnswer?: string;
  acceptableAnswers?: string[];
  placeholder?: string;
}

export interface FillBlankQuestion extends BaseQuestion {
  type: 'fill-blank';
  correctAnswer?: string;
  acceptableAnswers?: string[];
  placeholder?: string;
}

export type Question =
  | SingleChoiceQuestion
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | ShortAnswerQuestion
  | FillBlankQuestion
  | CandidateQuestion;

/**
 * Returns the effective question type with fallback to 'single-choice' for backward compatibility.
 */
export function getQuestionType(question: Question | CandidateQuestion): QuestionType {
  return safeGetQuestionType(question as CandidateQuestion);
}

/**
 * Normalizes text for deterministic, case-insensitive comparison with whitespace collapsing.
 */
export function normalizeText(text: string): string {
  return safeNormalizeText(text);
}

/**
 * Checks whether the user has provided a non-empty, valid answer for the question.
 */
export function isQuestionAnswered(question: Question | CandidateQuestion, answer: UserAnswer | undefined): boolean {
  return safeIsQuestionAnswered(question as CandidateQuestion, answer);
}

/**
 * Evaluates the user's answer against the correct answer definition.
 * Safely returns false if the question has no answer key (e.g. remote candidate-safe question).
 */
export function evaluateAnswer(question: Question | CandidateQuestion, answer: UserAnswer | undefined): boolean {
  if (!isQuestionAnswered(question, answer)) return false;
  const qType = getQuestionType(question);

  switch (qType) {
    case 'single-choice': {
      const sc = question as SingleChoiceQuestion;
      if (!sc.correctAnswerId) return false;
      return typeof answer === 'string' && answer === sc.correctAnswerId;
    }
    case 'multiple-choice': {
      const mc = question as MultipleChoiceQuestion;
      if (!mc.correctAnswerIds || !Array.isArray(mc.correctAnswerIds)) return false;
      if (!Array.isArray(answer)) return false;
      const userSet = new Set(answer);
      const correctSet = new Set(mc.correctAnswerIds);
      if (userSet.size !== correctSet.size) return false;
      for (const id of userSet) {
        if (!correctSet.has(id)) return false;
      }
      return true;
    }
    case 'true-false': {
      const tf = question as TrueFalseQuestion;
      if (tf.correctAnswer === undefined) return false;
      const userBool = typeof answer === 'boolean' ? answer : answer === 'true';
      return userBool === tf.correctAnswer;
    }
    case 'short-answer':
    case 'fill-blank': {
      const textQ = question as ShortAnswerQuestion | FillBlankQuestion;
      if (!textQ.correctAnswer) return false;
      if (typeof answer !== 'string') return false;
      const normalizedUser = normalizeText(answer);
      const acceptable = [textQ.correctAnswer, ...(textQ.acceptableAnswers || [])].map(normalizeText);
      return acceptable.includes(normalizedUser);
    }
    default:
      return false;
  }
}

/* ==========================================================================
   MASTER QUESTION BANK BY SUBJECT (REALISTIC COMPETITIVE EXAM STANDARDS)
   ========================================================================== */

// --- 1. QUANTITATIVE APTITUDE ---
export const QuantitativeQuestions: Question[] = [
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
    correctAnswerId: "qo-1",
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
    correctAnswerId: "qo-6",
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
    correctAnswerId: "qo-12",
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
    correctAnswerId: "qo-15",
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
    correctAnswerIds: ["qo-17", "qo-19"],
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
    correctAnswerIds: ["qo-21", "qo-22", "qo-24"],
    subject: "Quantitative Aptitude",
    topic: "Number Systems",
    difficulty: "Intermediate",
    explanation: "Product of negative integers is positive. Whole numbers include all natural numbers plus 0. Zero is an even number. Sum of two odd integers (2a+1 + 2b+1 = 2(a+b+1)) is always even.",
  },
  {
    id: "quant-7",
    type: "true-false",
    text: "In standard arithmetic and real analysis, zero (0) is classified as a positive integer.",
    correctAnswer: false,
    subject: "Quantitative Aptitude",
    topic: "Number Systems",
    difficulty: "Beginner",
    explanation: "False. Zero is neither positive nor negative; it is a sign-neutral integer.",
  },
  {
    id: "quant-8",
    type: "true-false",
    text: "In Euclidean planar geometry, the sum of all three interior angles of any triangle is always strictly equal to 180 degrees.",
    correctAnswer: true,
    subject: "Quantitative Aptitude",
    topic: "Geometry",
    difficulty: "Beginner",
    explanation: "True. In Euclidean plane geometry, the sum of internal angles of any planar triangle is exactly 180°.",
  },
  {
    id: "quant-9",
    type: "short-answer",
    text: "What is the square root of 625?",
    correctAnswer: "25",
    acceptableAnswers: ["25", "twenty five", "twenty-five"],
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
    correctAnswer: "Equilateral",
    acceptableAnswers: ["Equilateral", "equilateral triangle", "equilateral"],
    placeholder: "e.g. Equilateral",
    subject: "Quantitative Aptitude",
    topic: "Geometry",
    difficulty: "Beginner",
    explanation: "An equilateral triangle has all three sides congruent and internal angles equal to 60 degrees.",
  },
  {
    id: "quant-diagram-1",
    type: "single-choice",
    text: "In the given right triangle ABC, angle B is 90 degrees. If hypotenuse AC = 13 cm and side AB = 5 cm, calculate the length of base BC.",
    imageUrl: "/diagrams/quant-geometry.svg",
    options: [
      { id: "qdo-1", text: "10 cm" },
      { id: "qdo-2", text: "12 cm" },
      { id: "qdo-3", text: "8 cm" },
      { id: "qdo-4", text: "11 cm" },
    ],
    correctAnswerId: "qdo-2",
    subject: "Quantitative Aptitude",
    topic: "Geometry & Trigonometry",
    difficulty: "Intermediate",
    explanation: "Using the Pythagorean theorem: AC^2 = AB^2 + BC^2. 13^2 = 5^2 + BC^2 => 169 = 25 + BC^2 => BC^2 = 144 => BC = 12 cm.",
  },
];

// --- 2. REASONING (LOGICAL REASONING & GENERAL INTELLIGENCE) ---
export const ReasoningQuestions: Question[] = [
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
    correctAnswerId: "ro-2",
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
    correctAnswerId: "ro-6",
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
    correctAnswerId: "ro-10",
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
    correctAnswerId: "ro-15",
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
    correctAnswerIds: ["ro-17", "ro-18", "ro-20"],
    subject: "Reasoning",
    topic: "Syllogisms",
    difficulty: "Intermediate",
    explanation: "By transitivity, All roses are plants. By conversion, Some plants are flowers, and Some flowers are roses. 'All plants are roses' is an invalid universal deduction.",
  },
  {
    id: "reason-6",
    type: "true-false",
    text: "In deductive logic: If all squares are rectangles, and all rectangles are polygons, then every square is necessarily a polygon.",
    correctAnswer: true,
    subject: "Reasoning",
    topic: "Deductive Logic",
    difficulty: "Beginner",
    explanation: "True. The transitive rule of universal categorical syllogisms states that (A ⊆ B) and (B ⊆ C) logically entails (A ⊆ C).",
  },
  {
    id: "reason-7",
    type: "short-answer",
    text: "In a class of 40 students, Rohan's rank is 15th from the top. What is his rank from the bottom?",
    correctAnswer: "26",
    acceptableAnswers: ["26", "26th", "twenty six", "twenty-sixth"],
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
    correctAnswer: "O",
    acceptableAnswers: ["O", "o"],
    placeholder: "Enter next letter",
    subject: "Reasoning",
    topic: "Series",
    difficulty: "Beginner",
    explanation: "Position sequence: A(1) + 2 = C(3); C(3) + 3 = F(6); F(6) + 4 = J(10); J(10) + 5 = O(15). The next letter is O.",
  },
  {
    id: "reason-diagram-1",
    type: "single-choice",
    text: "Based on the bar chart showing annual wheat production, in which year was the production highest?",
    imageUrl: "/diagrams/reasoning-barchart.svg",
    options: [
      { id: "rdo-1", text: "2018" },
      { id: "rdo-2", text: "2019" },
      { id: "rdo-3", text: "2020" },
      { id: "rdo-4", text: "2021" },
    ],
    correctAnswerId: "rdo-3",
    subject: "Reasoning",
    topic: "Data Interpretation",
    difficulty: "Beginner",
    explanation: "According to the bar chart: 2018 is 45, 2019 is 60, 2020 is 85, and 2021 is 70 thousand metric tons. The highest production was in 2020.",
  },
];

// --- 3. ENGLISH LANGUAGE & COMPREHENSION ---
export const EnglishQuestions: Question[] = [
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
    correctAnswerId: "eo-2",
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
    correctAnswerId: "eo-7",
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
    correctAnswerId: "eo-9",
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
    correctAnswerId: "eo-13",
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
    correctAnswerIds: ["eo-17", "eo-19"],
    subject: "English",
    topic: "Parts of Speech",
    difficulty: "Advanced",
    explanation: "In 'ran fast' and 'held fast', 'fast' modifies verbs ('ran' and 'held') as an adverb. In 'fast runner' it is an adjective, and in 'observed a fast' it is a noun.",
  },
  {
    id: "eng-6",
    type: "true-false",
    text: "In English grammar, a sentence formed in the passive voice must always contain the past participle (V3) form of the main verb.",
    correctAnswer: true,
    subject: "English",
    topic: "Grammar",
    difficulty: "Beginner",
    explanation: "True. All passive voice constructions require a form of the auxiliary 'to be' followed by the past participle (V3) of the main verb.",
  },
  {
    id: "eng-7",
    type: "short-answer",
    text: "Provide the one-word substitution for: 'A person who collects or has a great love for books'.",
    correctAnswer: "Bibliophile",
    acceptableAnswers: ["Bibliophile", "bibliophile", "book lover"],
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
    correctAnswer: "to",
    acceptableAnswers: ["to", "upon", "with"],
    placeholder: "Enter preposition (e.g. to)",
    subject: "English",
    topic: "Prepositions",
    difficulty: "Intermediate",
    explanation: "One agrees 'to' a proposal/plan, 'with' a person, and 'on/upon' a topic after deliberation.",
  },
  {
    id: "eng-diagram-1",
    type: "single-choice",
    text: "According to the industrial cycle flowchart, which stage immediately follows 'Sorting & Cleaning'?",
    imageUrl: "/diagrams/english-flowchart.svg",
    options: [
      { id: "edo-1", text: "Collection" },
      { id: "edo-2", text: "Reprocessing" },
      { id: "edo-3", text: "Manufacturing" },
      { id: "edo-4", text: "Disposal" },
    ],
    correctAnswerId: "edo-2",
    subject: "English",
    topic: "Technical Process Comprehension",
    difficulty: "Beginner",
    explanation: "In the 4-stage flowchart, Stage 2 (Sorting & Cleaning) points directly to Stage 3 (Reprocessing).",
  },
];

// --- 4. GENERAL KNOWLEDGE (GENERAL AWARENESS & STUDIES) ---
export const GeneralKnowledgeQuestions: Question[] = [
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
    correctAnswerId: "go-2",
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
    correctAnswerId: "go-7",
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
    correctAnswerId: "go-12",
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
    correctAnswerId: "go-13",
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
    correctAnswerIds: ["go-17", "go-18", "go-20"],
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
    correctAnswerIds: ["go-21", "go-23"],
    subject: "General Knowledge",
    topic: "Geography",
    difficulty: "Intermediate",
    explanation: "Ganga and Brahmaputra originate in the Himalayas. Godavari originates in Western Ghats, and Narmada in the Amarkantak plateau.",
  },
  {
    id: "gk-7",
    type: "true-false",
    text: "The Tropic of Cancer (23.5° N latitude) passes through exactly eight states across India.",
    correctAnswer: true,
    subject: "General Knowledge",
    topic: "Geography",
    difficulty: "Beginner",
    explanation: "True. It passes through Gujarat, Rajasthan, MP, Chhattisgarh, Jharkhand, West Bengal, Tripura, and Mizoram.",
  },
  {
    id: "gk-8",
    type: "true-false",
    text: "Sound waves are able to propagate through a complete physical vacuum without requiring any material medium.",
    correctAnswer: false,
    subject: "General Knowledge",
    topic: "Science",
    difficulty: "Intermediate",
    explanation: "False. Sound is a mechanical longitudinal wave requiring a material medium (solid, liquid, or gas) to travel.",
  },
  {
    id: "gk-9",
    type: "short-answer",
    text: "What is the official currency of the United Kingdom?",
    correctAnswer: "Pound Sterling",
    acceptableAnswers: ["Pound", "Pound Sterling", "British Pound", "GBP"],
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
    correctAnswer: "Au",
    acceptableAnswers: ["Au", "AU", "aurum"],
    placeholder: "Enter chemical symbol",
    subject: "General Knowledge",
    topic: "Science",
    difficulty: "Beginner",
    explanation: "Gold's symbol 'Au' derives from its Latin name 'Aurum', meaning shining dawn.",
  },
  {
    id: "gk-diagram-1",
    type: "single-choice",
    text: "In the electric circuit shown, two resistors of 4 ohms and 6 ohms are connected in series with a 12V supply. What is the total equivalent resistance?",
    imageUrl: "/diagrams/gk-circuit.svg",
    options: [
      { id: "gdo-1", text: "2 ohms" },
      { id: "gdo-2", text: "10 ohms" },
      { id: "gdo-3", text: "24 ohms" },
      { id: "gdo-4", text: "1.2 ohms" },
    ],
    correctAnswerId: "gdo-2",
    subject: "General Knowledge",
    topic: "Physics & Electronics",
    difficulty: "Beginner",
    explanation: "For resistors in series, equivalent resistance Req = R1 + R2 = 4 Ω + 6 Ω = 10 Ω.",
  },
];

/* ==========================================================================
   ALL QUESTIONS MASTER POOL
   ========================================================================== */
export const MasterQuestionBank: Question[] = [
  ...QuantitativeQuestions,
  ...ReasoningQuestions,
  ...EnglishQuestions,
  ...GeneralKnowledgeQuestions,
];

/**
 * Fast lookup map by question ID
 */
export const QuestionMap: Record<string, Question> = Object.fromEntries(
  MasterQuestionBank.map((q) => [q.id, q])
);

export function getQuestionsByIds(ids: string[]): Question[] {
  return ids.map((id) => QuestionMap[id]).filter(Boolean);
}

/* ==========================================================================
   EXAM-SPECIFIC QUESTION BANKS (CLEAN MAPPING WITH ZERO CONTAMINATION)
   ========================================================================== */

/**
 * 1. SSC CGL Tier 1 Mock:
 * 4 Sections: Reasoning (3), General Knowledge (3), Quantitative Aptitude (3), English (3)
 * Demonstrates all 5 accessible question types in realistic competitive exam balance.
 */
export const SscCglMockQuestions: Question[] = [
  // Section 1: Reasoning
  QuestionMap["reason-3"], // Blood Relations (Single Choice)
  QuestionMap["reason-4"], // Coding-Decoding (Single Choice)
  QuestionMap["reason-6"], // Deductive Logic (True/False)
  // Section 2: General Knowledge / GA
  QuestionMap["gk-1"],     // Capital of MP (Single Choice)
  QuestionMap["gk-5"],     // Fundamental Rights (Multiple Choice)
  QuestionMap["gk-10"],    // Chemical symbol for Gold (Fill in Blank)
  // Section 3: Quantitative Aptitude
  QuestionMap["quant-3"],  // Ratio & HCF/LCM (Single Choice)
  QuestionMap["quant-4"],  // Simple Interest (Single Choice)
  QuestionMap["quant-8"],  // Geometry Triangle Angle Sum (True/False)
  // Section 4: English Language
  QuestionMap["eng-3"],    // Spelling (Single Choice)
  QuestionMap["eng-4"],    // Vocabulary Antonym (Single Choice)
  QuestionMap["eng-7"],    // Bibliophile One-Word (Short Answer)
].filter(Boolean);

/**
 * 2. Banking Prelims (IBPS PO/Clerk, SBI PO/Clerk Prelims):
 * 3 Sections: Quantitative Aptitude (4), Reasoning Ability (4), English Language (4)
 * STRICTLY NO General Knowledge / GA (GK belongs to Mains, never Prelims!).
 */
export const BankingPrelimsMockQuestions: Question[] = [
  // Section 1: Quantitative Aptitude
  QuestionMap["quant-1"],  // Percentages & Expenditure (Single Choice)
  QuestionMap["quant-2"],  // Speed, Time & Distance (Single Choice)
  QuestionMap["quant-5"],  // Prime numbers (Multiple Choice)
  QuestionMap["quant-9"],  // Square root calculation (Short Answer)
  // Section 2: Reasoning Ability
  QuestionMap["reason-1"], // Analogy (Single Choice)
  QuestionMap["reason-2"], // Number series (Single Choice)
  QuestionMap["reason-5"], // Syllogisms deduction (Multiple Choice)
  QuestionMap["reason-7"], // Ranking from bottom (Short Answer)
  // Section 3: English Language
  QuestionMap["eng-1"],    // Vocabulary Synonym (Single Choice)
  QuestionMap["eng-2"],    // Grammar Subject-Verb error (Single Choice)
  QuestionMap["eng-5"],    // Adverb usage (Multiple Choice)
  QuestionMap["eng-8"],    // Preposition agreement (Fill in Blank)
].filter(Boolean);

/**
 * 3. UPSC CSAT Foundation (Civil Services Aptitude Test - Paper II):
 * 3 Sections: Logical Reasoning (3), Quantitative Aptitude / Basic Numeracy (3), English Comprehension (3)
 * STRICTLY NO Static General Knowledge (CSAT tests analytical aptitude & comprehension).
 */
export const UpscCsatMockQuestions: Question[] = [
  // Logical Reasoning & Analytical Ability
  QuestionMap["reason-2"], // Number series (Single Choice)
  QuestionMap["reason-5"], // Syllogisms deduction (Multiple Choice)
  QuestionMap["reason-6"], // Transitive deductive logic (True/False)
  // Basic Numeracy & Quantitative Aptitude
  QuestionMap["quant-1"],  // Percentages & Consumption (Single Choice)
  QuestionMap["quant-6"],  // Real number properties (Multiple Choice)
  QuestionMap["quant-10"], // Equilateral triangle definition (Fill in Blank)
  // Reading Comprehension & English
  QuestionMap["eng-1"],    // Vocabulary Comprehension (Single Choice)
  QuestionMap["eng-6"],    // Grammar passive voice rule (True/False)
  QuestionMap["eng-8"],    // Contextual Preposition (Fill in Blank)
].filter(Boolean);

/* ==========================================================================
   PRACTICE SET QUESTION BANKS (SUBJECT-SPECIFIC FOCUS)
   ========================================================================== */

/**
 * p1: Quantitative Aptitude (8 questions covering all 5 formats)
 */
export const PracticeQuantQuestions: Question[] = [
  QuestionMap["quant-1"],  // Single Choice
  QuestionMap["quant-2"],  // Single Choice
  QuestionMap["quant-3"],  // Single Choice
  QuestionMap["quant-4"],  // Single Choice
  QuestionMap["quant-5"],  // Multiple Choice
  QuestionMap["quant-7"],  // True / False
  QuestionMap["quant-9"],  // Short Answer
  QuestionMap["quant-10"], // Fill in the Blank
].filter(Boolean);

/**
 * p2: General Knowledge (8 questions covering all 5 formats)
 */
export const PracticeGKQuestions: Question[] = [
  QuestionMap["gk-1"],     // Single Choice
  QuestionMap["gk-2"],     // Single Choice
  QuestionMap["gk-3"],     // Single Choice
  QuestionMap["gk-4"],     // Single Choice
  QuestionMap["gk-5"],     // Multiple Choice
  QuestionMap["gk-7"],     // True / False
  QuestionMap["gk-9"],     // Short Answer
  QuestionMap["gk-10"],    // Fill in the Blank
].filter(Boolean);

/**
 * p3: Reasoning (8 questions covering all 5 formats)
 */
export const PracticeReasoningQuestions: Question[] = [
  QuestionMap["reason-1"], // Single Choice
  QuestionMap["reason-2"], // Single Choice
  QuestionMap["reason-3"], // Single Choice
  QuestionMap["reason-4"], // Single Choice
  QuestionMap["reason-5"], // Multiple Choice
  QuestionMap["reason-6"], // True / False
  QuestionMap["reason-7"], // Short Answer
  QuestionMap["reason-8"], // Fill in the Blank
].filter(Boolean);

/**
 * p4: English (8 questions covering all 5 formats)
 */
export const PracticeEnglishQuestions: Question[] = [
  QuestionMap["eng-1"],    // Single Choice
  QuestionMap["eng-2"],    // Single Choice
  QuestionMap["eng-3"],    // Single Choice
  QuestionMap["eng-4"],    // Single Choice
  QuestionMap["eng-5"],    // Multiple Choice
  QuestionMap["eng-6"],    // True / False
  QuestionMap["eng-7"],    // Short Answer
  QuestionMap["eng-8"],    // Fill in the Blank
].filter(Boolean);

/**
 * p5: Multi-Format Accessible Engine Showcase (Exactly 1 of each of the 5 question formats)
 */
export const PracticeShowcaseQuestions: Question[] = [
  QuestionMap["quant-1"],  // 1. Single Choice
  QuestionMap["gk-5"],     // 2. Multiple Choice
  QuestionMap["reason-6"], // 3. True / False
  QuestionMap["eng-7"],    // 4. Short Answer
  QuestionMap["quant-10"], // 5. Fill in the Blank
].filter(Boolean);

/* ==========================================================================
   CONTEXT RESOLVER: EXAM / PRACTICE SELECTION PIPELINE
   ========================================================================== */

export interface ExamContextParams {
  setId?: string | null;
  examId?: string | null;
}

/**
 * Resolves the exact questions appropriate for the selected Practice Set or Mock Exam.
 * Guarantees zero category contamination and full subject/topic integrity.
 */
export function getQuestionsForContext(params: ExamContextParams): Question[] {
  const { setId, examId } = params;

  // 1. Practice Sets
  if (setId) {
    const s = setId.toLowerCase().trim();
    if (s === "p1" || s.includes("quant")) return PracticeQuantQuestions;
    if (s === "p2" || s.includes("gk") || s.includes("general")) return PracticeGKQuestions;
    if (s === "p3" || s.includes("reason")) return PracticeReasoningQuestions;
    if (s === "p4" || s.includes("english")) return PracticeEnglishQuestions;
    if (s === "p5" || s.includes("showcase") || s.includes("multi")) return PracticeShowcaseQuestions;
  }

  // 2. Mock Exams
  if (examId) {
    const e = examId.toLowerCase().trim();
    // Banking Prelims (IBPS / SBI) -> Quant, Reasoning, English ONLY
    if (e === "e2" || e.includes("bank") || e.includes("ibps") || e.includes("sbi")) {
      return BankingPrelimsMockQuestions;
    }
    // UPSC CSAT -> Reasoning, Quant, English Comprehension ONLY
    if (e === "e3" || e.includes("csat") || e.includes("upsc")) {
      return UpscCsatMockQuestions;
    }
    // SSC CGL -> Reasoning, GA, Quant, English
    if (e === "e1" || e.includes("ssc") || e.includes("cgl")) {
      return SscCglMockQuestions;
    }
  }

  // 3. Fallback / Default: SSC CGL Comprehensive Mock
  return SscCglMockQuestions;
}

/**
 * Backward compatibility export
 */
export const MockExamQuestions: Question[] = SscCglMockQuestions;
