import { Question, isQuestionAnswered, evaluateAnswer } from './examData';
import { ExamState } from './useExamEngine';

export interface SubjectMetrics {
  subject: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number; // percentage
}

export interface ExamResults {
  totalQuestions: number;
  attempted: number;
  unanswered: number;
  correct: number;
  incorrect: number;
  accuracy: number; // percentage
  score: number;
  percentage: number;
  timeUsed: number; // in seconds
  subjectMetrics: SubjectMetrics[];
  weakAreas: string[];
}

export function calculateResults(
  questions: Question[],
  finalState: ExamState,
  initialDurationSeconds: number
): ExamResults {
  const { answers, timeRemaining } = finalState;
  
  let correct = 0;
  let incorrect = 0;
  const attempted = questions.filter(q => isQuestionAnswered(q, answers[q.id])).length;
  const totalQuestions = questions.length;
  const unanswered = totalQuestions - attempted;

  const subjectMap: Record<string, SubjectMetrics> = {};

  // Initialize subject map
  questions.forEach((q) => {
    if (!subjectMap[q.subject]) {
      subjectMap[q.subject] = {
        subject: q.subject,
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        accuracy: 0,
      };
    }
    subjectMap[q.subject].totalQuestions++;
  });

  // Calculate scores using universal evaluator
  questions.forEach((q) => {
    const userAnswer = answers[q.id];
    if (isQuestionAnswered(q, userAnswer)) {
      subjectMap[q.subject].attempted++;
      if (evaluateAnswer(q, userAnswer)) {
        correct++;
        subjectMap[q.subject].correct++;
      } else {
        incorrect++;
        subjectMap[q.subject].incorrect++;
      }
    }
  });

  // Finalize subject metrics
  const subjectMetrics: SubjectMetrics[] = Object.values(subjectMap).map((m) => {
    const accuracy = m.attempted > 0 ? (m.correct / m.attempted) * 100 : 0;
    return { ...m, accuracy: Math.round(accuracy) };
  });

  // Determine weak areas (accuracy < 70% AND attempted > 0 to not penalize unattempted randomly)
  const weakAreas = subjectMetrics
    .filter((m) => m.attempted > 0 && m.accuracy < 70)
    .map((m) => m.subject);

  // Overall metrics
  const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
  const percentage = (correct / totalQuestions) * 100;
  const score = correct; // 1 point per question
  const timeUsed = initialDurationSeconds - timeRemaining;

  return {
    totalQuestions,
    attempted,
    unanswered,
    correct,
    incorrect,
    accuracy: Math.round(accuracy),
    score,
    percentage: Math.round(percentage),
    timeUsed,
    subjectMetrics,
    weakAreas,
  };
}
