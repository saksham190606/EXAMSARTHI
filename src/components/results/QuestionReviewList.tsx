"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  Lightbulb, 
  Check, 
  X, 
  Layers,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  ChevronLeft,
  ChevronRight,
  Mic,
  RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { getNaturalFemaleVoice } from '@/lib/accessibility/voice-companion';
import { getHighFidelityVoice } from '@/lib/voice/speech-synthesis';
import { fetchAIIntent } from '@/lib/voice/useVoiceEngine';

export interface QuestionReviewItem {
  questionId: string;
  orderIndex: number;
  sectionName?: string;
  text: string;
  type: string;
  subject: string;
  topic?: string;
  difficulty?: string;
  options?: Array<{ id: string; text: string }>;
  userAnswer: any;
  isCorrect: boolean;
  isAnswered: boolean;
  correctAnswer: any;
  acceptableAnswers?: string[];
  explanation?: string;
}

interface QuestionReviewListProps {
  questions: QuestionReviewItem[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isWalkthroughActive?: boolean;
  onStop?: () => void;
  onStopWalkthrough?: () => void;
}

/**
 * Mathematical symbol pronunciation cleaner for text-to-speech.
 * Replaces powers, operators, and formatting with spoken natural phrasing.
 */
export function cleanMathAndTextForSpeech(text: string | null | undefined, isHindi: boolean = false): string {
  if (!text) return '';
  let cleaned = text
    .replace(/\bEXAMSARTHI\b/gi, 'Exam Saarthi')
    .replace(/examsarthi/gi, 'Exam Saarthi')
    .replace(/[*_#`~\[\]]/g, ' ');

  if (isHindi) {
    cleaned = cleaned
      .replace(/\^2\b/g, ' का वर्ग ')
      .replace(/\^3\b/g, ' का घन ')
      .replace(/\^([0-9a-zA-Z]+)/g, ' की घात $1 ')
      .replace(/\^/g, ' की घात ')
      .replace(/<=/g, ' से कम या बराबर ')
      .replace(/>=/g, ' से अधिक या बराबर ')
      .replace(/!=/g, ' बराबर नहीं है ')
      .replace(/==/g, ' बराबर ')
      .replace(/=/g, ' बराबर ')
      .replace(/\+/g, ' धन ')
      .replace(/-\s+/g, ' ऋण ')
      .replace(/\*/g, ' गुणा ')
      .replace(/\//g, ' भाग ')
      .replace(/%/g, ' प्रतिशत ');
  } else {
    cleaned = cleaned
      .replace(/\^2\b/g, ' squared ')
      .replace(/\^3\b/g, ' cubed ')
      .replace(/\^([0-9a-zA-Z]+)/g, ' to the power of $1 ')
      .replace(/\^/g, ' to the power of ')
      .replace(/<=/g, ' is less than or equal to ')
      .replace(/>=/g, ' is greater than or equal to ')
      .replace(/!=/g, ' is not equal to ')
      .replace(/==/g, ' equals ')
      .replace(/=/g, ' equals ')
      .replace(/\+/g, ' plus ')
      .replace(/-\s+/g, ' minus ')
      .replace(/\*/g, ' multiplied by ')
      .replace(/\//g, ' divided by ')
      .replace(/%/g, ' percent ');
  }

  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Builds the structured audio narration script according to the exact specification.
 */
function buildReviewSpeechScript(q: QuestionReviewItem, isHindi: boolean, isWalkthrough: boolean = false): string {
  const qNum = q.orderIndex + 1;
  const cleanQText = cleanMathAndTextForSpeech(q.text, isHindi);

  let userSelectedOption = '';
  let correctOptionLetter = '';
  let correctOptionText = '';

  const isChoices = (q.type === 'single-choice' || q.type === 'multiple-choice') && Array.isArray(q.options);
  const hasOfficialAnswerMetadata = q.correctAnswer !== null && q.correctAnswer !== undefined;

  if (isChoices && q.options) {
    // User answer calculation
    if (Array.isArray(q.userAnswer)) {
      const letters = q.options
        .map((opt, i) => q.userAnswer.includes(opt.id) ? String.fromCharCode(65 + i) : null)
        .filter(Boolean);
      userSelectedOption = letters.join(', ');
    } else if (q.userAnswer) {
      const idx = q.options.findIndex(opt => opt.id === q.userAnswer);
      userSelectedOption = idx >= 0 ? String.fromCharCode(65 + idx) : String(q.userAnswer);
    }

    if (hasOfficialAnswerMetadata) {
      // Correct answer calculation
      if (Array.isArray(q.correctAnswer)) {
        const cOpts = q.options
          .map((opt, i) => q.correctAnswer.includes(opt.id) ? { letter: String.fromCharCode(65 + i), text: opt.text } : null)
          .filter(Boolean) as { letter: string; text: string }[];
        correctOptionLetter = cOpts.map(o => o.letter).join(', ');
        correctOptionText = cOpts.map(o => o.text).join('; ');
      } else {
        const idx = q.options.findIndex(opt => opt.id === q.correctAnswer);
        correctOptionLetter = idx >= 0 ? String.fromCharCode(65 + idx) : 'A';
        correctOptionText = idx >= 0 ? q.options[idx].text : String(q.correctAnswer || '');
      }
    }
  } else if (q.type === 'true-false') {
    const uTrue = String(q.userAnswer).toLowerCase() === 'true';
    userSelectedOption = uTrue ? (isHindi ? 'सत्य' : 'True') : (isHindi ? 'असत्य' : 'False');

    if (hasOfficialAnswerMetadata) {
      const cTrue = String(q.correctAnswer).toLowerCase() === 'true';
      correctOptionLetter = cTrue ? (isHindi ? 'सत्य' : 'True') : (isHindi ? 'असत्य' : 'False');
      correctOptionText = correctOptionLetter;
    }
  } else {
    userSelectedOption = String(q.userAnswer || '');
    if (hasOfficialAnswerMetadata) {
      correctOptionLetter = String(q.correctAnswer || '');
      correctOptionText = String(q.correctAnswer || '');
    }
  }

  const cleanCorrectText = hasOfficialAnswerMetadata ? cleanMathAndTextForSpeech(correctOptionText, isHindi) : '';
  const rawExplanation = q.explanation;
  const cleanExplanation = rawExplanation ? cleanMathAndTextForSpeech(rawExplanation, isHindi) : '';

  if (isHindi) {
    const statusText = q.isCorrect
      ? 'सही उत्तर। आपको 1 अंक मिला।'
      : !q.isAnswered
      ? 'अनुत्तरित।'
      : `गलत उत्तर। आपने विकल्प ${userSelectedOption} चुना था।`;

    const correctAnsPhrase = hasOfficialAnswerMetadata
      ? (isChoices
          ? `आधिकारिक सही उत्तर है विकल्प ${correctOptionLetter}: ${cleanCorrectText}।`
          : `आधिकारिक सही उत्तर है: ${cleanCorrectText}।`)
      : 'अधिकारीक उत्तर विवरण इस उपलब्ध परिणाम में उपलब्ध नहीं है।';

    const explanationPart = cleanExplanation ? ` हल और व्याख्या: ${cleanExplanation}.` : ' अतिरिक्त समझ नहीं दी गई।';
    const promptTail = isWalkthrough
      ? ` प्रश्न ${qNum} की समीक्षा पूरी हुई। अगले प्रश्न के लिए 'अगला' बोलें, पिछले के लिए 'पिछला', या दोबारा सुनने के लिए 'दोबारा' बोलें।`
      : '';

    return `प्रश्न ${qNum}. ${cleanQText}. स्थिति: ${statusText} ${correctAnsPhrase}${explanationPart}${promptTail}`;
  } else {
    const statusText = q.isCorrect
      ? 'Correct. You scored 1 mark.'
      : !q.isAnswered
      ? 'Unanswered.'
      : `Incorrect. You selected Option ${userSelectedOption}.`;

    const correctAnsPhrase = hasOfficialAnswerMetadata
      ? (isChoices
          ? `Official Correct Answer is Option ${correctOptionLetter}: ${cleanCorrectText}.`
          : `Official Correct Answer is: ${cleanCorrectText}.`)
      : 'Official answer details are not available in this candidate-safe result.';

    const explanationPart = cleanExplanation ? ` Explanation: ${cleanExplanation}.` : ' No additional explanation is provided.';
    const promptTail = isWalkthrough
      ? ` Review complete for Question ${qNum}. Say Next, Previous, or Repeat.`
      : '';

    return `Question ${qNum}. ${cleanQText}. Status: ${statusText} ${correctAnsPhrase}${explanationPart}${promptTail}`;
  }
}

export function QuestionReviewList({
  questions,
  isLoading = false,
  error = null,
  onRetry,
  isWalkthroughActive: externalWalkthroughActive = false,
  onStop,
  onStopWalkthrough,
}: QuestionReviewListProps) {
  const language = useAccessibilityStore((s) => s.language);
  const isHindi = language === 'hi';

  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');

  // Audio Review Walkthrough States
  const [isAudioReviewActive, setIsAudioReviewActive] = useState<boolean>(false);
  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);
  const [activeReviewIndex, setActiveReviewIndex] = useState<number>(-1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isWaitingForConsent, setIsWaitingForConsent] = useState<boolean>(false);
  const [individualPlayingId, setIndividualPlayingId] = useState<string | null>(null);

  // Utterance Anchor Ref to Prevent Garbage Collection
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isAudioReviewActiveRef = useRef(isAudioReviewActive);
  const isWalkthroughActiveRef = useRef(isWalkthroughActive);
  const activeReviewIndexRef = useRef(activeReviewIndex);
  const isPausedRef = useRef(isPaused);
  const isSpeakingRef = useRef(isSpeaking);
  const isWaitingForConsentRef = useRef(isWaitingForConsent);
  const isHindiRef = useRef(isHindi);
  const isTransitioningRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);

  // Background Listening & Barge-In Refs
  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActionTimestampRef = useRef<number>(0);
  const isRecognitionStartingRef = useRef<boolean>(false);

  useEffect(() => {
    isAudioReviewActiveRef.current = isAudioReviewActive;
  }, [isAudioReviewActive]);

  useEffect(() => {
    isWalkthroughActiveRef.current = isWalkthroughActive;
  }, [isWalkthroughActive]);

  useEffect(() => {
    activeReviewIndexRef.current = activeReviewIndex;
  }, [activeReviewIndex]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    isWaitingForConsentRef.current = isWaitingForConsent;
  }, [isWaitingForConsent]);

  useEffect(() => {
    isHindiRef.current = isHindi;
  }, [isHindi]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (filter === 'correct') return q.isCorrect;
      if (filter === 'incorrect') return q.isAnswered && !q.isCorrect;
      if (filter === 'unanswered') return !q.isAnswered;
      return true;
    });
  }, [questions, filter]);

