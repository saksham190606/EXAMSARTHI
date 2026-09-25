/**
 * EXAMSARTHI — Candidate-Safe Question Types & Utilities
 * 
 * Defines candidate-facing data structures strictly guaranteed to contain
 * zero answer-key information (no correctAnswerId, correctAnswer, or acceptableAnswers).
 */

export type QuestionType =
  | 'single-choice'
  | 'multiple-choice'
  | 'true-false'
  | 'short-answer'
  | 'fill-blank';

export type UserAnswer = string | string[] | boolean;
export type ExamAnswers = Record<string, UserAnswer>;

export interface QuestionOption {
  id: string;
  text: string;
}

export interface CandidateQuestion {
  id: string;
  type: QuestionType;
  text: string;
  subject: string;
  topic?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  options?: QuestionOption[];
  explanation?: string;
  placeholder?: string;
  order_index?: number;
  exam_id?: string;
  section_name?: string;
}

export type SafeQuestion = CandidateQuestion;

/**
 * Returns the effective question type with fallback to 'single-choice'.
 */
export function getQuestionType(question: CandidateQuestion): QuestionType {
  return question.type || 'single-choice';
}

/**
 * Normalizes text for deterministic, case-insensitive comparison with whitespace collapsing.
 */
export function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Checks whether the user has provided a non-empty, valid answer for the question.
 */
export function isQuestionAnswered(question: CandidateQuestion, answer: UserAnswer | undefined): boolean {
  if (answer === undefined || answer === null) return false;
  const qType = getQuestionType(question);

  switch (qType) {
    case 'single-choice':
      return typeof answer === 'string' && answer.trim().length > 0;
    case 'multiple-choice':
      return Array.isArray(answer) && answer.length > 0;
    case 'true-false':
      return typeof answer === 'boolean' || (typeof answer === 'string' && (answer === 'true' || answer === 'false'));
    case 'short-answer':
    case 'fill-blank':
      return typeof answer === 'string' && answer.trim().length > 0;
    default:
      return false;
  }
}
