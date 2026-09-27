import { useState, useEffect, useCallback, useRef } from 'react';
import { ParsedCommand } from '@/lib/voice/voiceParser';
import { playVoiceFeedbackChime } from '@/lib/voice/intent-parser';
import { matchExamIntent } from '@/lib/voice/exam-intents';
import { ExamState, announceToScreenReader } from '@/lib/useExamEngine';
import { CandidateQuestion, getQuestionType } from '@/types/question';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';

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
  const lang = language === 'hi' ? 'hi' : 'en';

  // Voice mode state
  const [isActive, setIsActive] = useState(true);
  const [status, setStatus] = useState<VoiceStatus>('Listening');
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [lastHeardTranscript, setLastHeardTranscript] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string>('Listening... (mic is hot)');
  const [lastActionFeedback, setLastActionFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio Context Unlock Flag
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).__examsarthi_audio_unlocked ||
      sessionStorage.getItem('examAudioUnlocked') === 'true'
    );
  });

  // Pending action for two-step confirmation (e.g., submit)
  const [pendingAction, setPendingAction] = useState<ParsedCommand | null>(null);
  const pendingActionRef = useRef<ParsedCommand | null>(null);

  // 1. REFS TO ELIMINATE REACT STALE CLOSURES
  const currentIndexRef = useRef<number>(state.currentQuestionIndex);
  const currentQuestionRef = useRef<CandidateQuestion>(currentQuestion);
  const questionsRef = useRef<CandidateQuestion[] | undefined>(questions);
  const actionsRef = useRef(actions);
  const stateRef = useRef(state);
  const languageRef = useRef(language);
  const totalQuestionsRef = useRef(totalQuestions);
  const userManuallyMutedRef = useRef(false);

  // Controller Refs
  const recognitionRef = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const isActiveRef = useRef<boolean>(true);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speechWatchdogRef = useRef<NodeJS.Timeout | null>(null);
  const lastReadIndexRef = useRef<number | null>(null);
  const hasInitializedMountRef = useRef<boolean>(false);

  const onOpenSubmitDialogRef = useRef(onOpenSubmitDialog);
  const onCloseSubmitDialogRef = useRef(onCloseSubmitDialog);

  useEffect(() => {
    onOpenSubmitDialogRef.current = onOpenSubmitDialog;
    onCloseSubmitDialogRef.current = onCloseSubmitDialog;
  }, [onOpenSubmitDialog, onCloseSubmitDialog]);

  // Synchronize mutable refs
  useEffect(() => {
    currentIndexRef.current = state.currentQuestionIndex;
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    totalQuestionsRef.current = totalQuestions;
  }, [totalQuestions]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const clearTimers = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (speechWatchdogRef.current) {
      clearTimeout(speechWatchdogRef.current);
      speechWatchdogRef.current = null;
    }
  }, []);

  // Safe Recognition Start
  const startRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isSpeakingRef.current || !isActiveRef.current || userManuallyMutedRef.current) {
      return;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = languageRef.current === 'hi' ? 'hi-IN' : 'en-US';
        recognitionRef.current.start();
        setStatus('Listening');
        setVoiceStatus('Listening (mic is hot)');
      } catch (e: any) {
        // Recognition already started or transitioning
        if (e?.name === 'InvalidStateError' || e?.message?.includes('already started')) {
          setStatus('Listening');
          setVoiceStatus('Listening (mic is hot)');
        }
      }
    }
  }, []);

  // Safe Recognition Stop
  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Recognition already stopped
      }
    }
  }, []);

  // 1. & 2. SPEECH CONTROLLER WITH GLOBAL WINDOW UTTERANCE ANCHOR & SEQUENTIAL TURN-TAKING
  const speak = useCallback((text: string, options?: { onEnd?: () => void; langOverride?: 'hi' | 'en' }) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Strict Sequential Turn-Taking: Stop recognition before speaking
    stopRecognition();
    isSpeakingRef.current = true;
    setStatus('Speaking');
    setVoiceStatus('Speaking...');

    try {
      window.speechSynthesis.cancel();
    } catch (e) {}

    const curLang = options?.langOverride || (languageRef.current === 'hi' ? 'hi' : 'en');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = curLang === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 1.0;

    // Anchor to prevent browser garbage collection
    currentUtteranceRef.current = utterance;
    (window as any).__activeUtterance = utterance;

    // Watchdog to guarantee speech state resets if browser drops utterance event
    if (speechWatchdogRef.current) clearTimeout(speechWatchdogRef.current);
    const timeoutDuration = Math.min(16000, Math.max(3500, (text.length / 10) * 1000 + 2000));
    speechWatchdogRef.current = setTimeout(() => {
      if (isSpeakingRef.current) {
        console.warn('[VoiceMode] Speech watchdog timeout expired');
        isSpeakingRef.current = false;
        currentUtteranceRef.current = null;
        if (isActiveRef.current && !userManuallyMutedRef.current) {
          setStatus('Listening');
          setVoiceStatus('Listening (mic is hot)');
          setTimeout(() => {
            try { recognitionRef.current?.start(); } catch (e) {}
          }, 250);
        }
      }
    }, timeoutDuration);

    const handleEnd = () => {
      if (speechWatchdogRef.current) {
        clearTimeout(speechWatchdogRef.current);
        speechWatchdogRef.current = null;
      }
      isSpeakingRef.current = false;
      currentUtteranceRef.current = null;
      if (typeof window !== 'undefined') {
        (window as any).__activeUtterance = null;
      }

      // Wait 250ms for speaker echo to clear, then start listening
      setTimeout(() => {
        if (!isSpeakingRef.current && isActiveRef.current && !userManuallyMutedRef.current) {
          if (options?.onEnd) {
            options.onEnd();
          } else {
            try {
              recognitionRef.current?.start();
              setStatus('Listening');
              setVoiceStatus('Listening (mic is hot)');
            } catch (e) {}
          }
        }
      }, 250);
    };

    utterance.onend = handleEnd;
    utterance.onerror = (e) => {
      console.warn('[VoiceMode] Utterance error:', e);
      handleEnd();
    };

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
      setIsAudioUnlocked(true);
    } catch (e) {
      console.warn('[VoiceMode] Speech speak error:', e);
      handleEnd();
    }
  }, [stopRecognition]);

  // 1. GLOBAL WINDOW UTTERANCE ANCHOR FOR QUESTION READING
  const readQuestion = useCallback((index: number, options?: { langOverride?: 'hi' | 'en' }) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const questionsList = questionsRef.current;
    const targetQ = (questionsList && questionsList[index]) ? questionsList[index] : currentQuestionRef.current;
    if (!targetQ) return;

    const curLang = options?.langOverride || (languageRef.current === 'hi' ? 'hi' : 'en');
    const isHindi = curLang === 'hi';

    const getOptText = (opt: any) => {
      if (!opt) return '';
      return typeof opt === 'string' ? opt : (opt.text || '');
    };
    const opts = targetQ.options || [];
    const optA = getOptText(opts[0]);
    const optB = getOptText(opts[1]);
    const optC = getOptText(opts[2]);
    const optD = getOptText(opts[3]);

    // Format speech text
    let textToRead = '';
    if (targetQ.type === 'true-false') {
      textToRead = isHindi
        ? `प्रश्न ${index + 1}. ${targetQ.text}. विकल्प: सत्य या असत्य।`
        : `Question ${index + 1}. ${targetQ.text}. Options: True or False.`;
    } else {
      textToRead = isHindi
        ? `प्रश्न ${index + 1}. ${targetQ.text}. ${optA ? `विकल्प ए: ${optA}. ` : ''}${optB ? `विकल्प बी: ${optB}. ` : ''}${optC ? `विकल्प सी: ${optC}. ` : ''}${optD ? `विकल्प डी: ${optD}.` : ''}`.trim()
        : `Question ${index + 1}. ${targetQ.text}. Option A: ${optA}. Option B: ${optB}. Option C: ${optC}. Option D: ${optD}.`;
    }

    // 1. Global Window Utterance Anchor (Fixes Silent Audio Drop)
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = isHindi ? 'hi-IN' : 'en-US';
    utterance.rate = 1.0;
    currentUtteranceRef.current = utterance; // Prevents browser garbage collection!
    (window as any).__activeUtterance = utterance;

    // 2. Strict Sequential Turn-Taking (Fixes Mic Abort Collision)
    isSpeakingRef.current = true;
    setStatus('Speaking');
    setVoiceStatus('Reading question...');

    // Before window.speechSynthesis.speak(utterance): Stop recognition
    stopRecognition();

    if (speechWatchdogRef.current) clearTimeout(speechWatchdogRef.current);
    const estimatedDuration = Math.min(20000, Math.max(4000, (textToRead.length / 10) * 1000 + 2500));
    speechWatchdogRef.current = setTimeout(() => {
      if (isSpeakingRef.current) {
        console.warn('[VoiceMode] Question read watchdog expired');
        isSpeakingRef.current = false;
        currentUtteranceRef.current = null;
        if (isActiveRef.current && !userManuallyMutedRef.current) {
          setStatus('Listening');
          setVoiceStatus('Listening (mic is hot)');
          setTimeout(() => {
            try { recognitionRef.current?.start(); } catch (e) {}
          }, 250);
        }
      }
    }, estimatedDuration);

    const handleQuestionSpeechEnd = () => {
      if (speechWatchdogRef.current) {
        clearTimeout(speechWatchdogRef.current);
        speechWatchdogRef.current = null;
      }
      isSpeakingRef.current = false;
      currentUtteranceRef.current = null;
      if (typeof window !== 'undefined') {
        (window as any).__activeUtterance = null;
      }

      // Wait 250ms for speaker echo to clear, then start listening
      setTimeout(() => {
        if (!isSpeakingRef.current && isActiveRef.current && !userManuallyMutedRef.current) {
          setStatus('Listening');
          setVoiceStatus('Listening (mic is hot)');
          try {
            recognitionRef.current?.start();
          } catch (e) {}
        }
      }, 250);
    };

    utterance.onend = handleQuestionSpeechEnd;
    utterance.onerror = (e) => {
      console.warn('[VoiceMode] Question utterance error:', e);
      handleQuestionSpeechEnd();
    };

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
      lastReadIndexRef.current = index;
      setIsAudioUnlocked(true);
    } catch (e) {
      console.warn('[VoiceMode] Failed to execute speechSynthesis.speak:', e);
      handleQuestionSpeechEnd();
    }
  }, [stopRecognition]);

  // Read current active question
  const readCurrentQuestion = useCallback(() => {
    readQuestion(currentIndexRef.current);
  }, [readQuestion]);

  // 2. EXPLICIT USER-GESTURE MIC UNLOCK BUTTON HANDLER
  const handleManualMicActivation = useCallback(async () => {
    setVoiceStatus('Requesting microphone permission...');
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (err: any) {
      console.error('[Voice Error] getUserMedia failed:', err);
      setVoiceStatus(`Mic Error: ${err?.name || err?.message || 'Permission denied'}`);
      setErrorMessage(`Microphone access needed: ${err?.message || 'Permission blocked'}`);
      return;
    }

    setIsAudioUnlocked(true);
    if (typeof window !== 'undefined') {
      (window as any).__examsarthi_audio_unlocked = true;
      try {
        sessionStorage.setItem('examAudioUnlocked', 'true');
      } catch (e) {}
    }

    setIsActive(true);
    isActiveRef.current = true;
    userManuallyMutedRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}

      // 3. Fallback Language Configuration: Try candidate choice, fallback to en-US if needed
      try {
        recognitionRef.current.lang = languageRef.current === 'hi' ? 'hi-IN' : 'en-US';
        recognitionRef.current.start();
        setVoiceStatus('Listening... (mic is hot)');
        setStatus('Listening');
      } catch (err: any) {
        try {
          recognitionRef.current.lang = 'en-US';
          recognitionRef.current.start();
          setVoiceStatus('Listening... (en-US fallback)');
          setStatus('Listening');
        } catch (e2: any) {
          console.error('[Voice Error] Recognition start failed:', e2);
          setVoiceStatus(`Mic Error: ${e2?.message || 'Failed to start'}`);
        }
      }
    } else {
      setVoiceStatus('SpeechRecognition not initialized');
    }
  }, []);

  // 4. Physical "Tap to Enable Voice" Unlock Handler
  const unlockAudio = useCallback(() => {
    handleManualMicActivation();
    readCurrentQuestion();
  }, [handleManualMicActivation, readCurrentQuestion]);

  // Global keydown listener for Space bar to unlock voice if banner is active
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

  // Option selection handler
  const handleSelectOption = useCallback((optionIndex: number) => {
    const curQ = currentQuestionRef.current;
    const curActions = actionsRef.current;
    const isHindi = languageRef.current === 'hi';
    const targetLang: 'hi' | 'en' = isHindi ? 'hi' : 'en';

    if (!curQ) return;

    const letter = String.fromCharCode(65 + optionIndex);
    const qType = getQuestionType(curQ);

    if (qType === 'multiple-choice') {
      const opts = (curQ as any)?.options || [];
      const option = opts[optionIndex];
      if (option) {
        const optId = typeof option === 'string' ? option : option.id;
        if (curActions.toggleOption) {
          curActions.toggleOption(curQ.id, optId);
        } else {
          curActions.selectAnswer(curQ.id, optId);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('examsarthi-voice-action', {
            detail: { action: 'select-option', index: optionIndex, letter }
          }));
        }

        const confirmText = isHindi ? `विकल्प ${letter} चुना गया` : `Option ${letter} selected`;
        setLastActionFeedback(`✓ ${confirmText}`);
        announceToScreenReader(confirmText);
        speak(confirmText, { langOverride: targetLang });
      }
    } else if (qType === 'single-choice') {
      const opts = (curQ as any)?.options || [];
      const option = opts[optionIndex];
      if (option) {
        const optId = typeof option === 'string' ? option : option.id;
        if (curActions.setAnswer) {
          curActions.setAnswer(curQ.id, optId);
        }
        curActions.selectAnswer(curQ.id, optId);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('examsarthi-voice-action', {
            detail: { action: 'select-option', index: optionIndex, letter }
          }));
        }

        const confirmText = isHindi ? `विकल्प ${letter} चुना गया` : `Option ${letter} selected`;
        setLastActionFeedback(`✓ ${confirmText}`);
        announceToScreenReader(confirmText);
        speak(confirmText, { langOverride: targetLang });
      }
    } else if (qType === 'true-false') {
      // 0 = True, 1 = False
      const boolVal = optionIndex === 0;
      if (curActions.setAnswer) {
        curActions.setAnswer(curQ.id, boolVal);
      }
      curActions.selectAnswer(curQ.id, boolVal ? 'true' : 'false');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('examsarthi-voice-action', {
          detail: { action: 'select-option', index: optionIndex, letter: boolVal ? 'True' : 'False' }
        }));
      }

      const confirmText = boolVal
        ? (isHindi ? 'सत्य चुना गया' : 'True selected')
        : (isHindi ? 'असत्य चुना गया' : 'False selected');
      setLastActionFeedback(`✓ ${confirmText}`);
      announceToScreenReader(confirmText);
      speak(confirmText, { langOverride: targetLang });
    }
  }, [speak]);

  // Navigation handlers
  const handleNextQuestion = useCallback(() => {
    const curActions = actionsRef.current;
    const curIdx = currentIndexRef.current;
    const totalQ = totalQuestionsRef.current;
    const isHindi = languageRef.current === 'hi';
    const targetLang: 'hi' | 'en' = isHindi ? 'hi' : 'en';

    if (curIdx < totalQ - 1) {
      setLastActionFeedback(null);
      curActions.goToNext();
    } else {
      speak(
        isHindi ? 'आप अंतिम प्रश्न पर हैं।' : 'You are on the last question.',
        { langOverride: targetLang }
      );
    }
  }, [speak]);

  const handlePrevQuestion = useCallback(() => {
    const curActions = actionsRef.current;
    const curIdx = currentIndexRef.current;
    const isHindi = languageRef.current === 'hi';
    const targetLang: 'hi' | 'en' = isHindi ? 'hi' : 'en';

    if (curIdx > 0) {
      setLastActionFeedback(null);
      curActions.goToPrevious();
    } else {
      speak(
        isHindi ? 'आप पहले प्रश्न पर हैं।' : 'You are on the first question.',
        { langOverride: targetLang }
      );
    }
  }, [speak]);

  const handleClearAnswer = useCallback(() => {
    const curQ = currentQuestionRef.current;
    const curActions = actionsRef.current;
    const isHindi = languageRef.current === 'hi';
    const targetLang: 'hi' | 'en' = isHindi ? 'hi' : 'en';

    if (curQ) {
      if (curActions.setAnswer) {
        curActions.setAnswer(curQ.id, "");
      }
      curActions.selectAnswer(curQ.id, "");
      const confirmClear = isHindi ? 'उत्तर हटा दिया गया।' : 'Response cleared.';
      setLastActionFeedback(`✓ ${confirmClear}`);
      announceToScreenReader(confirmClear);
      speak(confirmClear, { langOverride: targetLang });
    }
  }, [speak]);

  // 1. CONSOLE & ON-SCREEN VISUAL LOGGER & MICROPHONE ENGINE
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('Unsupported');
      setVoiceStatus('Unsupported by browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Discrete short cycles avoid the dead-mic bug
    recognition.interimResults = false;
    
    // 3. Fallback Language Configuration
    const initialLang = languageRef.current === 'hi' ? 'hi-IN' : 'en-US';
    recognition.lang = initialLang;
    recognitionRef.current = recognition;

    // 1. Explicit event listeners for audio diagnostics
    recognition.onaudiostart = () => {
      console.log('[Voice] Audio capture started (mic is hot)');
      setVoiceStatus('Audio capture started (mic is hot)');
    };

    recognition.onsoundstart = () => {
      console.log('[Voice] Sound detected in room');
      setVoiceStatus('Sound detected in room');
    };

    recognition.onspeechstart = () => {
      console.log('[Voice] Speech identified');
      setVoiceStatus('Speech identified');
    };

    recognition.onspeechend = () => {
      console.log('[Voice] Speech segment ended');
      setVoiceStatus('Speech segment ended');
    };

    recognition.onnomatch = () => {
      console.log('[Voice] Audio heard but no word matched');
      setVoiceStatus('Audio heard but no word matched');
    };

    recognition.onerror = (e: any) => {
      console.error('[Voice Error]', e.error, e.message);
      setVoiceStatus(`Mic Error: ${e.error}`);

      // Fallback: If hi-IN speech recognition fails due to missing language pack, fallback to en-US
      if (e.error === 'language-not-supported' && recognition.lang !== 'en-US') {
        console.warn('[Voice] Falling back to en-US speech recognition');
        recognition.lang = 'en-US';
        setTimeout(() => {
          try {
            recognition.start();
            setVoiceStatus('Listening (en-US fallback)');
          } catch (err) {}
        }, 200);
        return;
      }

      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setStatus('Error');
        setErrorMessage(languageRef.current === 'hi'
          ? 'माइक्रोफ़ोन अनुमति अस्वीकृत। कीबोर्ड मोड सक्रिय है।'
          : 'Microphone permission denied. Keyboard controls active.'
        );
        setIsActive(false);
        isActiveRef.current = false;
      }
    };

    recognition.onresult = (e: any) => {
      const raw = e?.results?.[0]?.[0]?.transcript || '';
      console.log("[Voice Result Captured]:", raw);
      setLastHeardTranscript(raw);
      setLastCommand(raw);
      setLastTranscript(raw);
      setVoiceStatus(`Captured: "${raw}"`);

      if (isSpeakingRef.current) return;

      try {
        const transcript = (raw || '').toLowerCase().trim();
        setStatus('Processing');

        // Two-step confirmation active (e.g. submit exam)
        if (pendingActionRef.current) {
          if (/^(yes|yeah|sure|confirm|submit|proceed|haan|sahi|thik\s*hai|हाँ|हां|सबमिट|पुष्टि)/i.test(transcript)) {
            playVoiceFeedbackChime();
            setPendingAction(null);
            pendingActionRef.current = null;
            if (onCloseSubmitDialogRef.current) onCloseSubmitDialogRef.current();
            actionsRef.current.submitExam();
            const confMsg = languageRef.current === 'hi' ? 'परीक्षा सबमिट कर दी गई है।' : 'Exam submitted.';
            setLastActionFeedback(`✓ ${confMsg}`);
            speak(confMsg, {
              onEnd: () => {
                setIsActive(false);
                isActiveRef.current = false;
              }
            });
            return;
          } else if (/^(no|nope|cancel|nahi|nahin|chhodo|नहीं|ना|रद्द|छोड़ो)/i.test(transcript)) {
            playVoiceFeedbackChime();
            setPendingAction(null);
            pendingActionRef.current = null;
            if (onCloseSubmitDialogRef.current) onCloseSubmitDialogRef.current();
            const cancelMsg = languageRef.current === 'hi' ? 'कार्रवाई रद्द की गई।' : 'Submission cancelled.';
            setLastActionFeedback(`✓ ${cancelMsg}`);
            speak(cancelMsg);
            return;
          }
        }

        // Keyword matches:
        const words = transcript.split(/\s+/);
        if (
          transcript === 'a' || 
          words.includes('a') || 
          transcript.includes('option a') || 
          transcript.includes('विकल्प ए') || 
          transcript === '1' ||
          transcript === 'ए' ||
          transcript === 'एक'
        ) {
          playVoiceFeedbackChime();
          handleSelectOption(0);
        } else if (
          transcript === 'b' || 
          words.includes('b') || 
          transcript.includes('option b') || 
          transcript.includes('विकल्प बी') || 
          transcript === '2' ||
          transcript === 'बी' ||
          transcript === 'दो'
        ) {
          playVoiceFeedbackChime();
          handleSelectOption(1);
        } else if (
          transcript === 'c' || 
          words.includes('c') || 
          transcript.includes('option c') || 
          transcript.includes('विकल्प सी') || 
          transcript === '3' ||
          transcript === 'सी' ||
          transcript === 'तीन'
        ) {
          playVoiceFeedbackChime();
          handleSelectOption(2);
        } else if (
          transcript === 'd' || 
          words.includes('d') || 
          transcript.includes('option d') || 
          transcript.includes('विकल्प डी') || 
          transcript === '4' ||
          transcript === 'डी' ||
          transcript === 'चार'
        ) {
          playVoiceFeedbackChime();
          handleSelectOption(3);
        } else if (
          transcript.includes('next') || 
          transcript.includes('अगला') || 
          transcript.includes('aage') ||
          transcript.includes('आगे')
        ) {
          playVoiceFeedbackChime();
          handleNextQuestion();
        } else if (
          transcript.includes('previous') || 
          transcript.includes('back') || 
          transcript.includes('पिछला') ||
          transcript.includes('piche')
        ) {
          playVoiceFeedbackChime();
          handlePrevQuestion();
        } else if (
          transcript.includes('repeat') || 
          transcript.includes('again') || 
          transcript.includes('दोबारा') ||
          transcript.includes('फिर से')
        ) {
          playVoiceFeedbackChime();
          readCurrentQuestion();
        } else if (
          transcript.includes('clear') || 
          transcript.includes('remove') || 
          transcript.includes('हटाओ')
        ) {
          playVoiceFeedbackChime();
          handleClearAnswer();
        } else if (
          transcript.includes('submit') || 
          transcript.includes('finish') || 
          transcript.includes('सबमिट')
        ) {
          playVoiceFeedbackChime();
          setPendingAction({ type: 'SUBMIT' } as any);
          pendingActionRef.current = { type: 'SUBMIT' } as any;
          if (onOpenSubmitDialogRef.current) onOpenSubmitDialogRef.current();
          const confirmPrompt = languageRef.current === 'hi'
            ? 'क्या आप परीक्षा जमा करना चाहते हैं? पुष्टि के लिए "हां सबमिट करो" कहें।'
            : 'Are you sure you want to submit the exam? Say "confirm submit" to proceed.';
          speak(confirmPrompt);
        } else {
          // Check comprehensive intent matcher as fallback
          const match = matchExamIntent(transcript, false);
          if (match.type === 'SELECT_OPTION_A') handleSelectOption(0);
          else if (match.type === 'SELECT_OPTION_B') handleSelectOption(1);
          else if (match.type === 'SELECT_OPTION_C') handleSelectOption(2);
          else if (match.type === 'SELECT_OPTION_D') handleSelectOption(3);
          else if (match.type === 'NEXT_QUESTION') handleNextQuestion();
          else if (match.type === 'PREVIOUS_QUESTION') handlePrevQuestion();
          else if (match.type === 'READ_AGAIN') readCurrentQuestion();
          else if (match.type === 'CLEAR_SELECTION') handleClearAnswer();
        }
      } catch (e) {
        console.warn('[VoiceMode] Error processing transcript:', e);
      }
    };

    // On recognition.onend: automatically restart if active and not speaking
    recognition.onend = () => {
      setTimeout(() => {
        if (!isSpeakingRef.current && isActiveRef.current && !userManuallyMutedRef.current) {
          try {
            recognition.start();
            setStatus('Listening');
          } catch (e) {}
        }
      }, 150);
    };

    // Start recognition cycle if voice mode is active and not speaking
    if (isActiveRef.current && !userManuallyMutedRef.current && !isSpeakingRef.current) {
      try {
        recognition.start();
        setStatus('Listening');
        setVoiceStatus('Listening (mic is hot)');
      } catch (e) {}
    }

    return () => {
      try { recognition.abort(); } catch (e) {}
    };
  }, [
    handleSelectOption,
    handleNextQuestion,
    handlePrevQuestion,
    readCurrentQuestion,
    handleClearAnswer,
    speak,
    language
  ]);

  // Synchronize recognition language dynamically
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    }
  }, [language]);

  // Auto-read question 1 on initial load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasInitializedMountRef.current) return;
    if (!currentQuestion) return;

    hasInitializedMountRef.current = true;
    setIsActive(true);
    isActiveRef.current = true;
    userManuallyMutedRef.current = false;

    // Trigger non-blocking mic permission check
    if (navigator?.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => stream.getTracks().forEach((track) => track.stop()))
        .catch((err) => console.warn('[VoiceMode] Permission prompt on mount:', err));
    }

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
      clearTimers();
      try { window.speechSynthesis?.cancel(); } catch (e) {}
      stopRecognition();
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
  }, [isActive, stopRecognition, clearTimers, readCurrentQuestion]);

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
    clearTimers();
    try { window.speechSynthesis?.cancel(); } catch (e) {}
    stopRecognition();
    setStatus('Ready');
    setVoiceStatus('Voice Muted');
  }, [stopRecognition, clearTimers]);

  return {
    isActive,
    status,
    isSpeaking: status === 'Speaking' || isSpeakingRef.current,
    lastCommand,
    lastTranscript,
    lastHeardTranscript,
    voiceStatus,
    handleManualMicActivation,
    lastActionFeedback,
    errorMessage,
    isAudioUnlocked,
    unlockAudio,
    readCurrentQuestion,
    readQuestion,
    toggleVoiceMode,
    enableVoiceMode,
    disableVoiceMode: deactivateVoiceMode
  };
}
