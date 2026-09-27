"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { playVoiceFeedbackChime } from '@/lib/voice/intent-parser';
import { matchExamIntent } from '@/lib/voice/exam-intents';
import { ExamState, announceToScreenReader } from '@/lib/useExamEngine';
import { CandidateQuestion } from '@/types/question';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import {
  useVoiceEngine,
  speakText,
  startListening,
  stopListening,
  requestMicAccess,
} from '@/lib/voice/useVoiceEngine';

export type VoiceStatus =
  | 'Ready'
  | 'RequestingPermission'
  | 'Listening'
  | 'Processing'
  | 'Speaking'
  | 'Error'
  | 'Unsupported';

interface UseVoiceModeProps {
  actions: {
    selectAnswer: (qId: string, oId: string) => void;
    setAnswer?: (qId: string, answer: any) => void;
    toggleOption?: (qId: string, oId: string) => void;
    goToNext: () => void;
    goToPrevious: () => void;
    goToQuestion: (idx: number) => void;
    submitExam: () => void;
    toggleFlag?: (qId: string) => void;
    goToNextSection?: () => void;
  };
  state: ExamState;
  currentQuestion: CandidateQuestion;
  totalQuestions: number;
  questions?: CandidateQuestion[];
  activeSection?: { id?: string; name: string; duration_minutes: number; question_count?: number } | null;
  sectionTimeRemaining?: number;
  onOpenSubmitDialog?: () => void;
  onCloseSubmitDialog?: () => void;
  onStartExam?: () => void;
}

