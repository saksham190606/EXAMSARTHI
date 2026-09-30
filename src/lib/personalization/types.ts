export interface TopicMetrics {
  topic: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number; // percentage
  subject?: string;
}

export interface SubjectPerformanceProfile {
  subject: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number; // percentage
  score?: number;
  topics: TopicMetrics[];
}

export interface PerformanceProfile {
  id?: string;
  examId: string;
  examTitle?: string;
  subject?: string;
  category?: string;
  timestamp: number;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect?: number;
  score?: number;
  accuracy: number;
  timeUsedSeconds?: number;
  subjects: SubjectPerformanceProfile[];
  topicMetrics?: TopicMetrics[];
  answers?: Record<string, any>;
  reviewQuestions?: any[];
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
