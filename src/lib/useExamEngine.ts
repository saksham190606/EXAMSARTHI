import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { CandidateQuestion, UserAnswer, ExamAnswers } from '@/types/question';
import { ExamSectionConfig } from '@/types/section';
import { stopSpeaking } from '@/lib/voice/useVoiceEngine';

export interface ExamState {
  currentQuestionIndex: number;
  answers: ExamAnswers; // questionId -> UserAnswer (string | string[] | boolean)
  flagged: Set<string>; // Set of flagged questionIds
  timeRemaining: number; // in seconds (overall exam)
  isSubmitted: boolean;
  setId?: string;
  examId?: string;
  isRemote?: boolean;
  activeSectionIndex: number;
  sectionTimeRemaining: number; // in seconds (active section)
  activeSection: ExamSectionConfig | null;
  sections: ExamSectionConfig[] | null;
  currentSectionIndices: number[];
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
  goToNextSection?: () => void;
}

export function useExamEngine(
  rawQuestions: CandidateQuestion[],
  initialDurationSeconds: number,
  onExamComplete: (finalState: ExamState) => void,
  initialQuestionIndex = 0,
  setId?: string,
  examId?: string,
  isRemote = true,
  sections?: ExamSectionConfig[] | null,
  onSectionComplete?: (sectionIndex: number, autoAdvanced: boolean) => void
) {
  // Purge Multi-Select Questions: Filter incoming questions strictly
  const questions = useMemo(() => {
    return (rawQuestions || []).filter(q =>
      ['MCQ', 'single-choice', 'TRUE_FALSE', 'true-false', 'FILL_IN_BLANKS', 'fill-blank', 'short-answer', 'SHORT_ANSWER', 'MULTIPLE_SELECT', 'multiple-choice'].includes((q.type as string) || 'MCQ')
    );
  }, [rawQuestions]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex);
  const [answers, setAnswers] = useState<ExamAnswers>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const safeInitialDuration = Number.isFinite(initialDurationSeconds) && initialDurationSeconds > 0 
    ? initialDurationSeconds 
    : 900;
  const [timeRemaining, setTimeRemaining] = useState(safeInitialDuration);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const isSubmittedRef = useRef(false);
  const navigationLockRef = useRef(false);
  const navigationLockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isSubmittedRef.current = isSubmitted;
  }, [isSubmitted]);

  const lockNavigation = useCallback(() => {
    if (navigationLockRef.current) return false;

    navigationLockRef.current = true;
    if (navigationLockTimeoutRef.current) {
      clearTimeout(navigationLockTimeoutRef.current);
    }
    navigationLockTimeoutRef.current = setTimeout(() => {
      navigationLockRef.current = false;
      navigationLockTimeoutRef.current = null;
    }, 250);
    return true;
  }, []);

  // Sectional state
  const hasSections = Array.isArray(sections) && sections.length > 0;
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  // Map each section to question indices
  const sectionQuestionIndices: number[][] = useMemo(() => {
    if (!hasSections || !sections) {
      return [questions.map((_, i) => i)];
    }

    const hasSectionNames = questions.some(q => Boolean(q.section_name));
    if (hasSectionNames) {
      return sections.map(sec => {
        const indices: number[] = [];
        questions.forEach((q, i) => {
          if (
            q.section_name && (
              q.section_name.toLowerCase() === sec.name.toLowerCase() ||
              q.section_name.toLowerCase() === sec.id.toLowerCase()
            )
          ) {
            indices.push(i);
          }
        });
        return indices;
      });
    }

    // Fallback: partition by question_count or evenly
    let cur = 0;
    return sections.map(sec => {
      const count = sec.question_count ?? Math.ceil(questions.length / sections.length);
      const indices: number[] = [];
      for (let i = 0; i < count && cur < questions.length; i++) {
        indices.push(cur++);
      }
      return indices;
    });
  }, [questions, sections, hasSections]);

  const activeSection = hasSections && sections ? (sections[activeSectionIndex] || null) : null;
  const currentSectionIndices = sectionQuestionIndices[activeSectionIndex] || questions.map((_, i) => i);

  // Per-section remaining time (initialized from activeSection.duration_minutes * 60)
  const [sectionTimeRemaining, setSectionTimeRemaining] = useState(() => {
    if (activeSection) {
      return (activeSection.duration_minutes || 5) * 60;
    }
    return safeInitialDuration;
  });

  // Track latest state for callbacks
  const activeSectionIndexRef = useRef(activeSectionIndex);
  const sectionsRef = useRef(sections);
  const sectionQuestionIndicesRef = useRef(sectionQuestionIndices);
  const onSectionCompleteRef = useRef(onSectionComplete);

  useEffect(() => {
    activeSectionIndexRef.current = activeSectionIndex;
    sectionsRef.current = sections;
    sectionQuestionIndicesRef.current = sectionQuestionIndices;
    onSectionCompleteRef.current = onSectionComplete;
  }, [activeSectionIndex, sections, sectionQuestionIndices, onSectionComplete]);

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
    if (!lockNavigation()) return;

    if (hasSections) {
      const pos = currentSectionIndices.indexOf(currentQuestionIndex);
      if (pos >= 0 && pos < currentSectionIndices.length - 1) {
        const nextIndex = currentSectionIndices[pos + 1];
        setCurrentQuestionIndex(nextIndex);
        announceToScreenReader(`Question ${nextIndex + 1} of ${questions.length} (${activeSection?.name || 'Section'}).`);
      } else {
        announceToScreenReader(`End of ${activeSection?.name || 'current'} section reached.`);
      }
    } else {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1));
        announceToScreenReader(`Question ${currentQuestionIndex + 2} of ${questions.length}.`);
      } else {
        announceToScreenReader(`End of examination reached.`);
      }
    }
  }, [currentQuestionIndex, currentSectionIndices, hasSections, activeSection?.name, questions.length, lockNavigation]);

  const goToPrevious = useCallback(() => {
    if (!lockNavigation()) return;

    if (hasSections) {
      const pos = currentSectionIndices.indexOf(currentQuestionIndex);
      if (pos > 0) {
        const prevIndex = currentSectionIndices[pos - 1];
        setCurrentQuestionIndex(prevIndex);
        announceToScreenReader(`Question ${prevIndex + 1} of ${questions.length} (${activeSection?.name || 'Section'}).`);
      } else {
        announceToScreenReader(`Start of ${activeSection?.name || 'current'} section reached.`);
      }
    } else {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(prev => prev - 1);
        announceToScreenReader(`Question ${currentQuestionIndex} of ${questions.length}.`);
      }
    }
  }, [currentQuestionIndex, currentSectionIndices, hasSections, activeSection?.name, questions.length, lockNavigation]);

  const goToQuestion = useCallback((index: number) => {
    if (index < 0 || index >= questions.length) return;

    if (hasSections) {
      if (!currentSectionIndices.includes(index)) {
        announceToScreenReader(`Question ${index + 1} belongs to a different section and cannot be accessed.`);
        return;
      }
    }

    setCurrentQuestionIndex(index);
    announceToScreenReader(`Question ${index + 1} of ${questions.length}.`);
  }, [currentSectionIndices, hasSections, questions.length]);

  const submitExam = useCallback(() => {
    stopSpeaking();
    if (isSubmittedRef.current) return;
    isSubmittedRef.current = true;
    setIsSubmitted(true);
    onExamComplete({
      currentQuestionIndex,
      answers,
      flagged,
      timeRemaining,
      isSubmitted: true,
      setId,
      examId,
      isRemote,
      activeSectionIndex,
      sectionTimeRemaining,
      activeSection,
      sections: sections || null,
      currentSectionIndices,
    });
  }, [
    answers,
    currentQuestionIndex,
    flagged,
    onExamComplete,
    timeRemaining,
    setId,
    examId,
    isRemote,
    activeSectionIndex,
    sectionTimeRemaining,
    activeSection,
    sections,
    currentSectionIndices,
  ]);

  // Advance to next section explicitly (candidate initiated)
  const goToNextSection = useCallback(() => {
    const curIdx = activeSectionIndexRef.current;
    const secs = sectionsRef.current;
    if (!secs || curIdx >= secs.length - 1) {
      announceToScreenReader("You are already in the final section.");
      return;
    }

    const nextIdx = curIdx + 1;
    const nextSec = secs[nextIdx];
    setActiveSectionIndex(nextIdx);
    setSectionTimeRemaining((nextSec.duration_minutes || 5) * 60);

    const nextIndices = sectionQuestionIndicesRef.current[nextIdx];
    if (nextIndices && nextIndices.length > 0) {
      setCurrentQuestionIndex(nextIndices[0]);
    }

    announceToScreenReader(`Section ${nextSec.name} activated. Allotted duration: ${nextSec.duration_minutes} minutes.`);
    onSectionCompleteRef.current?.(curIdx, false);
  }, []);

  // Tick overall timer and section timer purely by decrementing numbers
  const tickTimer = useCallback(() => {
    if (isSubmittedRef.current) return;

    // Pure decrement: zero side effects inside updater
    setTimeRemaining(prev => Math.max(0, prev - 1));

    if (hasSections && sections && sections.length > 0) {
      setSectionTimeRemaining(prev => Math.max(0, prev - 1));
    }
  }, [hasSections, sections]);

  // Safe auto-submission when overall time expires (runs in effect commit phase, NOT during render/updater)
  useEffect(() => {
    if (isSubmittedRef.current) return;
    if (timeRemaining <= 0) {
      submitExam();
    }
  }, [timeRemaining, submitExam]);

  // Safe auto-advancement or auto-submission when section time expires
  useEffect(() => {
    if (isSubmittedRef.current || !hasSections || !sections || sections.length === 0) return;
    if (sectionTimeRemaining <= 0) {
      const curIdx = activeSectionIndexRef.current;
      const currentSecName = sections[curIdx]?.name || `Section ${curIdx + 1}`;

      if (curIdx < sections.length - 1) {
        // Auto-advance to next section
        const nextIdx = curIdx + 1;
        const nextSec = sections[nextIdx];
        setActiveSectionIndex(nextIdx);
        setSectionTimeRemaining((nextSec.duration_minutes || 5) * 60);

        const nextIndices = sectionQuestionIndicesRef.current[nextIdx];
        if (nextIndices && nextIndices.length > 0) {
          setCurrentQuestionIndex(nextIndices[0]);
        }

        announceToScreenReader(
          `Time expired for ${currentSecName}. Auto-advancing to section: ${nextSec.name}.`
        );
        onSectionCompleteRef.current?.(curIdx, true);
      } else {
        // Last section expired: auto-submit full exam
        announceToScreenReader(`Time expired for final section: ${currentSecName}. Submitting exam.`);
        submitExam();
      }
    }
  }, [sectionTimeRemaining, hasSections, sections, submitExam]);

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
    submitExam: submitExam,
    goToNextSection: hasSections ? goToNextSection : undefined,
  };

  return {
    state: {
      currentQuestionIndex,
      answers,
      flagged,
      timeRemaining,
      isSubmitted,
      activeSectionIndex,
      sectionTimeRemaining,
      activeSection,
      sections: sections || null,
      currentSectionIndices,
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
      goToNextSection,
      voiceActions
    },
    currentQuestion: questions[currentQuestionIndex] || (questions.length > 0 ? questions[Math.min(currentQuestionIndex, questions.length - 1)] : undefined),
  };
}

// Utility for imperative screen reader announcements using the live region
export function announceToScreenReader(message: string) {
  if (typeof document === 'undefined') return;
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
