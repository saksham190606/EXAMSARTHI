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
    subject: "Mixed Competitive Practice",
    questions: 100,
    duration: 60,
    difficulty: "Intermediate",
    description: "Complete full-length mock test based on the latest pattern.",
  },
  {
    id: "e2",
    title: "Banking Prelims",
    subject: "Mixed Competitive Practice",
    questions: 100,
    duration: 60,
    difficulty: "Advanced",
    description: "High-speed practice for IBPS and SBI prelims.",
  },
  {
    id: "e3",
    title: "UPSC CSAT Foundation",
    subject: "Reasoning & Aptitude",
    questions: 80,
    duration: 120,
    difficulty: "Intermediate",
    description: "Core concepts and reading comprehension practice.",
  },
];

export const PracticeSets: Exam[] = [
  {
    id: "p1",
    title: "Percentages, Ratios & Arithmetic",
    subject: "Quantitative Aptitude",
    questions: 25,
    duration: 30,
    difficulty: "Beginner",
    description: "Build a strong foundation in percentages, simple interest, time and distance, and ratios.",
  },
  {
    id: "p2",
    title: "General Knowledge & Geography",
    subject: "General Knowledge",
    questions: 50,
    duration: 45,
    difficulty: "Intermediate",
    description: "Important constitutional articles, history, science, geography, and economy.",
  },
  {
    id: "p3",
    title: "Logical Reasoning & Coding",
    subject: "Reasoning",
    questions: 30,
    duration: 35,
    difficulty: "Advanced",
    description: "Complex logical deduction, number series, blood relations, and coding-decoding.",
  },
  {
    id: "p4",
    title: "English Grammar & Comprehension",
    subject: "English",
    questions: 20,
    duration: 25,
    difficulty: "Intermediate",
    description: "Rules of grammar, vocabulary, error detection, spelling, and reading comprehension.",
  },
];

export const RecentActivity = [
  {
    id: "a1",
    title: "General Knowledge",
    date: "Today",
    score: "12/20",
    status: "In Progress",
  },
  {
    id: "a2",
    title: "Quantitative Aptitude",
    date: "Yesterday",
    score: "8/15",
    status: "Completed",
  },
  {
    id: "a3",
    title: "SSC CGL Tier 1 Mock",
    date: "3 days ago",
    score: "74/100",
    status: "Completed",
  },
];

export const Recommendations = [
  "Practice more Quantitative Aptitude to improve speed.",
  "Your accuracy is lower in Logic & Reasoning.",
];
