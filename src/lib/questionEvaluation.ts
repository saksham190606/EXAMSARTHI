import {
  CandidateQuestion,
  QuestionOption,
  QuestionType,
  UserAnswer,
  ExamAnswers,
  normalizeText as safeNormalizeText,
  isQuestionAnswered as safeIsQuestionAnswered,
  getQuestionType as safeGetQuestionType,
} from '@/types/question';

export type { CandidateQuestion, QuestionOption, QuestionType, UserAnswer, ExamAnswers };

export interface QuestionWithAnswerMetadata extends CandidateQuestion {
  correctAnswerId?: string;
  correctAnswerIds?: string[];
  correctAnswer?: boolean | string;
  acceptableAnswers?: string[];
}

export type Question = QuestionWithAnswerMetadata;

export function getQuestionType(question: Question | CandidateQuestion): QuestionType {
  return safeGetQuestionType(question as CandidateQuestion);
}

export function normalizeText(text: string): string {
  return safeNormalizeText(text);
}

export function isQuestionAnswered(question: Question | CandidateQuestion, answer: UserAnswer | undefined): boolean {
  return safeIsQuestionAnswered(question as CandidateQuestion, answer);
}

export function evaluateAnswer(question: Question | CandidateQuestion, answer: UserAnswer | undefined): boolean {
  if (!isQuestionAnswered(question, answer)) return false;
  const qType = getQuestionType(question);

  switch (qType) {
    case 'single-choice': {
      const sc = question as QuestionWithAnswerMetadata;
      if (!sc.correctAnswerId) return false;
      return typeof answer === 'string' && answer === sc.correctAnswerId;
    }
    case 'multiple-choice': {
      const mc = question as QuestionWithAnswerMetadata;
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
      const tf = question as QuestionWithAnswerMetadata;
      if (tf.correctAnswer === undefined) return false;
      const userBool = typeof answer === 'boolean' ? answer : answer === 'true';
      return userBool === tf.correctAnswer;
    }
    case 'short-answer':
    case 'fill-blank': {
      const textQ = question as QuestionWithAnswerMetadata;
      if (textQ.correctAnswer === undefined || textQ.correctAnswer === null) return false;
      if (typeof answer !== 'string') return false;
      const normalizedUser = normalizeText(answer);
      const acceptable = [textQ.correctAnswer, ...(textQ.acceptableAnswers || [])]
        .filter((value): value is string => typeof value === 'string')
        .map(normalizeText);
      return acceptable.includes(normalizedUser);
    }
    default:
      return false;
  }
}
