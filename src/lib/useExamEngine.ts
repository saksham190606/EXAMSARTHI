import { useState, useCallback } from 'react';
import { CandidateQuestion, UserAnswer, ExamAnswers } from '@/types/question';

export interface ExamState {
  currentQuestionIndex: number;
  answers: ExamAnswers; // questionId -> UserAnswer (string | string[] | boolean)
  flagged: Set<string>; // Set of flagged questionIds
  timeRemaining: number; // in seconds
  isSubmitted: boolean;
  setId?: string;
  examId?: string;
  isRemote?: boolean;
}

// Voice abstraction actions interface
export interface ExamActions {
  readQuestion: (questionId: string) => void;
  readOptions: (questionId: string) => void;
  selectOption: (questionId: string, optionId: string) => void;
  setAnswer: (questionId: string, answer: UserAnswer) => void;
  toggleOption: (questionId: string, optionId: string) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  repeatQuestion: () => void;
  submitExam: () => void;
}

export function useExamEngine(
  questions: CandidateQuestion[],
  initialDurationSeconds: number,
  onExamComplete: (finalState: ExamState) => void,
  initialQuestionIndex = 0,
  setId?: string,
  examId?: string,
  isRemote = true
) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex);
  const [answers, setAnswers] = useState<ExamAnswers>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(initialDurationSeconds);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const toggleFlag = useCallback((questionId: string) => {
    setFlagged(prev => {
      const newFlagged = new Set(prev);
      if (newFlagged.has(questionId)) {
        newFlagged.delete(questionId);
      } else {
        newFlagged.add(questionId);
      }
      return newFlagged;
    });
  }, []);

  const setAnswer = useCallback((questionId: string, answer: UserAnswer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    announceToScreenReader("Answer updated.");
  }, []);

  // Backward-compatible single option selector
  const selectAnswer = useCallback((questionId: string, optionId: string) => {
    setAnswer(questionId, optionId);
  }, [setAnswer]);

  // Multiple-choice option toggler
  const toggleOption = useCallback((questionId: string, optionId: string) => {
    setAnswers(prev => {
      const current = prev[questionId];
      const arr = Array.isArray(current) ? [...current] : [];
      const idx = arr.indexOf(optionId);
      if (idx >= 0) {
        arr.splice(idx, 1);
      } else {
        arr.push(optionId);
      }
      return { ...prev, [questionId]: arr };
    });
    announceToScreenReader("Option selection updated.");
  }, []);

  const goToNext = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      announceToScreenReader(`Question ${currentQuestionIndex + 2} of ${questions.length}.`);
    }
  }, [currentQuestionIndex, questions.length]);

  const goToPrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      announceToScreenReader(`Question ${currentQuestionIndex} of ${questions.length}.`);
    }
  }, [currentQuestionIndex, questions.length]);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
      announceToScreenReader(`Question ${index + 1} of ${questions.length}.`);
    }
  }, [questions.length]);

  const submitExam = useCallback(() => {
    setIsSubmitted(true);
    onExamComplete({
      currentQuestionIndex,
      answers,
      flagged,
      timeRemaining,
      isSubmitted: true,
      setId,
      examId,
      isRemote
    });
  }, [answers, currentQuestionIndex, flagged, onExamComplete, timeRemaining, setId, examId, isRemote]);

  const tickTimer = useCallback(() => {
    if (isSubmitted) return;
    
    setTimeRemaining(prev => {
      if (prev <= 1) {
        submitExam();
        return 0;
      }
      return prev - 1;
    });
  }, [isSubmitted, submitExam]);

  // Voice actions abstraction
  const voiceActions: ExamActions = {
    readQuestion: (id) => console.log("Voice: Read question", id),
    readOptions: (id) => console.log("Voice: Read options", id),
    selectOption: (qId, oId) => selectAnswer(qId, oId),
    setAnswer: (qId, ans) => setAnswer(qId, ans),
    toggleOption: (qId, oId) => toggleOption(qId, oId),
    nextQuestion: goToNext,
    previousQuestion: goToPrevious,
    repeatQuestion: () => console.log("Voice: Repeating current question"),
    submitExam: submitExam
  };

  return {
    state: {
      currentQuestionIndex,
      answers,
      flagged,
      timeRemaining,
      isSubmitted
    },
    actions: {
      toggleFlag,
      selectAnswer,
      setAnswer,
      toggleOption,
      goToNext,
      goToPrevious,
      goToQuestion,
      submitExam,
      tickTimer,
      voiceActions
    },
    currentQuestion: questions[currentQuestionIndex],
  };
}

// Utility for imperative screen reader announcements using the live region
export function announceToScreenReader(message: string) {
  const liveRegion = document.getElementById("exam-live-region");
  if (liveRegion) {
    liveRegion.textContent = message;
    
    // Clear out after a short delay so the same message can be re-announced
    setTimeout(() => {
      if (liveRegion.textContent === message) {
        liveRegion.textContent = "";
      }
    }, 3000);
  }
}
