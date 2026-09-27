import { useState, useEffect, useCallback, useRef } from 'react';
import { parseVoiceCommand, ParsedCommand } from '@/lib/voice/voiceParser';
import { classifyIntentLocally, playVoiceFeedbackChime } from '@/lib/voice/intent-parser';
import { matchExamIntent } from '@/lib/voice/exam-intents';
import { ExamState, announceToScreenReader } from '@/lib/useExamEngine';
import { CandidateQuestion, getQuestionType, isQuestionAnswered } from '@/types/question';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { formatSpeechPronunciation, getNaturalFemaleVoice } from '@/lib/accessibility/voice-companion';

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
  onStartExam
}: UseVoiceModeProps) {
  const language = useAccessibilityStore((s) => s.language);
  const voiceSpeed = useAccessibilityStore((s) => s.voiceSpeed);

  // Voice mode is ON BY DEFAULT for hands-free examination
  const [isActive, setIsActive] = useState(true);
  const [status, setStatus] = useState<VoiceStatus>('Listening');
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [lastActionFeedback, setLastActionFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Pending action for two-step confirmation (e.g., submit)
  const [pendingAction, setPendingAction] = useState<ParsedCommand | null>(null);

  // 1. REFS TO ELIMINATE REACT STALE CLOSURES
  const currentIndexRef = useRef<number>(state.currentQuestionIndex);
  const currentQuestionRef = useRef<CandidateQuestion>(currentQuestion);
  const optionsRef = useRef<any[]>(currentQuestion?.options || []);
  const questionsRef = useRef<CandidateQuestion[] | undefined>(questions);
  const actionsRef = useRef(actions);
  const stateRef = useRef(state);
  const languageRef = useRef(language);
  const totalQuestionsRef = useRef(totalQuestions);
  const activeSectionRef = useRef(activeSection);
  const sectionTimeRemainingRef = useRef(sectionTimeRemaining);
  const userManuallyMutedRef = useRef(false);
  const handleCommandRef = useRef<(cmd: string) => void>(() => {});

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSpeakingRef = useRef(false);
  const isActiveRef = useRef(true);
  const statusRef = useRef<VoiceStatus>('Listening');
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechWatchdogRef = useRef<NodeJS.Timeout | null>(null);
  const lastReadIndexRef = useRef<number | null>(null);
  const hasInitializedMountRef = useRef<boolean>(false);

  // Synchronize mutable refs on every state/prop change
  useEffect(() => {
    currentIndexRef.current = state.currentQuestionIndex;
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
    optionsRef.current = currentQuestion?.options || [];
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
    activeSectionRef.current = activeSection;
    sectionTimeRemainingRef.current = sectionTimeRemaining;
  }, [activeSection, sectionTimeRemaining]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const clearSpeechWatchdog = useCallback(() => {
    if (speechWatchdogRef.current) {
      clearTimeout(speechWatchdogRef.current);
      speechWatchdogRef.current = null;
    }
  }, []);

  const getPreferredVoice = useCallback((targetLang: 'hi' | 'en') => {
    return getNaturalFemaleVoice(targetLang);
  }, []);

  // Safely stop speech recognition
  const stopListening = useCallback(() => {
    clearRestartTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore idle abort errors
      }
    }
  }, [clearRestartTimer]);

  // Safely start speech recognition (only if active, not manually muted, and not speaking)
  const startListening = useCallback(() => {
    clearRestartTimer();
    if (!recognitionRef.current || !isActiveRef.current || userManuallyMutedRef.current || isSpeakingRef.current) {
      return;
    }

    try {
      const curLang = languageRef.current;
      recognitionRef.current.lang = curLang === 'hi' ? 'hi-IN' : 'en-US';
      recognitionRef.current.start();
      setStatus('Listening');
    } catch (e: any) {
      if (e?.name === 'InvalidStateError' || e?.message?.includes('already started')) {
        setStatus('Listening');
      }
    }
  }, [clearRestartTimer]);

  // Speech synthesis wrapper: cancels audio first, pauses listener, and auto-resumes after speech ends
  const speak = useCallback((text: string, options?: { onEnd?: () => void; langOverride?: 'hi' | 'en' }) => {
    if (!synthesisRef.current || typeof window === 'undefined') return;

    // 1. Immediately pause recognition before TTS audio output to avoid acoustic feedback
    stopListening();
    clearSpeechWatchdog();
    isSpeakingRef.current = true;
    setStatus('Speaking');

    try {
      synthesisRef.current.cancel(); // Flush ongoing audio first
    } catch (e) {}

    const utterance = new SpeechSynthesisUtterance(formatSpeechPronunciation(text));
    
    // Set speech rate
    if (voiceSpeed === 'slow') utterance.rate = 0.85;
    else if (voiceSpeed === 'fast') utterance.rate = 1.2;
    else utterance.rate = 1.0;

    const curLang = languageRef.current;
    const targetLang = options?.langOverride || (curLang === 'hi' ? 'hi' : 'en');
    const voice = getPreferredVoice(targetLang);
    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = targetLang === 'hi' ? 'hi-IN' : 'en-US';

    utteranceRef.current = utterance;
    if (typeof window !== 'undefined') {
      (window as any).__activeUtterance = utterance;
    }

    // Safety watchdog: prevent Chrome SpeechSynthesis hang from permanently dropping mic capture
    const estimatedDurationMs = Math.min(14000, Math.max(3000, (text.length / 12) * 1000 + 2000));
    speechWatchdogRef.current = setTimeout(() => {
      if (isSpeakingRef.current) {
        console.warn('[VoiceMode] Speech watchdog timeout expired - resetting speech state');
        isSpeakingRef.current = false;
        utteranceRef.current = null;
        if (isActiveRef.current && !userManuallyMutedRef.current) {
          startListening();
        }
      }
    }, estimatedDurationMs);

    const handleSpeechEnd = () => {
      clearSpeechWatchdog();
      utteranceRef.current = null;
      if (typeof window !== 'undefined') {
        (window as any).__activeUtterance = null;
      }
      isSpeakingRef.current = false;

      // Allow 200ms audio buffer to flush before reopening recognition
      clearRestartTimer();
      restartTimerRef.current = setTimeout(() => {
        if (isActiveRef.current && !userManuallyMutedRef.current && !isSpeakingRef.current) {
          if (options?.onEnd) {
            options.onEnd();
          } else {
            startListening();
          }
        }
      }, 200);
    };

    utterance.onend = handleSpeechEnd;
    utterance.onerror = (e) => {
      console.warn('[VoiceMode] Utterance error:', e);
      clearSpeechWatchdog();
      utteranceRef.current = null;
      if (typeof window !== 'undefined') {
        (window as any).__activeUtterance = null;
      }
      isSpeakingRef.current = false;
      if (isActiveRef.current && !userManuallyMutedRef.current && !isSpeakingRef.current) {
        startListening();
      }
    };

    try {
      if (synthesisRef.current.paused) {
        synthesisRef.current.resume();
      }
      synthesisRef.current.speak(utterance);
    } catch (e) {
      clearSpeechWatchdog();
      utteranceRef.current = null;
      isSpeakingRef.current = false;
      if (isActiveRef.current && !userManuallyMutedRef.current) {
        startListening();
      }
    }
  }, [voiceSpeed, getPreferredVoice, stopListening, startListening, clearRestartTimer, clearSpeechWatchdog]);

  // 2. DEDICATED HELPER: readQuestion(index)
  // Cancels ongoing audio, formats standard script, pauses recognition, and auto-resumes listening
  const readQuestion = useCallback((index: number, options?: { langOverride?: 'hi' | 'en' }) => {
    const questionsList = questionsRef.current;
    const targetQ = (questionsList && questionsList[index]) ? questionsList[index] : currentQuestionRef.current;
    if (!targetQ) return;

    const curLang = languageRef.current;
    const isHindi = options?.langOverride ? options.langOverride === 'hi' : curLang === 'hi';
    const qNum = index + 1;
    const qType = getQuestionType(targetQ);

    let speechScript = '';

    if (qType === 'single-choice' || qType === 'multiple-choice') {
      const opts = (targetQ as any).options || [];
      const optionsText = opts
        .map((opt: any, i: number) => `${isHindi ? 'विकल्प' : 'Option'} ${String.fromCharCode(65 + i)}: ${opt.text}.`)
        .join(' ');
      
      speechScript = isHindi
        ? `प्रश्न ${qNum}: ${targetQ.text}। ${optionsText} ${qType === 'single-choice' ? 'आप A, B, C या D बोल सकते हैं।' : ''}`
        : `Question ${qNum}: ${targetQ.text}. ${optionsText} ${qType === 'single-choice' ? 'You can say Option A, B, C, or D.' : ''}`;
    } else if (qType === 'true-false') {
      speechScript = isHindi
        ? `प्रश्न ${qNum}: ${targetQ.text}। विकल्प: सत्य या असत्य।`
        : `Question ${qNum}: ${targetQ.text}. Options: True or False.`;
    } else {
      speechScript = isHindi
        ? `प्रश्न ${qNum}: ${targetQ.text}।`
        : `Question ${qNum}: ${targetQ.text}.`;
    }

    lastReadIndexRef.current = index;

    speak(speechScript, {
      langOverride: isHindi ? 'hi' : 'en',
      onEnd: () => {
        startListening();
      }
    });
  }, [speak, startListening]);

  // Option selection action executor (guarantees accurate state via refs)
  const handleSelectOption = useCallback((optionIndex: number) => {
    const curQ = currentQuestionRef.current;
    const curActions = actionsRef.current;
    const curLang = languageRef.current;
    const isHindi = curLang === 'hi';
    const targetLang: 'hi' | 'en' = isHindi ? 'hi' : 'en';

    if (!curQ) return;

    const letter = String.fromCharCode(65 + optionIndex);
    const qType = getQuestionType(curQ);

    if (qType === 'multiple-choice') {
      const opts = (curQ as any)?.options || [];
      const option = opts[optionIndex];
      if (option) {
        if (curActions.toggleOption) {
          curActions.toggleOption(curQ.id, option.id);
        } else {
          curActions.selectAnswer(curQ.id, option.id);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('examsarthi-voice-action', {
            detail: { action: 'select-option', index: optionIndex, letter }
          }));
        }

        const confirmText = isHindi ? `${letter} चुना गया` : `Selected ${letter}`;
        setLastActionFeedback(`✓ ${confirmText}`);
        announceToScreenReader(confirmText);
        speak(confirmText, { langOverride: targetLang, onEnd: () => startListening() });
      }
    } else if (qType === 'single-choice') {
      const opts = (curQ as any)?.options || [];
      const option = opts[optionIndex];
      if (option) {
        if (curActions.setAnswer) {
          curActions.setAnswer(curQ.id, option.id);
        }
        curActions.selectAnswer(curQ.id, option.id);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('examsarthi-voice-action', {
            detail: { action: 'select-option', index: optionIndex, letter }
          }));
        }

        const confirmText = isHindi ? `${letter} चुना गया` : `Selected ${letter}`;
        setLastActionFeedback(`✓ ${confirmText}`);
        announceToScreenReader(confirmText);
        speak(confirmText, { langOverride: targetLang, onEnd: () => startListening() });
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
      speak(confirmText, { langOverride: targetLang, onEnd: () => startListening() });
    }
  }, [speak, startListening]);

  // Navigation action handlers
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
        { langOverride: targetLang, onEnd: () => startListening() }
      );
    }
  }, [speak, startListening]);

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
        { langOverride: targetLang, onEnd: () => startListening() }
      );
    }
  }, [speak, startListening]);

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
      speak(confirmClear, { langOverride: targetLang, onEnd: () => startListening() });
    }
  }, [speak, startListening]);

  // 4. COMPREHENSIVE FUZZY KEYWORD MATCHING
  const handleCommand = useCallback((transcript: string) => {
    // Ignore results if system TTS is speaking
    if (isSpeakingRef.current) return;

    // Normalize transcript: lowercase, trim, strip punctuation
    const text = transcript
      .toLowerCase()
      .trim()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");

    if (!text) return;

    const curLang = languageRef.current;
    const isHindi = curLang === 'hi';
    const targetLang: 'hi' | 'en' = isHindi ? 'hi' : 'en';

    // Two-step confirmation active (e.g., submit verbal confirmation)
    if (pendingAction) {
      if (
        /^(yes|yeah|sure|confirm|submit|proceed|haan|sahi|thik\s*hai|हाँ|हां|सबमिट|पुष्टि)/i.test(text)
      ) {
        playVoiceFeedbackChime();
        setPendingAction(null);
        if (onCloseSubmitDialog) onCloseSubmitDialog();
        actionsRef.current.submitExam();
        const confMsg = isHindi ? 'परीक्षा सबमिट कर दी गई है।' : 'Exam submitted.';
        setLastActionFeedback(`✓ ${confMsg}`);
        speak(confMsg, {
          langOverride: targetLang,
          onEnd: () => {
            setIsActive(false);
            isActiveRef.current = false;
          }
        });
        return;
      } else if (
        /^(no|nope|cancel|nahi|nahin|chhodo|नहीं|ना|रद्द|छोड़ो)/i.test(text)
      ) {
        playVoiceFeedbackChime();
        setPendingAction(null);
        if (onCloseSubmitDialog) onCloseSubmitDialog();
        const cancelMsg = isHindi ? 'कार्रवाई रद्द की गई।' : 'Submission cancelled.';
        setLastActionFeedback(`✓ ${cancelMsg}`);
        speak(cancelMsg, { langOverride: targetLang, onEnd: () => startListening() });
        return;
      } else {
        speak(
          isHindi ? 'कृपया पुष्टि के लिए "हां सबमिट करो" या "रद्द करो" बोलें।' : 'Please say "confirm submit" or "cancel submit".',
          { langOverride: targetLang, onEnd: () => startListening() }
        );
        return;
      }
    }

    const words = text.split(/\s+/);

    // OPTION A
    if (
      text === 'a' || 
      text === 'option a' || 
      text === '1' || 
      text === 'option 1' || 
      text.includes('विकल्प ए') || 
      text.includes('पहला') || 
      words.includes('a') ||
      text === 'ए' ||
      text === 'एक'
    ) {
      playVoiceFeedbackChime();
      handleSelectOption(0);
      return;
    }

    // OPTION B
    if (
      text === 'b' || 
      text === 'option b' || 
      text === '2' || 
      text === 'option 2' || 
      text.includes('विकल्प बी') || 
      text.includes('दूसरा') || 
      words.includes('b') ||
      text === 'बी' ||
      text === 'दो'
    ) {
      playVoiceFeedbackChime();
      handleSelectOption(1);
      return;
    }

    // OPTION C
    if (
      text === 'c' || 
      text === 'option c' || 
      text === '3' || 
      text === 'option 3' || 
      text.includes('विकल्प सी') || 
      text.includes('तीसरा') || 
      words.includes('c') ||
      text === 'सी' ||
      text === 'तीन'
    ) {
      playVoiceFeedbackChime();
      handleSelectOption(2);
      return;
    }

    // OPTION D
    if (
      text === 'd' || 
      text === 'option d' || 
      text === '4' || 
      text === 'option 4' || 
      text.includes('विकल्प डी') || 
      text.includes('चौथा') || 
      words.includes('d') ||
      text === 'डी' ||
      text === 'चार'
    ) {
      playVoiceFeedbackChime();
      handleSelectOption(3);
      return;
    }

    // NEXT / AAGE
    if (
      text.includes('next') || 
      text.includes('अगला') || 
      text.includes('aage') || 
      text.includes('आगे')
    ) {
      playVoiceFeedbackChime();
      const feedback = isHindi ? 'अगला प्रश्न' : 'Next question';
      setLastActionFeedback(`✓ ${feedback}`);
      handleNextQuestion();
      return;
    }

    // PREVIOUS / BACK / PICHLA
    if (
      text.includes('previous') || 
      text.includes('back') || 
      text.includes('पिछला') || 
      text.includes('piche')
    ) {
      playVoiceFeedbackChime();
      const feedback = isHindi ? 'पिछला प्रश्न' : 'Previous question';
      setLastActionFeedback(`✓ ${feedback}`);
      handlePrevQuestion();
      return;
    }

    // REPEAT / READ AGAIN
    if (
      text.includes('repeat') || 
      text.includes('again') || 
      text.includes('dobara') || 
      text.includes('दोबारा') || 
      text.includes('फिर से')
    ) {
      playVoiceFeedbackChime();
      readQuestion(currentIndexRef.current);
      return;
    }

    // CLEAR / REMOVE
    if (
      text.includes('clear') || 
      text.includes('remove') || 
      text.includes('हटाओ')
    ) {
      playVoiceFeedbackChime();
      handleClearAnswer();
      return;
    }

    // SUBMIT
    if (
      text.includes('submit') || 
      text.includes('finish') || 
      text.includes('सबमिट')
    ) {
      playVoiceFeedbackChime();
      setPendingAction({ type: 'SUBMIT' } as any);
      if (onOpenSubmitDialog) onOpenSubmitDialog();
      const confirmPrompt = isHindi 
        ? 'क्या आप परीक्षा जमा करना चाहते हैं? पुष्टि के लिए "हां सबमिट करो" कहें।'
        : 'Are you sure you want to submit the exam? Say "confirm submit" to proceed.';
      speak(confirmPrompt, { langOverride: targetLang, onEnd: () => startListening() });
      return;
    }

    // Fallback: check matchExamIntent
    const examMatch = matchExamIntent(transcript, false);
    if (examMatch.type !== 'UNKNOWN') {
      playVoiceFeedbackChime();
      switch (examMatch.type) {
        case 'SELECT_OPTION_A':
          handleSelectOption(0);
          return;
        case 'SELECT_OPTION_B':
          handleSelectOption(1);
          return;
        case 'SELECT_OPTION_C':
          handleSelectOption(2);
          return;
        case 'SELECT_OPTION_D':
          handleSelectOption(3);
          return;
        case 'NEXT_QUESTION':
          handleNextQuestion();
          return;
        case 'PREVIOUS_QUESTION':
          handlePrevQuestion();
          return;
        case 'CLEAR_SELECTION':
          handleClearAnswer();
          return;
        case 'READ_AGAIN':
          readQuestion(currentIndexRef.current);
          return;
        default:
          break;
      }
    }
  }, [
    handleSelectOption,
    handleNextQuestion,
    handlePrevQuestion,
    handleClearAnswer,
    readQuestion,
    pendingAction,
    onOpenSubmitDialog,
    onCloseSubmitDialog,
    speak,
    startListening
  ]);

  // Keep handleCommandRef synchronized
  useEffect(() => {
    handleCommandRef.current = handleCommand;
  }, [handleCommand]);

  // 3. ROBUST SPEECH-TO-TEXT RECOGNITION LOOP
  useEffect(() => {
    if (typeof window === 'undefined') return;

    synthesisRef.current = window.speechSynthesis;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = languageRef.current === 'hi' ? 'hi-IN' : 'en-US';
      recognitionRef.current = recognition;

      recognition.onresult = (event: any) => {
        // Strict guard: ignore results if TTS is speaking
        if (isSpeakingRef.current) return;

        const resultIndex = event.resultIndex !== undefined ? event.resultIndex : event.results.length - 1;
        const transcript = event.results?.[resultIndex]?.[0]?.transcript?.trim();
        if (!transcript) return;

        setLastCommand(transcript);
        setStatus('Processing');
        if (handleCommandRef.current) {
          handleCommandRef.current(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        console.warn('[VoiceMode] SpeechRecognition error:', error);

        if (error === 'not-allowed' || error === 'service-not-allowed') {
          setStatus('Error');
          const fallbackMsg = languageRef.current === 'hi'
            ? 'माइक्रोफ़ोन अनुमति अस्वीकृत। कीबोर्ड मोड सक्रिय है।'
            : 'Microphone permission denied. Keyboard controls active.';
          setErrorMessage(fallbackMsg);
          setIsActive(false);
          isActiveRef.current = false;
          return;
        }

        // Silence recovery without stopping voice mode
        if (error === 'no-speech') {
          if (isActiveRef.current && !userManuallyMutedRef.current && !isSpeakingRef.current) {
            setStatus('Listening');
            clearRestartTimer();
            restartTimerRef.current = setTimeout(() => {
              if (isActiveRef.current && !userManuallyMutedRef.current && !isSpeakingRef.current) {
                startListening();
              }
            }, 250);
          }
          return;
        }

        if (error === 'network') {
          if (isActiveRef.current && !userManuallyMutedRef.current && !isSpeakingRef.current) {
            clearRestartTimer();
            restartTimerRef.current = setTimeout(() => {
              if (isActiveRef.current && !userManuallyMutedRef.current && !isSpeakingRef.current) {
                startListening();
              }
            }, 500);
          }
          return;
        }

        // Other transient errors
        if (isActiveRef.current && !userManuallyMutedRef.current && !isSpeakingRef.current) {
          clearRestartTimer();
          restartTimerRef.current = setTimeout(() => {
            if (isActiveRef.current && !userManuallyMutedRef.current && !isSpeakingRef.current) {
              startListening();
            }
          }, 300);
        }
      };

      // Silence / Drop Recovery loop
      recognition.onend = () => {
        if (isActiveRef.current && !userManuallyMutedRef.current && !isSpeakingRef.current) {
          clearRestartTimer();
          restartTimerRef.current = setTimeout(() => {
            if (isActiveRef.current && !userManuallyMutedRef.current && !isSpeakingRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
                setStatus('Listening');
              } catch (e) {
                // Already running or in transition
              }
            }
          }, 150);
        }
      };

      if (statusRef.current === 'Unsupported' || statusRef.current === 'Ready') {
        setStatus('Listening');
      }
    } else {
      setStatus('Unsupported');
    }

    return () => {
      clearRestartTimer();
      clearSpeechWatchdog();
      if (synthesisRef.current) {
        try { synthesisRef.current.cancel(); } catch (e) {}
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, [clearRestartTimer, clearSpeechWatchdog, startListening]);

  // Update recognition language dynamically
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    }
  }, [language]);

  // 1 & 2. SOLVE BROWSER AUTOPLAY & AUTO-READ FIRST QUESTION ON MOUNT
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasInitializedMountRef.current) return;
    if (!currentQuestion) return;

    hasInitializedMountRef.current = true;
    setIsActive(true);
    isActiveRef.current = true;
    userManuallyMutedRef.current = false;
    setStatus('Listening');

    // Trigger explicit mic permission check if not already granted
    if (navigator?.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => stream.getTracks().forEach((track) => track.stop()))
        .catch((err) => console.warn('[VoiceMode] Auto-permission notice on mount:', err));
    }

    // Auto-read question 1 after 350ms buffer
    const timer = setTimeout(() => {
      readQuestion(state.currentQuestionIndex);
    }, 350);

    return () => clearTimeout(timer);
  }, [currentQuestion, readQuestion, state.currentQuestionIndex]);

  // 2. TRIGGER readQuestion(currentQuestionIndex) WHENEVER currentQuestionIndex CHANGES
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
      // Mute voice mode
      userManuallyMutedRef.current = true;
      setIsActive(false);
      isActiveRef.current = false;
      clearRestartTimer();
      clearSpeechWatchdog();
      try { synthesisRef.current?.cancel(); } catch (e) {}
      stopListening();
      setStatus('Ready');
      setLastActionFeedback(null);
    } else {
      // Unmute / Enable voice mode
      userManuallyMutedRef.current = false;
      setIsActive(true);
      isActiveRef.current = true;
      setStatus('Listening');
      readQuestion(currentIndexRef.current);
    }
  }, [isActive, stopListening, clearRestartTimer, clearSpeechWatchdog, readQuestion]);

  const enableVoiceMode = useCallback(() => {
    userManuallyMutedRef.current = false;
    setIsActive(true);
    isActiveRef.current = true;
    setStatus('Listening');
    readQuestion(currentIndexRef.current);
  }, [readQuestion]);

  const deactivateVoiceMode = useCallback(() => {
    userManuallyMutedRef.current = true;
    setIsActive(false);
    isActiveRef.current = false;
    clearRestartTimer();
    clearSpeechWatchdog();
    try { synthesisRef.current?.cancel(); } catch (e) {}
    stopListening();
    setStatus('Ready');
  }, [stopListening, clearRestartTimer, clearSpeechWatchdog]);

  return {
    isActive,
    status,
    lastCommand,
    lastActionFeedback,
    errorMessage,
    readQuestion,
    toggleVoiceMode,
    enableVoiceMode,
    disableVoiceMode: deactivateVoiceMode
  };
}