  const filteredQuestionsRef = useRef(filteredQuestions);
  useEffect(() => {
    filteredQuestionsRef.current = filteredQuestions;
  }, [filteredQuestions]);

  const correctCount = questions.filter((q) => q.isCorrect).length;
  const incorrectCount = questions.filter((q) => q.isAnswered && !q.isCorrect).length;
  const unansweredCount = questions.filter((q) => !q.isAnswered).length;

  const hasSections = questions.some(q => Boolean(q.sectionName));

  // Build section groups if sections exist on questions
  const sectionGroups = useMemo(() => {
    if (!hasSections) return [];
    const groups: Array<{
      name: string;
      total: number;
      correct: number;
      questions: QuestionReviewItem[];
    }> = [];
    const map = new Map<string, QuestionReviewItem[]>();

    questions.forEach(q => {
      const sName = q.sectionName || 'General Assessment';
      if (!map.has(sName)) {
        map.set(sName, []);
      }
      map.get(sName)!.push(q);
    });

    map.forEach((secQuestions, name) => {
      const secCorrect = secQuestions.filter(q => q.isCorrect).length;
      const secFiltered = secQuestions.filter((q) => {
        if (filter === 'correct') return q.isCorrect;
        if (filter === 'incorrect') return q.isAnswered && !q.isCorrect;
        if (filter === 'unanswered') return !q.isAnswered;
        return true;
      });

      groups.push({
        name,
        total: secQuestions.length,
        correct: secCorrect,
        questions: secFiltered,
      });
    });

    return groups;
  }, [hasSections, questions, filter]);

