export const UserProfile = {
  name: "Saksham",
  questionsAttempted: 1245,
  testsCompleted: 34,
  averageScore: 78, // percentage
  currentStreak: 12, // days
};

export type Exam = {
  id: string;
  title: string;
  subject: string;
  questions: number;
  duration: number; // minutes
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  description: string;
};

export const AvailableExams: Exam[] = [
  {
    id: "e1",
    title: "SSC CGL Tier 1 Mock",
    subject: "Reasoning, GA, Quant & English",
    questions: 12,
    duration: 15,
    difficulty: "Intermediate",
    description: "Complete 4-section simulation based on the latest pattern: Reasoning, GA, Quant, and English.",
  },
  {
    id: "e2",
    title: "Banking Prelims",
    subject: "Quant, Reasoning & English",
    questions: 12,
    duration: 15,
    difficulty: "Advanced",
    description: "High-speed simulation for IBPS and SBI prelims covering Quant, Reasoning Ability, and English.",
  },
  {
    id: "e3",
    title: "UPSC CSAT Foundation",
    subject: "Reasoning, Quant & Reading Comprehension",
    questions: 9,
    duration: 15,
    difficulty: "Intermediate",
    description: "Paper II civil services simulation covering Logical Reasoning, Basic Numeracy, and English Comprehension.",
  },
];

export const PracticeSets: Exam[] = [
  {
    id: "p1",
    title: "Percentages, Ratios & Arithmetic",
    subject: "Quantitative Aptitude",
    questions: 8,
    duration: 10,
    difficulty: "Beginner",
    description: "Focused practice in percentages, simple interest, time and distance, and ratios across accessible formats.",
  },
  {
    id: "p2",
    title: "General Knowledge & Geography",
    subject: "General Knowledge",
    questions: 8,
    duration: 10,
    difficulty: "Intermediate",
    description: "Essential constitutional articles, history, science, geography, and economy with accessible question types.",
  },
  {
    id: "p3",
    title: "Logical Reasoning & Coding",
    subject: "Reasoning",
    questions: 8,
    duration: 10,
    difficulty: "Advanced",
    description: "Deductive logic, number series, blood relations, and syllogisms across diverse question formats.",
  },
  {
    id: "p4",
    title: "English Grammar & Comprehension",
    subject: "English",
    questions: 8,
    duration: 10,
    difficulty: "Intermediate",
    description: "Rules of grammar, vocabulary, error detection, spelling, and preposition usage.",
  },
  {
    id: "p5",
    title: "Accessible Multi-Format Showcase",
    subject: "Multi-Format Showcase",
    questions: 5,
    duration: 8,
    difficulty: "Beginner",
    description: "Curated session testing all 5 accessible question types: Single Choice, Multiple Choice, True/False, Short Answer, and Fill in the Blank.",
  },
];

export const RecentActivity = [
  {
    id: "a1",
    title: "General Knowledge",
    date: "Today",
    score: "7/8",
    status: "Completed",
  },
  {
    id: "a2",
    title: "Quantitative Aptitude",
    date: "Yesterday",
    score: "6/8",
    status: "Completed",
  },
  {
    id: "a3",
    title: "SSC CGL Tier 1 Mock",
    date: "3 days ago",
    score: "10/12",
    status: "Completed",
  },
];

export const Recommendations = [
  "Practice more Quantitative Aptitude to improve speed.",
  "Your accuracy is lower in Logic & Reasoning.",
];
