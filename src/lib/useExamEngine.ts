import { useState, useCallback } from 'react';
import { Question } from './examData';
import { useVoiceFeedback } from '@/hooks/useVoiceFeedback';
import { useTranslation } from './i18n';

export interface ExamState {
  currentQuestionIndex: number;
  answers: Record<string, string>; // questionId -> optionId
  flagged: Set<string>; // Set of flagged questionIds
  timeRemaining: number; // in seconds
  isSubmitted: boolean;
}

// Voice abstraction actions interface
export interface ExamActions {
  readQuestion: (questionId: string) => void;
  readOptions: (questionId: string) => void;
  selectOption: (questionId: string, optionId: string) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  repeatQuestion: () => void;
  submitExam: () => void;
}

export function useExamEngine(
  questions: Question[],
  initialDurationSeconds: number,
  onExamComplete: (finalState: ExamState) => void
) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(initialDurationSeconds);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const { speakFeedback } = useVoiceFeedback();
  const { t } = useTranslation();

  const toggleFlag = useCallback((questionId: string) => {
    setFlagged(prev => {
      const newFlagged = new Set(prev);
      if (newFlagged.has(questionId)) {
        newFlagged.delete(questionId);
        speakFeedback(t('vfQuestionUnflagged'));
      } else {
        newFlagged.add(questionId);
        speakFeedback(t('vfQuestionFlagged'));
      }
      return newFlagged;
    });
  }, [speakFeedback, t]);

  const selectAnswer = useCallback((questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    announceToScreenReader("Option selected.");
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
    speakFeedback(t('vfSubmitExam'));
    onExamComplete({
      currentQuestionIndex,
      answers,
      flagged,
      timeRemaining,
      isSubmitted: true
    });
  }, [answers, currentQuestionIndex, flagged, onExamComplete, timeRemaining, speakFeedback, t]);

  const tickTimer = useCallback(() => {
    if (isSubmitted) return;
    
    setTimeRemaining(prev => {
      const newTime = prev - 1;
      
      // Timer feedback
      if (newTime === 600) speakFeedback(t('vfTimeWarning', { minutes: 10 }));
      if (newTime === 300) speakFeedback(t('vfTimeWarning', { minutes: 5 }));
      if (newTime === 60) speakFeedback(t('vfTimeWarning', { minutes: 1 }));
      if (newTime === 30) speakFeedback(t('vfTimeWarningSeconds', { seconds: 30 }));
      
      if (newTime <= 0) {
        speakFeedback(t('vfTimeOver'));
        submitExam();
        return 0;
      }
      return newTime;
    });
  }, [isSubmitted, submitExam, speakFeedback, t]);

  // Voice actions abstraction
  const voiceActions: ExamActions = {
    readQuestion: (id) => console.log("Voice: Read question", id),
    readOptions: (id) => console.log("Voice: Read options", id),
    selectOption: (qId, oId) => selectAnswer(qId, oId),
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
    
    // Clear it out after a short delay so the same message can be announced again if needed
    setTimeout(() => {
      if (liveRegion.textContent === message) {
        liveRegion.textContent = "";
      }
    }, 3000);
  }
}