export function useVoiceMode({
  actions,
  state,
  currentQuestion,
  totalQuestions,
  questions,
  activeSection,
  sectionTimeRemaining,
  onOpenSubmitDialog,
  onCloseSubmitDialog,
}: UseVoiceModeProps) {
  const language = useAccessibilityStore((s) => s.language);
  const isHindi = language === 'hi';

  const [isActive, setIsActive] = useState<boolean>(true);
  const [status, setStatus] = useState<VoiceStatus>('Listening');
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [lastHeardTranscript, setLastHeardTranscript] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string>('Listening (mic is hot)');
  const [lastActionFeedback, setLastActionFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        Boolean((window as any).__examsarthi_audio_unlocked) ||
        sessionStorage.getItem('examAudioUnlocked') === 'true'
      );
    }
    return false;
  });

  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // References to preserve state across callbacks
  const actionsRef = useRef(actions);
  const stateRef = useRef(state);
  const currentQuestionRef = useRef(currentQuestion);
  const questionsRef = useRef(questions);
  const languageRef = useRef(language);
  const isActiveRef = useRef(true);
  const userManuallyMutedRef = useRef(false);
  const lastReadIndexRef = useRef<number>(-1);
  const hasInitializedMountRef = useRef(false);
  const pendingActionRef = useRef<string | null>(null);
  const onCloseSubmitDialogRef = useRef(onCloseSubmitDialog);

  useEffect(() => { actionsRef.current = actions; }, [actions]);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { currentQuestionRef.current = currentQuestion; }, [currentQuestion]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { pendingActionRef.current = pendingAction; }, [pendingAction]);
  useEffect(() => { onCloseSubmitDialogRef.current = onCloseSubmitDialog; }, [onCloseSubmitDialog]);

  // Action handlers
  const handleSelectOption = useCallback((optionIndex: number) => {
    const q = currentQuestionRef.current;
    if (!q || !q.options || optionIndex < 0 || optionIndex >= q.options.length) return;
    const opt = q.options[optionIndex];
    if (actionsRef.current.setAnswer) {
      actionsRef.current.setAnswer(q.id, opt.id);
    }
    actionsRef.current.selectAnswer(q.id, opt.id);
    const letter = String.fromCharCode(65 + optionIndex);
    const feedbackText = languageRef.current === 'hi' ? `विकल्प ${letter} चुना गया` : `Option ${letter} selected`;
    setLastActionFeedback(`✓ ${feedbackText}`);
    announceToScreenReader(feedbackText);
  }, []);

  const handleNextQuestion = useCallback(() => {
    const s = stateRef.current;
    const qList = questionsRef.current;
    const maxIdx = (qList?.length ?? totalQuestions) - 1;
    if (s.currentQuestionIndex < maxIdx) {
      actionsRef.current.goToNext();
      const feedback = languageRef.current === 'hi' ? 'अगला प्रश्न' : 'Next question';
      setLastActionFeedback(`✓ ${feedback}`);
      announceToScreenReader(feedback);
    } else {
      const atLast = languageRef.current === 'hi' ? 'यह अंतिम प्रश्न है।' : 'You are at the last question.';
      setLastActionFeedback(atLast);
      speakText(atLast, languageRef.current === 'hi' ? 'hi-IN' : 'en-US', () => {
        if (isActiveRef.current && !userManuallyMutedRef.current) {
          startListening(languageRef.current === 'hi' ? 'hi-IN' : 'en-US');
        }
      });
    }
  }, [totalQuestions]);

  const handlePrevQuestion = useCallback(() => {
    const s = stateRef.current;
    if (s.currentQuestionIndex > 0) {
      actionsRef.current.goToPrevious();
      const feedback = languageRef.current === 'hi' ? 'पिछला प्रश्न' : 'Previous question';
      setLastActionFeedback(`✓ ${feedback}`);
      announceToScreenReader(feedback);
    } else {
      const atFirst = languageRef.current === 'hi' ? 'यह पहला प्रश्न है।' : 'You are at the first question.';
      setLastActionFeedback(atFirst);
      speakText(atFirst, languageRef.current === 'hi' ? 'hi-IN' : 'en-US', () => {
        if (isActiveRef.current && !userManuallyMutedRef.current) {
          startListening(languageRef.current === 'hi' ? 'hi-IN' : 'en-US');
        }
      });
    }
  }, []);

  const handleClearAnswer = useCallback(() => {
    const q = currentQuestionRef.current;
    if (!q) return;
    if (actionsRef.current.setAnswer) {
      actionsRef.current.setAnswer(q.id, '');
    }
    const cleared = languageRef.current === 'hi' ? 'उत्तर साफ़ किया गया।' : 'Answer cleared.';
    setLastActionFeedback(`✓ ${cleared}`);
    announceToScreenReader(cleared);
    speakText(cleared, languageRef.current === 'hi' ? 'hi-IN' : 'en-US', () => {
      if (isActiveRef.current && !userManuallyMutedRef.current) {
        startListening(languageRef.current === 'hi' ? 'hi-IN' : 'en-US');
      }
    });
  }, []);

  const handleSubmitTrigger = useCallback(() => {
    if (onOpenSubmitDialog) onOpenSubmitDialog();
    setPendingAction('submit_exam');
    pendingActionRef.current = 'submit_exam';
    const promptText = languageRef.current === 'hi'
      ? 'क्या आप परीक्षा सबमिट करना चाहते हैं? हाँ या ना बोलें।'
      : 'Do you want to submit the exam? Say yes to confirm or no to cancel.';
    speakText(promptText, languageRef.current === 'hi' ? 'hi-IN' : 'en-US', () => {
      if (isActiveRef.current && !userManuallyMutedRef.current) {
        startListening(languageRef.current === 'hi' ? 'hi-IN' : 'en-US');
      }
    });
  }, [onOpenSubmitDialog]);

  // Sequential Audio Cycle: 1. Load Question & Auto-Read
  const readQuestion = useCallback((index: number) => {
    const questionsList = questionsRef.current;
    const targetQ = (questionsList && questionsList[index]) ? questionsList[index] : currentQuestionRef.current;
    if (!targetQ) return;

    const isHi = languageRef.current === 'hi';
    const speechLang = isHi ? 'hi-IN' : 'en-US';

    const getOptText = (opt: any) => {
      if (!opt) return '';
      return typeof opt === 'string' ? opt : (opt.text || '');
    };
    const opts = targetQ.options || [];
    const optA = getOptText(opts[0]);
    const optB = getOptText(opts[1]);
    const optC = getOptText(opts[2]);
    const optD = getOptText(opts[3]);

    // Sequential Audio Cycle:
    // Format text: "Question " + (index + 1) + ". " + questionText + ". Option A: " + optA + ". Option B: " + optB + ". Option C: " + optC + ". Option D: " + optD
    let textToRead = '';
    if (targetQ.type === 'true-false') {
      textToRead = isHi
        ? `प्रश्न ${index + 1}. ${targetQ.text}. विकल्प: सत्य या असत्य।`
        : `Question ${index + 1}. ${targetQ.text}. Options: True or False.`;
    } else {
      textToRead = isHi
        ? `प्रश्न ${index + 1}. ${targetQ.text}. ${optA ? `विकल्प ए: ${optA}. ` : ''}${optB ? `विकल्प बी: ${optB}. ` : ''}${optC ? `विकल्प सी: ${optC}. ` : ''}${optD ? `विकल्प डी: ${optD}.` : ''}`.trim()
        : `Question ${index + 1}. ${targetQ.text}. Option A: ${optA}. Option B: ${optB}. Option C: ${optC}. Option D: ${optD}.`;
    }

    lastReadIndexRef.current = index;
    setStatus('Speaking');
    setVoiceStatus('Reading question...');

    // 2. Wait until speaking completely finishes before starting the mic listener!
    speakText(textToRead, speechLang, () => {
      if (isActiveRef.current && !userManuallyMutedRef.current) {
        setStatus('Listening');
        setVoiceStatus('Listening (mic is hot)');
        startListening(speechLang);
      } else {
        setStatus('Ready');
      }
    });
  }, []);

  const readCurrentQuestion = useCallback(() => {
    readQuestion(stateRef.current.currentQuestionIndex);
  }, [readQuestion]);

  // 3. On Microphone Input: Intelligent intent & token matching
  const handleCapturedSpeech = useCallback((raw: string) => {
    if (!isActiveRef.current || userManuallyMutedRef.current) return;

    setLastHeardTranscript(raw);
    setLastCommand(raw);
    setLastTranscript(raw);
    setVoiceStatus(`Captured: "${raw}"`);

    const transcript = (raw || '').toLowerCase().trim();
    const isHi = languageRef.current === 'hi';
    const speechLang = isHi ? 'hi-IN' : 'en-US';

    // Two-step confirmation active (e.g. submit exam)
    if (pendingActionRef.current) {
      if (/^(yes|yeah|sure|confirm|submit|proceed|haan|sahi|thik\s*hai|हाँ|हां|सबमिट|पुष्टि)/i.test(transcript)) {
        playVoiceFeedbackChime();
        setPendingAction(null);
        pendingActionRef.current = null;
        if (onCloseSubmitDialogRef.current) onCloseSubmitDialogRef.current();
        actionsRef.current.submitExam();
        const confMsg = isHi ? 'परीक्षा सबमिट कर दी गई है।' : 'Exam submitted.';
        setLastActionFeedback(`✓ ${confMsg}`);
        speakText(confMsg, speechLang, () => {
          setIsActive(false);
          isActiveRef.current = false;
        });
        return;
      } else if (/^(no|nope|cancel|nahi|nahin|chhodo|नहीं|ना|रद्द|छोड़ो)/i.test(transcript)) {
        playVoiceFeedbackChime();
        setPendingAction(null);
        pendingActionRef.current = null;
        if (onCloseSubmitDialogRef.current) onCloseSubmitDialogRef.current();
        const cancelMsg = isHi ? 'कार्रवाई रद्द की गई।' : 'Submission cancelled.';
        setLastActionFeedback(`✓ ${cancelMsg}`);
        speakText(cancelMsg, speechLang, () => {
          startListening(speechLang);
        });
        return;
      }
    }

    // Exact input command tokens required:
    // Option A: "a", "option a", "1", "one", "पहला", "विकल्प ए" -> select Option 0. Speak "Selected A"
    const optATokens = ["option a", "विकल्प ए", "पहला", "one", "a", "1", "ए", "एक"];
    // Option B: "b", "option b", "2", "two", "दूसरा", "विकल्प बी" -> select Option 1. Speak "Selected B"
    const optBTokens = ["option b", "विकल्प बी", "दूसरा", "two", "b", "2", "बी", "दो"];
    // Option C: "c", "option c", "3", "three", "तीसरा", "विकल्प सी" -> select Option 2. Speak "Selected C"
    const optCTokens = ["option c", "विकल्प सी", "तीसरा", "three", "c", "3", "सी", "तीन"];
    // Option D: "d", "option d", "4", "four", "चौथा", "विकल्प डी" -> select Option 3. Speak "Selected D"
    const optDTokens = ["option d", "विकल्प डी", "चौथा", "four", "d", "4", "डी", "चार"];

    // Navigation:
    // "next", "agla", "आगे", "अगला" -> advance to next question and auto-read it
    const nextTokens = ["next", "agla", "आगे", "अगला"];
    // "back", "previous", "पिछला", "पीछे" -> go to previous question and auto-read it
    const backTokens = ["back", "previous", "पिछला", "पीछे", "piche"];
    // "repeat", "read again", "दोबारा" -> re-run speech for the current question
    const repeatTokens = ["repeat", "read again", "दोबारा", "फिर से"];

    const words = transcript.split(/\s+/);

    if (optATokens.some((t) => transcript === t || transcript.includes(t) || words.includes(t))) {
      playVoiceFeedbackChime();
      handleSelectOption(0);
      speakText(isHi ? "विकल्प ए चुना गया" : "Selected A", speechLang, () => {
        startListening(speechLang);
      });
      return;
    }

    if (optBTokens.some((t) => transcript === t || transcript.includes(t) || words.includes(t))) {
      playVoiceFeedbackChime();
      handleSelectOption(1);
      speakText(isHi ? "विकल्प बी चुना गया" : "Selected B", speechLang, () => {
        startListening(speechLang);
      });
      return;
    }

    if (optCTokens.some((t) => transcript === t || transcript.includes(t) || words.includes(t))) {
      playVoiceFeedbackChime();
      handleSelectOption(2);
      speakText(isHi ? "विकल्प सी चुना गया" : "Selected C", speechLang, () => {
        startListening(speechLang);
      });
      return;
    }

    if (optDTokens.some((t) => transcript === t || transcript.includes(t) || words.includes(t))) {
      playVoiceFeedbackChime();
      handleSelectOption(3);
      speakText(isHi ? "विकल्प डी चुना गया" : "Selected D", speechLang, () => {
        startListening(speechLang);
      });
      return;
    }

    if (nextTokens.some((t) => transcript.includes(t) || words.includes(t))) {
      playVoiceFeedbackChime();
      handleNextQuestion();
      return;
    }

    if (backTokens.some((t) => transcript.includes(t) || words.includes(t))) {
      playVoiceFeedbackChime();
      handlePrevQuestion();
      return;
    }

    if (repeatTokens.some((t) => transcript.includes(t) || words.includes(t))) {
      playVoiceFeedbackChime();
      readCurrentQuestion();
      return;
    }

    // Clear answer command
    if (transcript.includes('clear') || transcript.includes('remove') || transcript.includes('हटाओ')) {
      playVoiceFeedbackChime();
      handleClearAnswer();
      return;
    }

    // Submit exam command
    if (transcript.includes('submit') || transcript.includes('finish') || transcript.includes('सबमिट')) {
      playVoiceFeedbackChime();
      handleSubmitTrigger();
      return;
    }

    // General intent matcher fallback
    const match = matchExamIntent(transcript, false);
    if (match.type === 'SELECT_OPTION_A') {
      handleSelectOption(0);
      speakText(isHi ? "विकल्प ए चुना गया" : "Selected A", speechLang, () => startListening(speechLang));
    } else if (match.type === 'SELECT_OPTION_B') {
      handleSelectOption(1);
      speakText(isHi ? "विकल्प बी चुना गया" : "Selected B", speechLang, () => startListening(speechLang));
    } else if (match.type === 'SELECT_OPTION_C') {
      handleSelectOption(2);
      speakText(isHi ? "विकल्प सी चुना गया" : "Selected C", speechLang, () => startListening(speechLang));
    } else if (match.type === 'SELECT_OPTION_D') {
      handleSelectOption(3);
      speakText(isHi ? "विकल्प डी चुना गया" : "Selected D", speechLang, () => startListening(speechLang));
    } else if (match.type === 'NEXT_QUESTION') {
      handleNextQuestion();
    } else if (match.type === 'PREVIOUS_QUESTION') {
      handlePrevQuestion();
    } else if (match.type === 'READ_AGAIN') {
      readCurrentQuestion();
    } else if (match.type === 'CLEAR_SELECTION') {
      handleClearAnswer();
    }
  }, [
    handleSelectOption,
    handleNextQuestion,
    handlePrevQuestion,
    readCurrentQuestion,
    handleClearAnswer,
    handleSubmitTrigger,
  ]);

  // Connect to Centralized Global Voice Engine
  const {
    isListening: engineIsListening,
    isSpeaking: engineIsSpeaking,
  } = useVoiceEngine({
    lang: isHindi ? 'hi-IN' : 'en-US',
    autoStart: true,
    onTranscript: handleCapturedSpeech,
  });

  // Explicit user-gesture mic unlock handler
  const handleManualMicActivation = useCallback(async () => {
    setVoiceStatus('Requesting microphone permission...');
    const granted = await requestMicAccess();
    if (!granted) {
      setVoiceStatus('Mic Error: Permission denied');
      setErrorMessage('Microphone access needed. Click to allow.');
      return;
    }

    setIsAudioUnlocked(true);
    setIsActive(true);
    isActiveRef.current = true;
    userManuallyMutedRef.current = false;
    setVoiceStatus('Listening (mic is hot)');
    setStatus('Listening');
    startListening(languageRef.current === 'hi' ? 'hi-IN' : 'en-US');
  }, []);

  const unlockAudio = useCallback(async () => {
    await handleManualMicActivation();
    readCurrentQuestion();
  }, [handleManualMicActivation, readCurrentQuestion]);

  // Space key to unlock voice if banner is active
  useEffect(() => {
    if (isAudioUnlocked) return;
    const handleSpaceUnlock = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        unlockAudio();
      }
    };

    window.addEventListener('keydown', handleSpaceUnlock);
    return () => window.removeEventListener('keydown', handleSpaceUnlock);
  }, [isAudioUnlocked, unlockAudio]);

  // Auto-read question 1 on initial load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasInitializedMountRef.current) return;
    if (!currentQuestion) return;

    hasInitializedMountRef.current = true;
    setIsActive(true);
    isActiveRef.current = true;
    userManuallyMutedRef.current = false;

    // Trigger non-blocking mic warmup
    requestMicAccess().catch(() => {});

    // Auto-read question 1 after short buffer
    const timer = setTimeout(() => {
      readQuestion(state.currentQuestionIndex);
    }, 400);

    return () => clearTimeout(timer);
  }, [currentQuestion, readQuestion, state.currentQuestionIndex]);

  // Auto-read question whenever question index changes
  useEffect(() => {
    if (!hasInitializedMountRef.current) return;
    if (userManuallyMutedRef.current || !isActive) return;

    if (lastReadIndexRef.current !== state.currentQuestionIndex) {
      lastReadIndexRef.current = state.currentQuestionIndex;
      setLastActionFeedback(null);
      readQuestion(state.currentQuestionIndex);
    }
  }, [state.currentQuestionIndex, isActive, readQuestion]);

  // Manual Toggle / Mute Override (Alt+M)
  const toggleVoiceMode = useCallback(() => {
    if (isActive) {
      userManuallyMutedRef.current = true;
      setIsActive(false);
      isActiveRef.current = false;
      stopListening();
      try { window.speechSynthesis?.cancel(); } catch (e) {}
      setStatus('Ready');
      setVoiceStatus('Voice Muted');
      setLastActionFeedback(null);
    } else {
      userManuallyMutedRef.current = false;
      setIsActive(true);
      isActiveRef.current = true;
      setStatus('Listening');
      setVoiceStatus('Listening (mic is hot)');
      readCurrentQuestion();
    }
  }, [isActive, readCurrentQuestion]);

  const enableVoiceMode = useCallback(() => {
    userManuallyMutedRef.current = false;
    setIsActive(true);
    isActiveRef.current = true;
    setStatus('Listening');
    setVoiceStatus('Listening (mic is hot)');
    readCurrentQuestion();
  }, [readCurrentQuestion]);

  const deactivateVoiceMode = useCallback(() => {
    userManuallyMutedRef.current = true;
    setIsActive(false);
    isActiveRef.current = false;
    stopListening();
    try { window.speechSynthesis?.cancel(); } catch (e) {}
    setStatus('Ready');
    setVoiceStatus('Voice Muted');
  }, []);

  const clearTimers = useCallback(() => {
    stopListening();
  }, []);

  return {
    isActive,
    status: engineIsSpeaking ? 'Speaking' : (engineIsListening ? 'Listening' : status),
    isSpeaking: engineIsSpeaking || status === 'Speaking',
    lastCommand,
    lastTranscript,
    lastHeardTranscript,
    voiceStatus: engineIsSpeaking ? 'Reading question...' : (engineIsListening ? 'Listening (mic is hot)' : voiceStatus),
    handleManualMicActivation,
    lastActionFeedback,
    errorMessage,
    isAudioUnlocked,
    unlockAudio,
    readCurrentQuestion,
    readQuestion,
    toggleVoiceMode,
    enableVoiceMode,
    deactivateVoiceMode,
    clearTimers,
  };
}
