export interface TopicMetrics {
  topic: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number; // percentage
}

export interface SubjectPerformanceProfile {
  subject: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number; // percentage
  topics: TopicMetrics[];
}

export interface PerformanceProfile {
  examId: string;
  timestamp: number;
  totalQuestions: number;
  attempted: number;
  correct: number;
  accuracy: number;
  subjects: SubjectPerformanceProfile[];
}

export type RecommendationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'MAINTAIN' | 'GENERAL';

export interface Recommendation {
  id: string;
  priority: RecommendationPriority;
  priorityScore: number; // Used for internal sorting
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
}