  // Clean timers helper
  const clearAudioTimers = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  // Stop walkthrough helper
  const stopAudioWalkthrough = useCallback(() => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    try {
      clearAudioTimers();
      if (typeof window !== 'undefined') {
        try {
          if (window.speechSynthesis) window.speechSynthesis.cancel();
        } catch (e) {}
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.abort();
        } catch (e) {}
      }
      activeUtteranceRef.current = null;
      if (typeof window !== 'undefined') {
        (window as any).__reviewUtterance = null;
      }
      setIsSpeaking(false);
      setIsAudioReviewActive(false);
      setIsWalkthroughActive(false);
      setActiveReviewIndex(-1);
      setIsPaused(false);
      setIndividualPlayingId(null);

      // Call parent exit callbacks to return to the results dashboard
      if (typeof onStop === 'function') onStop();
      if (typeof onStopWalkthrough === 'function') onStopWalkthrough();
    } finally {
      isStoppingRef.current = false;
    }
  }, [clearAudioTimers, onStop, onStopWalkthrough]);

  // Explicitly start or re-arm the microphone listener safely
  const startListeningSafely = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.abort();
      setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch (err) {
          console.warn("Recognition already active or starting", err);
        }
      }, 100);
    } catch (err) {
      console.warn("Recognition already active or starting", err);
    }
  }, []);

  // 2. STRUCTURED AUDIO SCRIPT BUILDER & SYNTHESIZER
  const readQuestionReview = useCallback((questionIndex: number, isWalkthrough: boolean = false) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const list = filteredQuestionsRef.current;
    if (questionIndex < 0 || questionIndex >= list.length) {
      stopAudioWalkthrough();
      return;
    }

    const currentQ = list[questionIndex];
    if (!currentQ) return;

    // Smoothly scroll the active question card into center view
    const cardEl = document.getElementById(`review-question-${currentQ.questionId}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    clearAudioTimers();

    // 1. Lock the mutex synchronously and kill microphone immediately
    isSpeakingRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    // Cancel prior utterance
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}

    setIsWaitingForConsent(false);

    // Compose narration with explicit review completion prompt for walkthrough
    const narrationText = buildReviewSpeechScript(currentQ, isHindiRef.current, isWalkthrough);
    const utterance = new SpeechSynthesisUtterance(narrationText);
    utterance.lang = isHindiRef.current ? 'hi-IN' : 'en-US';

    const store = useAccessibilityStore.getState();
    utterance.rate = Math.min(1.5, Math.max(0.7, store.speechRate || 1.0));

    const naturalVoice = getHighFidelityVoice(isHindiRef.current ? 'hi-IN' : 'en-US', store.selectedVoiceURI) || getNaturalFemaleVoice(isHindiRef.current ? 'hi' : 'en');
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    // 2. Prevent garbage collection: store active utterance in persistent ref
    activeUtteranceRef.current = utterance;
    (window as any).__reviewUtterance = utterance;

    setActiveReviewIndex(questionIndex);
    setIsPaused(false);

    if (isWalkthrough) {
      setIsAudioReviewActive(true);
      setIsWalkthroughActive(true);
      setIndividualPlayingId(null);
    } else {
      setIndividualPlayingId(currentQ.questionId);
    }

    // Safety watchdog timer (failsafe without runaway skipping)
    const watchdogDuration = Math.min(45000, Math.max(8000, (narrationText.length / 10) * 1000 + 4000));
    watchdogTimerRef.current = setTimeout(() => {
      console.warn('[ReviewWalkthrough] Watchdog timeout for question index', questionIndex);
      if (isAudioReviewActiveRef.current) {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setIsWaitingForConsent(true);
        startListeningSafely();
      } else {
        setIndividualPlayingId(null);
      }
    }, watchdogDuration);

    utterance.onend = () => {
      clearAudioTimers();
      activeUtteranceRef.current = null;
      if (typeof window !== 'undefined') {
        (window as any).__reviewUtterance = null;
      }

      // Unlock the mutex and restart mic with a 300ms debounce to let room echo fade
      setTimeout(() => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        if (isWalkthrough && isAudioReviewActiveRef.current) {
          // STRICT SINGLE-QUESTION ISOLATION:
          // No auto-advancing loops! Stop TTS completely and wait for candidate command.
          setIsWaitingForConsent(true);
          startListeningSafely();
        } else {
          setIndividualPlayingId(null);
        }
      }, 300);
    };

    utterance.onerror = (err) => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      console.warn('[ReviewWalkthrough] Utterance error:', err);
      clearAudioTimers();
      activeUtteranceRef.current = null;
      if (isWalkthrough && isAudioReviewActiveRef.current) {
        setIsWaitingForConsent(true);
        startListeningSafely();
      } else {
        setIndividualPlayingId(null);
      }
    };

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[ReviewWalkthrough] Speech speak failed:', e);
      setIsSpeaking(false);
      stopAudioWalkthrough();
    }
  }, [clearAudioTimers, stopAudioWalkthrough]);

  // 1. UI Toggle Walkthrough Handler
  const toggleWalkthrough = useCallback(() => {
    if (isAudioReviewActive || isWalkthroughActive) {
      stopAudioWalkthrough();
      setIsWalkthroughActive(false);
    } else {
      if (filteredQuestions.length === 0) return;
      setIsWalkthroughActive(true);
      readQuestionReview(activeReviewIndex >= 0 ? activeReviewIndex : 0, true);
    }
  }, [isAudioReviewActive, isWalkthroughActive, activeReviewIndex, filteredQuestions.length, readQuestionReview, stopAudioWalkthrough]);

  useEffect(() => {
    if (externalWalkthroughActive && !isAudioReviewActive && filteredQuestions.length > 0) {
      readQuestionReview(0, true);
    }
  }, [externalWalkthroughActive, isAudioReviewActive, filteredQuestions.length, readQuestionReview]);

  useEffect(() => {
    if (!externalWalkthroughActive && (isWalkthroughActive || isAudioReviewActive)) {
      stopAudioWalkthrough();
    }
  }, [externalWalkthroughActive, isWalkthroughActive, isAudioReviewActive, stopAudioWalkthrough]);

  useEffect(() => {
    const handleStartEvent = () => {
      if (!isAudioReviewActiveRef.current && filteredQuestionsRef.current.length > 0) {
        readQuestionReview(0, true);
      }
    };
    window.addEventListener('examsarthi-start-walkthrough', handleStartEvent);
    return () => window.removeEventListener('examsarthi-start-walkthrough', handleStartEvent);
  }, [readQuestionReview]);

  // Playback Navigation Handlers
  const handlePause = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    setIsPaused(true);
    try {
      window.speechSynthesis.pause();
    } catch (e) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const handleResume = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    setIsPaused(false);
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else if (activeReviewIndexRef.current >= 0 && activeReviewIndexRef.current < filteredQuestionsRef.current.length) {
        readQuestionReview(activeReviewIndexRef.current, true);
      }
    } catch (e) {
      if (activeReviewIndexRef.current >= 0 && activeReviewIndexRef.current < filteredQuestionsRef.current.length) {
        readQuestionReview(activeReviewIndexRef.current, true);
      }
    }
  }, [readQuestionReview]);

  const togglePauseResume = useCallback(() => {
    if (isPaused) {
      handleResume();
    } else {
      handlePause();
    }
  }, [isPaused, handleResume, handlePause]);

  // Command Debounced & State-Locked Next Question
  const handleNextQuestionReview = useCallback(() => {
    if (isTransitioningRef.current) return; // Prevent multiple rapid firings
    isTransitioningRef.current = true;

    clearAudioTimers();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    setIsWaitingForConsent(false);

    const currentIdx = activeReviewIndexRef.current;
    const total = filteredQuestionsRef.current.length;
    const nextIdx = currentIdx < 0 ? 0 : Math.min(currentIdx + 1, total - 1);

    if (nextIdx < total && nextIdx !== currentIdx) {
      readQuestionReview(nextIdx, true);
    } else if (currentIdx === total - 1) {
      // Completed all questions
      const completionMsg = isHindiRef.current 
        ? 'समीक्षा पूर्ण हुई। सभी प्रश्नों की व्याख्या समाप्त हो गई है।' 
        : 'Review walkthrough complete. All question explanations have ended.';
      const store = useAccessibilityStore.getState();
      const utterance = new SpeechSynthesisUtterance(completionMsg);
      utterance.lang = isHindiRef.current ? 'hi-IN' : 'en-US';
      utterance.rate = store.speechRate || 1.0;
      const naturalVoice = getHighFidelityVoice(isHindiRef.current ? 'hi-IN' : 'en-US', store.selectedVoiceURI) || getNaturalFemaleVoice(isHindiRef.current ? 'hi' : 'en');
      // Lock mutex and abort mic before final speech
      isSpeakingRef.current = true;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      try { window.speechSynthesis.cancel(); } catch (e) {}

      utterance.onend = () => {
        setTimeout(() => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          stopAudioWalkthrough();
        }, 300);
      };
      utterance.onerror = () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        stopAudioWalkthrough();
      };
      try {
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        stopAudioWalkthrough();
      }
    }

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 1000);
  }, [clearAudioTimers, readQuestionReview, stopAudioWalkthrough]);

  // Command Debounced & State-Locked Previous Question
  const handlePrevQuestionReview = useCallback(() => {
    if (isTransitioningRef.current) return; // Prevent multiple rapid firings
    isTransitioningRef.current = true;

    clearAudioTimers();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    setIsWaitingForConsent(false);

    const currentIdx = activeReviewIndexRef.current;
    const prevIdx = Math.max(currentIdx - 1, 0);

    if (prevIdx !== currentIdx) {
      readQuestionReview(prevIdx, true);
    } else {
      readQuestionReview(0, true);
    }

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 1000);
  }, [clearAudioTimers, readQuestionReview]);

  // Command Debounced & State-Locked Repeat Question
  const handleRepeatQuestionReview = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    clearAudioTimers();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    setIsWaitingForConsent(false);

    const currentIdx = activeReviewIndexRef.current;
    if (currentIdx >= 0 && currentIdx < filteredQuestionsRef.current.length) {
      readQuestionReview(currentIdx, true);
    }

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 1000);
  }, [clearAudioTimers, readQuestionReview]);

  const handlePrev = handlePrevQuestionReview;
  const handleRepeat = handleRepeatQuestionReview;
  const handleTogglePause = togglePauseResume;
  const handleNext = handleNextQuestionReview;
  const handleStop = stopAudioWalkthrough;

  const goToPreviousQuestion = handlePrevQuestionReview;
  const goToNextQuestion = handleNextQuestionReview;
  const handleNextQuestion = handleNextQuestionReview;
  const handlePrevQuestion = handlePrevQuestionReview;
  const readCurrentQuestion = handleRepeatQuestionReview;

  // Global AI Voice Command Listener for Results Walkthrough
  useEffect(() => {
    const handleVoiceCommand = (e: any) => {
      const { intent, target } = e.detail || {};
      const normalizedTarget = (target || '').toUpperCase();

      if (intent === 'CONTROL' || !intent) {
        if (normalizedTarget === 'NEXT') {
          handleNextQuestion();
        } else if (normalizedTarget === 'PREVIOUS' || normalizedTarget === 'PREV') {
          handlePrevQuestion();
        } else if (normalizedTarget === 'STOP' || normalizedTarget === 'EXIT' || normalizedTarget === 'QUIT') {
          stopAudioWalkthrough();
        } else if (normalizedTarget === 'PAUSE') {
          handleTogglePause();
        } else if (normalizedTarget === 'REPEAT' || normalizedTarget === 'AGAIN') {
          readCurrentQuestion();
        } else if (normalizedTarget === 'RESUME') {
          handleResume();
        }
      }
    };

    const handleNextEvent = () => handleNextQuestion();
    const handlePrevEvent = () => handlePrevQuestion();
    const handleStopEvent = () => stopAudioWalkthrough();
    const handleRepeatEvent = () => readCurrentQuestion();

    window.addEventListener('ai_voice_command', handleVoiceCommand);
    window.addEventListener('examsarthi_review_next', handleNextEvent);
    window.addEventListener('examsarthi_review_prev', handlePrevEvent);
    window.addEventListener('examsarthi_review_stop', handleStopEvent);
    window.addEventListener('examsarthi_review_repeat', handleRepeatEvent);

    return () => {
      window.removeEventListener('ai_voice_command', handleVoiceCommand);
      window.removeEventListener('examsarthi_review_next', handleNextEvent);
      window.removeEventListener('examsarthi_review_prev', handlePrevEvent);
      window.removeEventListener('examsarthi_review_stop', handleStopEvent);
      window.removeEventListener('examsarthi_review_repeat', handleRepeatEvent);
    };
  }, [handleNextQuestionReview, handlePrevQuestionReview, stopAudioWalkthrough, handleRepeatQuestionReview, handleResume, handleTogglePause]);

  // 4. Individual Question Explanation Handler
  const handlePlayIndividualQuestion = useCallback((q: QuestionReviewItem) => {
    if (individualPlayingId === q.questionId) {
      // Toggle off if already playing
      stopAudioWalkthrough();
      return;
    }

    const idx = filteredQuestions.findIndex(item => item.questionId === q.questionId);
    if (idx >= 0) {
      readQuestionReview(idx, false);
    }
  }, [individualPlayingId, filteredQuestions, readQuestionReview, stopAudioWalkthrough]);

  // 5. Barge-In Voice Navigation & Playback Controls during Audio Walkthrough
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isListeningNeeded = isAudioReviewActive || isSpeaking || isWaitingForConsent;
    if (!isListeningNeeded) {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
      isRecognitionStartingRef.current = false;
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return;
    }

    let recognition: any = null;
    let isDisposed = false;

    const pauseCommands = ["pause", "wait", "hold", "stop speaking", "रुको", "रुकिए", "पॉज़"];
    const resumeCommands = ["resume", "play", "continue", "चालू", "आगे बोलो"];
    const nextCommands = ["next", "proceed", "yes", "continue", "agla", "आगे", "अगला", "हाँ"];
    const prevCommands = ["previous", "back", "pichla", "पिछला", "पीछे"];
    const repeatCommands = ["repeat", "again", "dobara", "दोबारा"];
    const stopCommands = ["stop", "close review", "exit", "बंद करो", "close"];

    const matchesList = (phrase: string, keywords: string[]) => {
      if (!phrase) return false;
      const words = phrase.split(/\s+/);
      return keywords.some((k) => phrase === k || phrase.includes(k) || words.includes(k));
    };

    const startRecognitionInstance = () => {
      if (isDisposed || (!isAudioReviewActiveRef.current && !isSpeakingRef.current && !isWaitingForConsentRef.current)) return;
      if (isRecognitionStartingRef.current) return;

      try {
        if (recognition) {
          try {
            recognition.onend = null;
            recognition.onerror = null;
            recognition.onresult = null;
            recognition.abort();
          } catch (e) {}
        }

        recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 5;
        recognition.lang = isHindiRef.current ? 'hi-IN' : 'en-US';

        recognition.onstart = () => {
          isRecognitionStartingRef.current = false;
        };

        recognition.onresult = (event: any) => {
          if (!isAudioReviewActiveRef.current && !isWalkthroughActiveRef.current && !isWaitingForConsentRef.current && !isSpeakingRef.current) return;
          if (!event.results || !event.results[0] || !event.results[0][0]) return;

          const rawTranscript = event.results[event.results.length - 1]?.[0]?.transcript || event.results[0][0].transcript;
          const cleanCmd = rawTranscript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();

          const isPause = matchesList(cleanCmd, pauseCommands);
          const isResume = matchesList(cleanCmd, resumeCommands);
          const isNext = matchesList(cleanCmd, nextCommands);
          const isPrev = matchesList(cleanCmd, prevCommands);
          const isRepeat = matchesList(cleanCmd, repeatCommands);
          const isStop = matchesList(cleanCmd, stopCommands) || cleanCmd.includes("stop") || cleanCmd.includes("exit") || cleanCmd.includes("quit");

          // CRITICAL: Stop voice command executes immediately with zero cooldown lock
          if (isStop) {
            handleStop();
            return;
          }

          // Barge-in: If the system is currently speaking, ONLY accept explicit review barge-in commands!
          // Filter out room echo / TTS audio that does not match an explicit review control keyword.
          if (((window as any).isSystemSpeaking === true || isSpeakingRef.current) && !isPause && !isResume && !isNext && !isPrev && !isRepeat && !isStop) {
            return;
          }

          const now = Date.now();
          if (now - lastActionTimestampRef.current < 1500) {
            console.warn("BLOCKED MULTI-FIRE: Command ignored due to 1.5s cooldown lock.");
            return;
          }

          if (isPause) {
            lastActionTimestampRef.current = now;
            handleTogglePause();
          } else if (isResume) {
            lastActionTimestampRef.current = now;
            handleResume();
          } else if (isNext) {
            lastActionTimestampRef.current = now;
            handleNext();
          } else if (isPrev) {
            lastActionTimestampRef.current = now;
            handlePrev();
          } else if (isRepeat) {
            lastActionTimestampRef.current = now;
            handleRepeat();
          } else if (isStop) {
            lastActionTimestampRef.current = now;
            handleStop();
          } else if (cleanCmd && cleanCmd.length > 1) {
            // Asynchronously query AI Intent router for complex natural language commands
            fetchAIIntent(cleanCmd).catch((err) => {
              console.warn('[ReviewIntent] Failed to resolve AI intent:', err);
            });
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'aborted' || event.error === 'no-speech') {
            return;
          }
          console.warn('[ReviewBargeIn] Recognition error:', event.error);
        };

        recognition.onend = () => {
          isRecognitionStartingRef.current = false;
          if (isDisposed) return;

          const isWalkthroughCurrentlyActive = isAudioReviewActiveRef.current;
          const isSpeakingNow = isSpeakingRef.current;

          // Auto-reconnect in recognition.onend: if walkthrough is active and !isSpeaking, restart listening after a 200ms delay.
          if (isWalkthroughCurrentlyActive && !isSpeakingNow) {
            if (restartTimerRef.current) {
              clearTimeout(restartTimerRef.current);
            }
            restartTimerRef.current = setTimeout(() => {
              if (!isDisposed && isAudioReviewActiveRef.current && !isSpeakingRef.current) {
                try {
                  recognitionRef.current?.start();
                } catch (err) {
                  try {
                    startRecognitionInstance();
                  } catch (reErr) {
                    console.warn("Recognition already active or starting", err);
                  }
                }
              }
            }, 200);
          }
        };

        isRecognitionStartingRef.current = true;
        recognition.start();
      } catch (err: any) {
        isRecognitionStartingRef.current = false;
        if (!isDisposed && isAudioReviewActiveRef.current && !isSpeakingRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (!isDisposed && isAudioReviewActiveRef.current && !isSpeakingRef.current) {
              startRecognitionInstance();
            }
          }, 200);
        }
      }
    };

    startRecognitionInstance();

    return () => {
      isDisposed = true;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (recognition) {
        try {
          recognition.onend = null;
          recognition.onerror = null;
          recognition.onresult = null;
          recognition.abort();
        } catch (e) {}
      }
      recognitionRef.current = null;
      isRecognitionStartingRef.current = false;
    };
  }, [isAudioReviewActive, isSpeaking, isWaitingForConsent, handleNext, handlePrev, handleRepeat, handleTogglePause, handleStop]);

  // Keyboard Shortcuts: Alt+A (Toggle Walkthrough), Alt+P (Prev), Alt+N (Next), Alt+R (Repeat), Space (Pause/Resume), Escape (Stop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Alt+A -> Toggle Audio Walkthrough
      if (e.altKey && (e.key === 'a' || e.key === 'A' || e.code === 'KeyA')) {
        e.preventDefault();
        toggleWalkthrough();
        return;
      }

      // Playback shortcuts when Walkthrough is active
      if (isAudioReviewActiveRef.current) {
        // Alt+P -> Previous
        if (e.altKey && (e.key === 'p' || e.key === 'P' || e.code === 'KeyP')) {
          e.preventDefault();
          handlePrevQuestionReview();
          return;
        }

        // Alt+N -> Next
        if (e.altKey && (e.key === 'n' || e.key === 'N' || e.code === 'KeyN')) {
          e.preventDefault();
          handleNextQuestionReview();
          return;
        }

        // Alt+R -> Repeat
        if (e.altKey && (e.key === 'r' || e.key === 'R' || e.code === 'KeyR')) {
          e.preventDefault();
          handleRepeatQuestionReview();
          return;
        }

        // Space -> Pause / Resume
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          togglePauseResume();
          return;
        }

        // Escape -> Stop
        if (e.key === 'Escape' || e.code === 'Escape') {
          e.preventDefault();
          stopAudioWalkthrough();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleWalkthrough, handlePrevQuestionReview, handleNextQuestionReview, handleRepeatQuestionReview, togglePauseResume, stopAudioWalkthrough]);

  // Clean up speech on component unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
    };
  }, []);

  // Reset active review when filter changes
  useEffect(() => {
    if (isAudioReviewActive) {
      stopAudioWalkthrough();
    }
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div 
        className="space-y-4 pt-4"
        role="status"
        aria-live="polite"
        aria-label="Loading question-by-question review"
      >
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="h-9 w-64 bg-muted animate-pulse rounded" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border border-border/60 animate-pulse">
            <CardHeader className="space-y-2 pb-3">
              <div className="flex gap-2">
                <div className="h-5 w-20 bg-muted rounded" />
                <div className="h-5 w-24 bg-muted rounded" />
              </div>
              <div className="h-5 w-3/4 bg-muted rounded" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-10 w-full bg-muted/60 rounded" />
              <div className="h-10 w-full bg-muted/60 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5" role="alert">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-sm font-semibold text-destructive">
              Unable to load question review
            </p>
            <p className="text-xs text-muted-foreground">
              {error}
            </p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
              Retry Review
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return null;
  }

  const activeHighlightedQuestionId = activeReviewIndex >= 0 && activeReviewIndex < filteredQuestions.length
    ? filteredQuestions[activeReviewIndex]?.questionId
    : null;

  const currentIndex = activeReviewIndex;
  const totalQuestions = filteredQuestions.length;


  return (
    <>
      <section 
        aria-labelledby="question-review-heading" 
        className="space-y-6 pt-4 border-t border-border/60 relative pb-28"
      >
        {/* Header and Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div className="space-y-1">
            <h2 id="question-review-heading" className="font-heading text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 flex-wrap">
              <span>Question-by-Question Review</span>
              {hasSections && (
                <Badge variant="outline" className="text-2xs font-semibold text-primary border-primary/30 bg-primary/10">
                  <Layers className="size-3 mr-1" aria-hidden="true" />
                  Sectional Breakdown
                </Badge>
              )}
              {/* Add this explicitly next to your "Sectional Breakdown" header */}
              <button 
                onClick={toggleWalkthrough} 
                className="ml-4 px-4 py-2 bg-[#ffed00] text-black font-bold rounded-lg shadow-md hover:bg-[#ffe100] transition-colors z-10"
              >
                {isWalkthroughActive ? "⏹ Stop Audio Review" : "🔊 Start Audio Walkthrough"}
              </button>
            </h2>
            <p className="text-sm text-muted-foreground">
              Official evaluation comparing your responses against verified answer keys.
            </p>
          </div>

        {/* Right side controls: Audio Walkthrough Toggle Button & Filter Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. UI Toggle Button in the Section Header */}
          <button
            type="button"
            role="switch"
            aria-checked={isAudioReviewActive}
            onClick={toggleWalkthrough}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[4px] text-xs transition-all cursor-pointer select-none",
              isAudioReviewActive
                ? "bg-[#ffed00] text-black font-bold ring-2 ring-[#ffed00] shadow-[0_0_15px_rgba(255,237,0,0.35)]"
                : "bg-neutral-900 text-white/80 border border-white/20 hover:text-white hover:border-white/40"
            )}
            title="Toggle Audio Walkthrough (Alt+A)"
          >
            {isAudioReviewActive ? (
              <Volume2 className="size-4 animate-pulse text-black" aria-hidden="true" />
            ) : (
              <Volume2 className="size-4 text-white/80" aria-hidden="true" />
            )}
            <span>Audio Walkthrough</span>
            <kbd className={cn(
              "px-1.5 py-0.5 text-2xs font-mono rounded",
              isAudioReviewActive ? "bg-black text-[#ffed00] font-bold" : "bg-neutral-800 text-white/70"
            )}>
              Alt+A
            </kbd>
          </button>

          {/* Filter Badges */}
          <div 
            className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/50 rounded-[2px] border border-border/40"
            role="group"
            aria-label="Filter questions by outcome"
          >
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring",
                filter === 'all'
                  ? "bg-background text-foreground shadow-none border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={filter === 'all'}
            >
              All ({questions.length})
            </button>

            <button
              type="button"
              onClick={() => setFilter('correct')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring flex items-center gap-1",
                filter === 'correct'
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-none border border-emerald-500/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={filter === 'correct'}
            >
              <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Correct ({correctCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('incorrect')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring flex items-center gap-1",
                filter === 'incorrect'
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 shadow-none border border-rose-500/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={filter === 'incorrect'}
            >
              <XCircle className="size-3 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              <span>Incorrect ({incorrectCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('unanswered')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring flex items-center gap-1",
                filter === 'unanswered'
                  ? "bg-slate-500/10 text-slate-700 dark:text-slate-300 shadow-none border border-slate-500/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={filter === 'unanswered'}
            >
              <MinusCircle className="size-3 text-muted-foreground" aria-hidden="true" />
              <span>Unanswered ({unansweredCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Questions List (Grouped by Section if sectional, Flat if not) */}
      <div className="space-y-6">
        {filteredQuestions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground rounded-[2px] border border-dashed border-border">
            No questions match the selected filter &quot;{filter}&quot;.
          </div>
        ) : hasSections ? (
          sectionGroups.map((group) => {
            if (group.questions.length === 0) return null;
            const accuracy = group.total > 0 ? Math.round((group.correct / group.total) * 100) : 0;
            return (
              <div key={group.name} className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3.5 rounded-none bg-muted/30 border border-primary/20">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-[2px] bg-primary/10 text-primary font-bold text-xs">
                      <Layers className="size-3.5" aria-hidden="true" />
                    </span>
                    <div>
                      <span className="text-sm font-bold text-foreground">
                        Section: {group.name}
                      </span>
                      <span className="text-2xs text-muted-foreground ml-2">
                        ({group.total} Questions)
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {group.correct}/{group.total} Correct ({accuracy}%)
                  </Badge>
                </div>

                <div className="space-y-4">
                  {group.questions.map((q) => {
                    const isCardActive = (isAudioReviewActive && activeHighlightedQuestionId === q.questionId) || individualPlayingId === q.questionId;
                    return (
                      <QuestionReviewCard 
                        key={q.questionId} 
                        q={q} 
                        isActiveInWalkthrough={isCardActive}
                        isIndividualPlaying={individualPlayingId === q.questionId}
                        onPlayIndividual={() => handlePlayIndividualQuestion(q)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          filteredQuestions.map((q) => {
            const isCardActive = (isAudioReviewActive && activeHighlightedQuestionId === q.questionId) || individualPlayingId === q.questionId;
            return (
              <QuestionReviewCard 
                key={q.questionId} 
                q={q} 
                isActiveInWalkthrough={isCardActive}
                isIndividualPlaying={individualPlayingId === q.questionId}
                onPlayIndividual={() => handlePlayIndividualQuestion(q)}
              />
            );
          })
        )}
      </div>
    </section>

    {/* Floating dock placed at the very bottom of the component return statement, outside of any scrolling containers */}
    {isWalkthroughActive && (
      <div 
        role="toolbar"
        aria-label="Audio review walkthrough controls"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-2.5 rounded-full bg-neutral-950/95 border border-[#ffed00]/50 shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-white max-w-[96vw] overflow-x-auto"
      >
        {/* Left Segment: Question counter badge */}
        <span className="text-xs font-mono font-bold text-[#ffed00] bg-[#ffed00]/10 border border-[#ffed00]/30 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
          Q{Math.max(1, activeReviewIndex + 1)} of {filteredQuestions.length}
        </span>

        {/* Center Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/40 text-xs font-medium text-emerald-300 whitespace-nowrap shrink-0">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{isSpeaking ? "Explaining..." : "Listening (Say 'Next', 'Previous', 'Repeat')"}</span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            className="px-3 py-1.5 text-xs font-medium bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg cursor-pointer text-white"
          >
            ‹ Prev
          </button>
          <button
            type="button"
            onClick={handleRepeat}
            className="px-3 py-1.5 text-xs font-medium bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg cursor-pointer text-white"
          >
            ↻ Repeat
          </button>
          <button
            type="button"
            onClick={handleTogglePause}
            className="px-4 py-1.5 text-xs font-bold bg-[#ffed00] text-black hover:bg-[#ffe100] rounded-lg cursor-pointer"
          >
            {isPaused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="px-3 py-1.5 text-xs font-medium bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg cursor-pointer text-white"
          >
            Next ›
          </button>
          <button
            type="button"
            onClick={handleStop}
            className="px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 border border-rose-900/40 bg-rose-950/20 rounded-lg cursor-pointer"
          >
            ✕ Stop
          </button>
        </div>
      </div>
    )}
  </>
  );
}

interface QuestionReviewCardProps {
  q: QuestionReviewItem;
  isActiveInWalkthrough: boolean;
  isIndividualPlaying: boolean;
  onPlayIndividual: () => void;
}

function QuestionReviewCard({ 
  q, 
  isActiveInWalkthrough, 
  isIndividualPlaying,
  onPlayIndividual 
}: QuestionReviewCardProps) {
  const displayIndex = q.orderIndex + 1;
  const isSingleOrMulti = q.type === 'single-choice' || q.type === 'multiple-choice';

  return (
    <Card 
      id={`review-question-${q.questionId}`}
      className={cn(
        "border transition-all duration-300 shadow-none scroll-mt-24",
        isActiveInWalkthrough
          ? "border-2 border-[#ffed00] shadow-[0_0_20px_rgba(255,237,0,0.25)] ring-1 ring-[#ffed00]/60 bg-card"
          : q.isCorrect 
            ? "border-emerald-500/30 bg-card hover:border-emerald-500/50" 
            : q.isAnswered 
              ? "border-rose-500/30 bg-card hover:border-rose-500/50" 
              : "border-border/80 bg-card hover:border-border"
      )}
    >
      <CardHeader className="pb-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
              Q{displayIndex}
            </span>

            {/* 4. Individual Question Audio Button */}
            <button
              type="button"
              onClick={onPlayIndividual}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-2xs font-semibold transition-all border cursor-pointer select-none",
                isIndividualPlaying
                  ? "bg-[#ffed00] text-black border-[#ffed00] font-bold shadow-[0_0_12px_rgba(255,237,0,0.4)] animate-pulse"
                  : "bg-muted/60 text-muted-foreground border-border hover:text-foreground hover:bg-muted"
              )}
              title={isIndividualPlaying ? "Stop Explanation" : "Listen to Explanation"}
              aria-label={isIndividualPlaying ? `Stop Explanation for Question ${displayIndex}` : `Listen to Explanation for Question ${displayIndex}`}
            >
              {isIndividualPlaying ? (
                <>
                  <Volume2 className="size-3 text-black animate-pulse" aria-hidden="true" />
                  <span>Playing Explanation</span>
                </>
              ) : (
                <>
                  <Volume2 className="size-3" aria-hidden="true" />
                  <span>Listen to Explanation</span>
                </>
              )}
            </button>

            {q.sectionName && (
              <Badge variant="outline" className="text-2xs font-semibold">
                {q.sectionName}
              </Badge>
            )}
            <Badge variant="secondary" className="text-2xs font-semibold">
              {q.subject}
            </Badge>
            {q.topic && (
              <span className="text-2xs text-muted-foreground">
                • {q.topic}
              </span>
            )}
          </div>

          {/* Status Pill */}
          {q.isCorrect ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-semibold gap-1">
              <Check className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Correct (+1 mark)</span>
            </Badge>
          ) : q.isAnswered ? (
            <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-xs font-semibold gap-1">
              <X className="size-3 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              <span>Incorrect (0 marks)</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground text-xs font-semibold gap-1">
              <MinusCircle className="size-3" aria-hidden="true" />
              <span>Unanswered (0 marks)</span>
            </Badge>
          )}
        </div>

        {/* Question Text */}
        <CardTitle className="font-heading text-base md:text-lg font-semibold text-foreground pt-1 leading-relaxed">
          {q.text}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Multiple Choice / Single Choice Options Render */}
        {isSingleOrMulti && Array.isArray(q.options) && (
          <div className="space-y-2">
            {q.options.map((opt, optIdx) => {
              const optLetter = String.fromCharCode(65 + optIdx);
              const isUserAnswer = Array.isArray(q.userAnswer)
                ? q.userAnswer.includes(opt.id)
                : q.userAnswer === opt.id;
              
              const isCorrectOption = Array.isArray(q.correctAnswer)
                ? q.correctAnswer.includes(opt.id)
                : q.correctAnswer === opt.id;

              let optionStyle = "border-border/60 bg-muted/10 text-foreground";
              let badgeIndicator = null;

              if (isCorrectOption && isUserAnswer) {
                optionStyle = "border-emerald-500/50 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 font-medium";
                badgeIndicator = (
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Check className="size-3" aria-hidden="true" /> Your Correct Answer
                  </span>
                );
              } else if (isCorrectOption && !isUserAnswer) {
                optionStyle = "border-emerald-500/40 bg-emerald-500/5 text-foreground";
                badgeIndicator = (
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                    <Check className="size-3" aria-hidden="true" /> Correct Answer
                  </span>
                );
              } else if (isUserAnswer && !isCorrectOption) {
                optionStyle = "border-rose-500/50 bg-rose-500/10 text-rose-950 dark:text-rose-100 font-medium";
                badgeIndicator = (
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <X className="size-3" aria-hidden="true" /> Your Answer (Incorrect)
                  </span>
                );
              }

              return (
                <div
                  key={opt.id}
                  className={cn(
                    "p-3 rounded-[2px] border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm transition-colors",
                    optionStyle
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="size-6 rounded-md bg-muted flex items-center justify-center text-xs font-bold font-mono shrink-0">
                      {optLetter}
                    </span>
                    <span className="text-sm leading-snug">{opt.text}</span>
                  </div>
                  {badgeIndicator && (
                    <div className="shrink-0 self-start sm:self-auto ml-8 sm:ml-0">
                      {badgeIndicator}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* True / False Render */}
        {q.type === 'true-false' && (
          <div className="grid grid-cols-2 gap-3">
            {['true', 'false'].map((val) => {
              const isUserAnswer = String(q.userAnswer ?? '').toLowerCase() === val;
              const isCorrectOption = q.correctAnswer !== null && q.correctAnswer !== undefined && String(q.correctAnswer).toLowerCase() === val;

              let borderBg = "border-border bg-muted/10";
              if (isCorrectOption && isUserAnswer) {
                borderBg = "border-emerald-500/50 bg-emerald-500/10 font-medium";
              } else if (isCorrectOption && !isUserAnswer) {
                borderBg = "border-emerald-500/40 bg-emerald-500/5";
              } else if (isUserAnswer && !isCorrectOption) {
                borderBg = "border-rose-500/50 bg-rose-500/10 font-medium";
              }

              return (
                <div 
                  key={val} 
                  className={cn("p-3 rounded-[2px] border text-center text-sm capitalize flex flex-col items-center justify-center gap-1", borderBg)}
                >
                  <span className="font-semibold">{val}</span>
                  {isCorrectOption && isUserAnswer && (
                    <span className="text-2xs text-emerald-600 dark:text-emerald-400 font-semibold">✓ Your Correct Choice</span>
                  )}
                  {isCorrectOption && !isUserAnswer && (
                    <span className="text-2xs text-emerald-600 dark:text-emerald-400 font-semibold">✓ Correct Answer</span>
                  )}
                  {isUserAnswer && !isCorrectOption && (
                    <span className="text-2xs text-rose-600 dark:text-rose-400 font-semibold">✗ Your Choice</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Short Answer / Fill in the Blank Render */}
        {(q.type === 'short-answer' || q.type === 'fill-blank') && (
          <div className="space-y-2 p-3 rounded-[2px] bg-muted/30 border border-border/60 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-semibold text-muted-foreground">Your Submitted Answer:</span>
              <span className={cn(
                "font-mono font-medium px-2 py-0.5 rounded text-xs",
                q.isCorrect ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
              )}>
                {q.userAnswer ? String(q.userAnswer) : '(No response provided)'}
              </span>
            </div>
            {q.correctAnswer !== null && q.correctAnswer !== undefined && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-2 border-t border-border/40">
                <span className="text-xs font-semibold text-muted-foreground">Official Accepted Answer(s):</span>
                <span className="font-mono text-xs text-foreground font-semibold">
                  {[q.correctAnswer, ...(q.acceptableAnswers || [])].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Explanation Box */}
        {q.explanation && (
          <div className="p-3.5 rounded-[2px] bg-primary/5 border border-primary/20 space-y-1.5 text-xs text-foreground">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <Lightbulb className="size-3.5" aria-hidden="true" />
              <span>Explanation & Solution</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {q.explanation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
