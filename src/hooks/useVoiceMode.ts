import { useState, useEffect, useCallback, useRef } from 'react';
import { parseVoiceCommand, ParsedCommand, CommandLanguage } from '@/lib/voice/voiceParser';
import { ExamActions, ExamState, announceToScreenReader } from '@/lib/useExamEngine';
import { CandidateQuestion, getQuestionType, isQuestionAnswered } from '@/types/question';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { getTranslation } from '@/lib/i18n';

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
  };
  state: ExamState;
  currentQuestion: CandidateQuestion;
  totalQuestions: number;
  questions?: CandidateQuestion[];
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
  onOpenSubmitDialog,
  onCloseSubmitDialog,
  onStartExam
}: UseVoiceModeProps) {
  const language = useAccessibilityStore((s) => s.language);
  const voiceSpeed = useAccessibilityStore((s) => s.voiceSpeed);

  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>('Ready');
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [lastActionFeedback, setLastActionFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Pending action for two-step confirmation (e.g., submit)
  const [pendingAction, setPendingAction] = useState<ParsedCommand | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const isSpeakingRef = useRef(false);
  const isActiveRef = useRef(false);
  const statusRef = useRef<VoiceStatus>('Ready');
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastReadQuestionIndexRef = useRef<number | null>(null);

  // Dynamic bilingual recognition locale tracking ('en-IN' | 'hi-IN')
  const currentLocaleRef = useRef<'en-IN' | 'hi-IN'>(language === 'hi' ? 'hi-IN' : 'en-IN');
  const consecutiveFailuresRef = useRef<number>(0);

  // Keep refs in sync with state for lifecycle callbacks
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Clean up any pending restart timer
  const clearRestartTimer = () => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  // Select appropriate voice based on active or detected language
  const getPreferredVoice = useCallback((targetLang: 'hi' | 'en') => {
    if (!synthesisRef.current) return null;
    const voices = synthesisRef.current.getVoices();
    if (!voices || voices.length === 0) return null;

    if (targetLang === 'hi') {
      const hindiVoice = voices.find((v) => v.lang.toLowerCase().startsWith('hi'));
      if (hindiVoice) return hindiVoice;
    }

    // Default or Indian English voice
    const inEnglishVoice = voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith('en-in'));
    if (inEnglishVoice) return inEnglishVoice;

    const anyEnglishVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    return anyEnglishVoice || voices[0] || null;
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
  }, []);

  // Safely start speech recognition (only if active and not speaking)
  const startListening = useCallback(() => {
    clearRestartTimer();
    if (!recognitionRef.current || !isActiveRef.current || isSpeakingRef.current) {
      return;
    }

    try {
      recognitionRef.current.lang = currentLocaleRef.current;
      recognitionRef.current.start();
      setStatus('Listening');
    } catch (e: any) {
      if (e?.name === 'InvalidStateError' || e?.message?.includes('already started')) {
        setStatus('Listening');
      }
    }
  }, []);

  // Speech synthesis wrapper: strictly stops recognition before audio begins and enforces safety buffer
  const speak = useCallback((text: string, options?: { onEnd?: () => void; langOverride?: 'hi' | 'en' }) => {
    if (!synthesisRef.current || typeof window === 'undefined') return;

    // Immediately stop recognition before audio output begins (prevents acoustic feedback)
    stopListening();
    isSpeakingRef.current = true;
    setStatus('Speaking');

    try {
      synthesisRef.current.cancel(); // Flush any pending utterances
    } catch (e) {}

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set speech rate from user preference
    if (voiceSpeed === 'slow') utterance.rate = 0.85;
    else if (voiceSpeed === 'fast') utterance.rate = 1.2;
    else utterance.rate = 1.0;

    const targetLang = options?.langOverride || (language === 'hi' ? 'hi' : 'en');
    const voice = getPreferredVoice(targetLang);
    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = targetLang === 'hi' ? 'hi-IN' : 'en-IN';

    const handleSpeechEnd = () => {
      isSpeakingRef.current = false;
      // Allow audio buffer to flush (300ms safety buffer) before reopening microphone
      clearRestartTimer();
      restartTimerRef.current = setTimeout(() => {
        if (isActiveRef.current && !isSpeakingRef.current) {
          if (options?.onEnd) {
            options.onEnd();
          } else {
            startListening();
          }
        }
      }, 300);
    };

    utterance.onend = handleSpeechEnd;
    utterance.onerror = () => {
      isSpeakingRef.current = false;
      if (isActiveRef.current && !isSpeakingRef.current) {
        startListening();
      }
    };

    try {
      synthesisRef.current.speak(utterance);
    } catch (e) {
      isSpeakingRef.current = false;
      if (isActiveRef.current) {
        startListening();
      }
    }
  }, [voiceSpeed, language, getPreferredVoice, stopListening, startListening]);

  // Read current question out loud (question-type customized according to Section 9)
  const readCurrentQuestion = useCallback((langPref?: 'hi' | 'en') => {
    const isHindi = langPref ? langPref === 'hi' : language === 'hi';
    const qNum = state.currentQuestionIndex + 1;
    const qType = getQuestionType(currentQuestion);

    let promptText = '';

    if (qType === 'single-choice') {
      const opts = (currentQuestion as any).options || [];
      const optionsText = opts
        .map((opt: any, i: number) => `${isHindi ? 'विकल्प' : 'Option'} ${String.fromCharCode(65 + i)}: ${opt.text}.`)
        .join(' ');
      promptText = isHindi
        ? `प्रश्न संख्या ${qNum} का ${totalQuestions}। ${currentQuestion.text}। विकल्प: ${optionsText} आप A, B, C या D कह सकते हैं।`
        : `Question ${qNum} of ${totalQuestions}. ${currentQuestion.text}. Options: ${optionsText} You can say A, B, C, or D.`;
    } else if (qType === 'multiple-choice') {
      const opts = (currentQuestion as any).options || [];
      const optionsText = opts
        .map((opt: any, i: number) => `${isHindi ? 'विकल्प' : 'Option'} ${String.fromCharCode(65 + i)}: ${opt.text}.`)
        .join(' ');
      promptText = isHindi
        ? `प्रश्न संख्या ${qNum} का ${totalQuestions}। सभी सही उत्तर चुनें। ${currentQuestion.text}। विकल्प: ${optionsText} आप A, B, C या D कह सकते हैं, एक या अधिक विकल्प।`
        : `Question ${qNum} of ${totalQuestions}. Select all correct answers. ${currentQuestion.text}. Options: ${optionsText} You can say A, B, C, or D, including multiple options.`;
    } else if (qType === 'true-false') {
      promptText = isHindi
        ? `प्रश्न संख्या ${qNum} का ${totalQuestions}। ${currentQuestion.text}। आप सत्य या असत्य कह सकते हैं।`
        : `Question ${qNum} of ${totalQuestions}. ${currentQuestion.text}. You can answer true or false.`;
    } else if (qType === 'short-answer') {
      promptText = isHindi
        ? `प्रश्न संख्या ${qNum} का ${totalQuestions}। ${currentQuestion.text}। कृपया अपना उत्तर बोलें।`
        : `Question ${qNum} of ${totalQuestions}. ${currentQuestion.text}. Please speak your answer.`;
    } else if (qType === 'fill-blank') {
      // Replace underscore sequence with 'blank' or 'रिक्त स्थान'
      const speechText = currentQuestion.text.replace(/_{2,}/g, isHindi ? 'रिक्त स्थान' : 'blank');
      promptText = isHindi
        ? `प्रश्न संख्या ${qNum} का ${totalQuestions}। वाक्य पूरा करें। ${speechText}। कृपया अपना उत्तर बोलें।`
        : `Question ${qNum} of ${totalQuestions}. Complete the sentence. ${speechText}. Please speak your answer.`;
    } else {
      promptText = isHindi
        ? `प्रश्न संख्या ${qNum} का ${totalQuestions}। ${currentQuestion.text}।`
        : `Question ${qNum} of ${totalQuestions}. ${currentQuestion.text}.`;
    }

    speak(promptText, {
      langOverride: isHindi ? 'hi' : 'en',
      onEnd: () => startListening()
    });
  }, [language, state.currentQuestionIndex, totalQuestions, currentQuestion, speak, startListening]);

  // Read everything (question + all options completely)
  const readEverything = useCallback((langPref?: 'hi' | 'en') => {
    const isHindi = langPref ? langPref === 'hi' : language === 'hi';
    const qNum = state.currentQuestionIndex + 1;
    const qType = getQuestionType(currentQuestion);

    let promptText = '';
    if (qType === 'single-choice' || qType === 'multiple-choice') {
      const opts = (currentQuestion as any).options || [];
      const optionsText = opts
        .map((opt: any, i: number) => `${isHindi ? 'विकल्प' : 'Option'} ${String.fromCharCode(65 + i)}: ${opt.text}.`)
        .join(' ');
      promptText = isHindi
        ? `प्रश्न ${qNum} का ${totalQuestions}। ${currentQuestion.text}। सभी विकल्प हैं: ${optionsText}`
        : `Question ${qNum} of ${totalQuestions}. ${currentQuestion.text}. All options are: ${optionsText}`;
    } else if (qType === 'true-false') {
      promptText = isHindi
        ? `प्रश्न ${qNum} का ${totalQuestions}। ${currentQuestion.text}। विकल्प: सत्य या असत्य।`
        : `Question ${qNum} of ${totalQuestions}. ${currentQuestion.text}. Options: True or False.`;
    } else {
      promptText = isHindi
        ? `प्रश्न ${qNum} का ${totalQuestions}। ${currentQuestion.text}`
        : `Question ${qNum} of ${totalQuestions}. ${currentQuestion.text}`;
    }

    speak(promptText, {
      langOverride: isHindi ? 'hi' : 'en',
      onEnd: () => startListening()
    });
  }, [language, state.currentQuestionIndex, totalQuestions, currentQuestion, speak, startListening]);

  // Initialize Speech APIs once on mount and configure recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    synthesisRef.current = window.speechSynthesis;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.lang = currentLocaleRef.current;
      recognitionRef.current = recognition;

      if (statusRef.current === 'Unsupported' || statusRef.current === 'Ready') {
        setStatus('Ready');
      }
    } else {
      setStatus('Unsupported');
    }

    return () => {
      clearRestartTimer();
      if (synthesisRef.current) {
        try { synthesisRef.current.cancel(); } catch (e) {}
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, []);

  // Update recognition language default when candidate changes platform language
  useEffect(() => {
    currentLocaleRef.current = language === 'hi' ? 'hi-IN' : 'en-IN';
    if (recognitionRef.current) {
      recognitionRef.current.lang = currentLocaleRef.current;
    }
  }, [language]);

  // Deactivate Voice Mode cleanly
  const deactivateVoiceMode = useCallback(() => {
    setIsActive(false);
    isActiveRef.current = false;
    lastReadQuestionIndexRef.current = null;
    setPendingAction(null);
    setLastActionFeedback(null);
    clearRestartTimer();
    try { synthesisRef.current?.cancel(); } catch (e) {}
    stopListening();
    setStatus('Ready');
    setErrorMessage(null);
  }, [stopListening]);

  // Command execution router for system/navigation/reading controls
  const executeCommand = useCallback((cmd: ParsedCommand) => {
    const isHindi = cmd.detectedLanguage === 'hi' || (cmd.detectedLanguage === 'mixed' && language === 'hi');
    const targetLang: 'hi' | 'en' = isHindi ? 'hi' : 'en';

    switch (cmd.type) {
      case 'NEXT':
        setLastActionFeedback(null);
        if (state.currentQuestionIndex < totalQuestions - 1) {
          actions.goToNext();
        } else {
          speak(
            isHindi ? 'आप अंतिम प्रश्न पर हैं।' : 'You are on the last question.',
            { langOverride: targetLang, onEnd: () => startListening() }
          );
        }
        break;

      case 'PREVIOUS':
        setLastActionFeedback(null);
        if (state.currentQuestionIndex > 0) {
          actions.goToPrevious();
        } else {
          speak(
            isHindi ? 'आप पहले प्रश्न पर हैं।' : 'You are on the first question.',
            { langOverride: targetLang, onEnd: () => startListening() }
          );
        }
        break;

      case 'GOTO':
        setLastActionFeedback(null);
        const targetIndex = cmd.questionNumber - 1;
        if (targetIndex >= 0 && targetIndex < totalQuestions) {
          if (targetIndex === state.currentQuestionIndex) {
            readCurrentQuestion(targetLang);
          } else {
            actions.goToQuestion(targetIndex);
          }
        } else {
          speak(
            isHindi ? `प्रश्न संख्या ${cmd.questionNumber} उपलब्ध नहीं है।` : `Question ${cmd.questionNumber} is not available.`,
            { langOverride: targetLang, onEnd: () => startListening() }
          );
        }
        break;

      case 'TIME_LEFT':
        const mins = Math.floor(state.timeRemaining / 60);
        const secs = state.timeRemaining % 60;
        speak(
          isHindi
            ? `आपके पास ${mins} मिनट और ${secs} सेकंड का समय शेष है।`
            : `You have ${mins} minutes and ${secs} seconds remaining.`,
          { langOverride: targetLang, onEnd: () => startListening() }
        );
        break;

      case 'REPEAT':
        readCurrentQuestion(targetLang);
        break;

      case 'READ_QUESTION':
        speak(currentQuestion.text, {
          langOverride: targetLang,
          onEnd: () => startListening()
        });
        break;

      case 'READ_OPTIONS': {
        const qType = getQuestionType(currentQuestion);
        if (qType === 'single-choice' || qType === 'multiple-choice') {
          const opts = (currentQuestion as any).options || [];
          const optionsText = opts
            .map((opt: any, i: number) => `${isHindi ? 'विकल्प' : 'Option'} ${String.fromCharCode(65 + i)}: ${opt.text}.`)
            .join(' ');
          speak(optionsText, {
            langOverride: targetLang,
            onEnd: () => startListening()
          });
        } else if (qType === 'true-false') {
          speak(isHindi ? 'विकल्प: सत्य या असत्य।' : 'Options: True or False.', {
            langOverride: targetLang,
            onEnd: () => startListening()
          });
        } else {
          speak(
            isHindi ? 'यह एक टेक्स्ट उत्तर प्रश्न है, कोई विकल्प नहीं हैं। कृपया अपना उत्तर बोलें।' : 'This is a text answer question without options. Please speak your answer.',
            { langOverride: targetLang, onEnd: () => startListening() }
          );
        }
        break;
      }

      case 'READ_ALL':
        readEverything(targetLang);
        break;

      case 'FLAG_QUESTION':
        if (actions.toggleFlag) {
          const wasFlagged = state.flagged.has(currentQuestion.id);
          actions.toggleFlag(currentQuestion.id);
          speak(
            wasFlagged 
              ? (isHindi ? 'समीक्षा चिह्न हटा दिया गया।' : 'Review flag removed.')
              : (isHindi ? 'प्रश्न समीक्षा के लिए चिह्नित किया गया।' : 'Question flagged for review.'),
            { langOverride: targetLang, onEnd: () => startListening() }
          );
        }
        break;

      case 'START_EXAM':
        if (onStartExam) {
          onStartExam();
        } else {
          // Inside active exam: inform user that exam is already ongoing
          speak(
            isHindi ? 'परीक्षा पहले से चल रही है।' : 'The exam is already in progress.',
            { langOverride: targetLang, onEnd: () => startListening() }
          );
        }
        break;

      case 'ENABLE_VOICE':
        speak(
          isHindi ? 'सुन रहा हूँ।' : 'Listening.',
          { langOverride: targetLang, onEnd: () => startListening() }
        );
        break;

      case 'DISABLE_VOICE':
        speak(
          isHindi ? 'वॉइस मोड बंद किया गया।' : 'Voice mode disabled.',
          {
            langOverride: targetLang,
            onEnd: () => deactivateVoiceMode()
          }
        );
        break;

      case 'UNKNOWN': {
        const qType = getQuestionType(currentQuestion);
        let errorMsg = '';
        if (qType === 'single-choice') {
          errorMsg = isHindi ? 'कृपया A, B, C या D कहें।' : 'Please say A, B, C, or D.';
        } else if (qType === 'multiple-choice') {
          errorMsg = isHindi ? 'कृपया A, B, C या D कहें, एक या अधिक विकल्प।' : 'Please say A, B, C, or D, including multiple options.';
        } else if (qType === 'true-false') {
          errorMsg = isHindi ? 'कृपया सत्य या असत्य कहें।' : 'Please say true or false.';
        } else {
          errorMsg = isHindi ? 'मैं इस कमांड को समझ नहीं पाया।' : "I didn't understand that command.";
        }
        speak(errorMsg, { langOverride: targetLang, onEnd: () => startListening() });
        break;
      }

      default:
        startListening();
        break;
    }
  }, [
    language, 
    state.currentQuestionIndex, 
    state.timeRemaining, 
    state.flagged,
    totalQuestions, 
    currentQuestion, 
    actions, 
    speak, 
    startListening, 
    readCurrentQuestion, 
    readEverything,
    onStartExam,
    deactivateVoiceMode
  ]);

  // Handle recognized transcript with bilingual question-type aware command parsing and confirmation safeguards
  const handleCommand = useCallback((transcript: string) => {
    const qType = getQuestionType(currentQuestion);
    const cmd = parseVoiceCommand(transcript, {
      questionType: qType,
      currentQuestion,
      isPendingConfirmation: !!pendingAction
    });

    const isHindi = cmd.detectedLanguage === 'hi' || (cmd.detectedLanguage === 'mixed' && language === 'hi');
    const targetLang: 'hi' | 'en' = isHindi ? 'hi' : 'en';

    // Adapt recognition locale if clear language detected
    if (cmd.type !== 'UNKNOWN') {
      consecutiveFailuresRef.current = 0;
      if (cmd.detectedLanguage === 'hi' && currentLocaleRef.current !== 'hi-IN') {
        currentLocaleRef.current = 'hi-IN';
        if (recognitionRef.current) recognitionRef.current.lang = 'hi-IN';
      } else if (cmd.detectedLanguage === 'en' && currentLocaleRef.current !== 'en-IN') {
        currentLocaleRef.current = 'en-IN';
        if (recognitionRef.current) recognitionRef.current.lang = 'en-IN';
      }
    } else {
      consecutiveFailuresRef.current++;
      // Controlled bilingual fallback: after 2 failures, toggle locale for next cycle
      if (consecutiveFailuresRef.current >= 2) {
        currentLocaleRef.current = currentLocaleRef.current === 'hi-IN' ? 'en-IN' : 'hi-IN';
        if (recognitionRef.current) recognitionRef.current.lang = currentLocaleRef.current;
        consecutiveFailuresRef.current = 0;
      }
    }

    // Two-step confirmation active (e.g. submit confirmation)
    if (pendingAction) {
      if (cmd.type === 'YES' || cmd.type === 'SUBMIT' || (cmd.type === 'TRUE_FALSE' && cmd.value === true)) {
        setPendingAction(null);
        if (onCloseSubmitDialog) onCloseSubmitDialog();
        actions.submitExam();
        speak(
          isHindi ? 'परीक्षा सबमिट कर दी गई है।' : 'Exam submitted.',
          {
            langOverride: targetLang,
            onEnd: () => deactivateVoiceMode()
          }
        );
      } else if (cmd.type === 'NO' || (cmd.type === 'TRUE_FALSE' && cmd.value === false)) {
        setPendingAction(null);
        if (onCloseSubmitDialog) onCloseSubmitDialog();
        speak(
          isHindi ? 'कार्रवाई रद्द की गई।' : 'Action cancelled.',
          { langOverride: targetLang, onEnd: () => startListening() }
        );
      } else {
        speak(
          isHindi ? 'कृपया हाँ या नहीं कहें।' : 'Please say yes or no.',
          { langOverride: targetLang, onEnd: () => startListening() }
        );
      }
      return;
    }

    // Direct submit action requires two-step confirmation safeguard
    if (cmd.type === 'SUBMIT') {
      const activeQList = questions && questions.length > 0 ? questions : [];
      const answered = activeQList.filter(q => isQuestionAnswered(q, state.answers[q.id])).length;
      const unanswered = totalQuestions - answered;
      setPendingAction(cmd);
      if (onOpenSubmitDialog) onOpenSubmitDialog();

      const confirmPrompt = isHindi
        ? `आपके ${unanswered} अनुत्तरित प्रश्न हैं। क्या आप परीक्षा सबमिट करना चाहते हैं? हाँ या नहीं कहें।`
        : `You have ${unanswered} unanswered questions. Are you sure you want to submit the exam? Say yes or no.`;
      
      speak(confirmPrompt, {
        langOverride: targetLang,
        onEnd: () => startListening()
      });
      return;
    }

    // --- 1. TRUE / FALSE ANSWER ---
    if (cmd.type === 'TRUE_FALSE') {
      if (actions.setAnswer) {
        actions.setAnswer(currentQuestion.id, cmd.value);
      }
      actions.selectAnswer(currentQuestion.id, cmd.value ? 'true' : 'false');
      
      const confirmText = cmd.value
        ? (isHindi ? 'सत्य चुना गया।' : 'True selected.')
        : (isHindi ? 'असत्य चुना गया।' : 'False selected.');
      const visualFeedback = cmd.value ? '✓ True selected' : '✓ False selected';

      setLastActionFeedback(visualFeedback);
      announceToScreenReader(confirmText);

      speak(confirmText, {
        langOverride: targetLang,
        onEnd: () => startListening()
      });
      return;
    }

    // --- 2. TEXT ANSWER (SHORT ANSWER / FILL IN THE BLANK) ---
    if (cmd.type === 'TEXT_ANSWER') {
      if (actions.setAnswer) {
        actions.setAnswer(currentQuestion.id, cmd.text);
      }
      actions.selectAnswer(currentQuestion.id, cmd.text);

      const confirmText = isHindi 
        ? `उत्तर दर्ज किया गया: ${cmd.text}।` 
        : `Answer entered: ${cmd.text}.`;
      const visualFeedback = `✓ Answer entered: ${cmd.text}`;

      setLastActionFeedback(visualFeedback);
      announceToScreenReader(confirmText);

      speak(confirmText, {
        langOverride: targetLang,
        onEnd: () => startListening()
      });
      return;
    }

    // --- 3. MULTIPLE CHOICE MULTI-OPTION SELECTION ---
    if (cmd.type === 'SELECT_MULTIPLE_OPTIONS') {
      const opts = (currentQuestion as any).options || [];
      const currentSelected: string[] = Array.isArray(state.answers[currentQuestion.id])
        ? (state.answers[currentQuestion.id] as string[])
        : [];

      const targetOptionIds: string[] = [];
      const letterNames: string[] = [];

      for (const idx of cmd.letterIndices) {
        if (opts[idx]) {
          targetOptionIds.push(opts[idx].id);
          letterNames.push(String.fromCharCode(65 + idx));
        }
      }

      if (targetOptionIds.length > 0) {
        // Add target options without duplicating existing selections
        const newSelection = Array.from(new Set([...currentSelected, ...targetOptionIds]));
        if (actions.setAnswer) {
          actions.setAnswer(currentQuestion.id, newSelection);
        }

        const lettersStr = letterNames.join(' and ');
        const confirmText = isHindi 
          ? `विकल्प ${letterNames.join(' और ')} चुने गए।` 
          : `Options ${lettersStr} selected.`;
        const visualFeedback = `✓ Options ${lettersStr} selected`;

        setLastActionFeedback(visualFeedback);
        announceToScreenReader(confirmText);

        speak(confirmText, {
          langOverride: targetLang,
          onEnd: () => startListening()
        });
      } else {
        speak(
          isHindi ? 'वे विकल्प उपलब्ध नहीं हैं।' : 'Those options are not available.',
          { langOverride: targetLang, onEnd: () => startListening() }
        );
      }
      return;
    }

    // --- 4. SINGLE OPTION SELECTION (SINGLE CHOICE OR MULTIPLE CHOICE TOGGLE) ---
    if (cmd.type === 'SELECT_OPTION') {
      const opts = (currentQuestion as any).options || [];
      const option = opts[cmd.letterIndex];

      if (qType === 'multiple-choice') {
        if (option) {
          const letter = String.fromCharCode(65 + cmd.letterIndex);
          if (actions.toggleOption) {
            actions.toggleOption(currentQuestion.id, option.id);
          } else {
            actions.selectAnswer(currentQuestion.id, option.id);
          }

          const currentArr = Array.isArray(state.answers[currentQuestion.id])
            ? (state.answers[currentQuestion.id] as string[])
            : [];
          const isNowSelected = !currentArr.includes(option.id);

          const confirmText = isHindi 
            ? `विकल्प ${letter} ${isNowSelected ? 'चुना गया' : 'हटाया गया'}।` 
            : `Option ${letter} ${isNowSelected ? 'selected' : 'unselected'}.`;
          const visualFeedback = `✓ Option ${letter} ${isNowSelected ? 'selected' : 'unselected'}`;

          setLastActionFeedback(visualFeedback);
          announceToScreenReader(confirmText);

          speak(confirmText, {
            langOverride: targetLang,
            onEnd: () => startListening()
          });
        } else {
          speak(
            isHindi ? 'वह विकल्प उपलब्ध नहीं है।' : 'That option is not available.',
            { langOverride: targetLang, onEnd: () => startListening() }
          );
        }
      } else if (qType === 'single-choice') {
        if (option) {
          const letter = String.fromCharCode(65 + cmd.letterIndex);
          if (actions.setAnswer) {
            actions.setAnswer(currentQuestion.id, option.id);
          }
          actions.selectAnswer(currentQuestion.id, option.id);

          const confirmText = isHindi ? `विकल्प ${letter} चुना गया।` : `Option ${letter} selected.`;
          const visualFeedback = `✓ Option ${letter} selected`;

          setLastActionFeedback(visualFeedback);
          announceToScreenReader(confirmText);

          speak(confirmText, {
            langOverride: targetLang,
            onEnd: () => startListening()
          });
        } else {
          speak(
            isHindi ? 'वह विकल्प उपलब्ध नहीं है।' : 'That option is not available.',
            { langOverride: targetLang, onEnd: () => startListening() }
          );
        }
      } else if (qType === 'true-false') {
        // cmd.letterIndex: 0 for A (True), 1 for B (False)
        const boolVal = cmd.letterIndex === 0;
        if (actions.setAnswer) actions.setAnswer(currentQuestion.id, boolVal);
        actions.selectAnswer(currentQuestion.id, boolVal ? 'true' : 'false');
        
        const confirmText = boolVal
          ? (isHindi ? 'सत्य चुना गया।' : 'True selected.')
          : (isHindi ? 'असत्य चुना गया।' : 'False selected.');
        const visualFeedback = boolVal ? '✓ True selected' : '✓ False selected';

        setLastActionFeedback(visualFeedback);
        announceToScreenReader(confirmText);

        speak(confirmText, {
          langOverride: targetLang,
          onEnd: () => startListening()
        });
      } else {
        speak(
          isHindi ? 'कृपया अपना उत्तर बोलें।' : 'Please speak your answer.',
          { langOverride: targetLang, onEnd: () => startListening() }
        );
      }
      return;
    }

    // Route standard navigation, reading, voice, or exam controls
    executeCommand(cmd);
  }, [
    language, 
    pendingAction, 
    totalQuestions, 
    state.answers, 
    currentQuestion, 
    actions, 
    speak, 
    startListening, 
    executeCommand, 
    onOpenSubmitDialog, 
    onCloseSubmitDialog, 
    deactivateVoiceMode
  ]);

  // Bind speech recognition event handlers
  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) {
        speak(
          language === 'hi' ? 'मैं समझ नहीं पाया। कृपया पुनः प्रयास करें।' : "I didn't catch that. Please try again.",
          { langOverride: language === 'hi' ? 'hi' : 'en', onEnd: () => startListening() }
        );
        return;
      }

      setLastCommand(transcript);
      setStatus('Processing');
      handleCommand(transcript);
    };

    recognition.onerror = (event: any) => {
      const error = event.error;

      // Fatal microphone permission denied error
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        setStatus('Error');
        setErrorMessage(getTranslation(language, 'voiceMicDeniedError'));
        setIsActive(false);
        isActiveRef.current = false;
        speak(
          language === 'hi' 
            ? 'माइक्रोफ़ोन अनुमति अस्वीकृत। आप कीबोर्ड का उपयोग जारी रख सकते हैं।' 
            : 'Microphone permission denied. You can continue using keyboard controls.',
          { langOverride: language === 'hi' ? 'hi' : 'en' }
        );
        return;
      }

      // CRITICAL: 'no-speech' is normal silence while thinking.
      // Silently resume listening without speaking or producing errors.
      if (error === 'no-speech') {
        if (isActiveRef.current && !isSpeakingRef.current) {
          setStatus('Listening');
          startListening();
        }
        return;
      }

      // 'aborted' happens during speech synthesis interruption or intentional stopping
      if (error === 'aborted') {
        return;
      }

      // Non-fatal network or audio-capture errors: quietly recover to listening state
      if (isActiveRef.current && !isSpeakingRef.current) {
        setStatus('Listening');
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          if (isActiveRef.current && !isSpeakingRef.current) {
            startListening();
          }
        }, 500);
      }
    };

    recognition.onend = () => {
      // Continuous listening: restart recognition if active, not speaking, and in Listening state
      if (isActiveRef.current && !isSpeakingRef.current && statusRef.current === 'Listening') {
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          if (isActiveRef.current && !isSpeakingRef.current) {
            try {
              recognition.start();
            } catch (e) {}
          }
        }, 150);
      }
    };
  }, [language, handleCommand, speak, startListening]);

  // Auto-read question when candidate navigates to a new question
  useEffect(() => {
    if (isActive && lastReadQuestionIndexRef.current !== state.currentQuestionIndex) {
      lastReadQuestionIndexRef.current = state.currentQuestionIndex;
      setLastActionFeedback(null);
      readCurrentQuestion();
    }
  }, [isActive, state.currentQuestionIndex, readCurrentQuestion]);

  // User-driven Voice Mode activation flow with standard browser permission request
  const enableVoiceMode = useCallback(async () => {
    if (statusRef.current === 'Unsupported') return;

    setStatus('RequestingPermission');
    setErrorMessage(null);

    // Explicit browser permission request
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release media stream tracks so SpeechRecognition has sole access to the microphone
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        setStatus('Error');
        setErrorMessage(getTranslation(language, 'voiceMicDeniedError'));
        setIsActive(false);
        isActiveRef.current = false;
        speak(
          language === 'hi' 
            ? 'माइक्रोफ़ोन अनुमति अस्वीकृत। आप कीबोर्ड का उपयोग जारी रख सकते हैं।' 
            : 'Microphone permission denied. You can continue using keyboard controls.',
          { langOverride: language === 'hi' ? 'hi' : 'en' }
        );
        return;
      }
    }

    setIsActive(true);
    isActiveRef.current = true;
    lastReadQuestionIndexRef.current = state.currentQuestionIndex;
    
    const isHindi = language === 'hi';
    const welcome = isHindi ? 'वॉइस मोड सक्षम किया गया।' : 'Voice mode enabled.';
    
    speak(welcome, {
      langOverride: isHindi ? 'hi' : 'en',
      onEnd: () => {
        readCurrentQuestion();
      }
    });
  }, [language, speak, readCurrentQuestion, state.currentQuestionIndex]);

  // User-driven Voice Mode toggle
  const toggleVoiceMode = useCallback(() => {
    if (isActive) {
      deactivateVoiceMode();
    } else {
      enableVoiceMode();
    }
  }, [isActive, enableVoiceMode, deactivateVoiceMode]);

  return {
    isActive,
    status,
    lastCommand,
    lastActionFeedback,
    errorMessage,
    toggleVoiceMode,
    enableVoiceMode,
    disableVoiceMode: deactivateVoiceMode
  };
}
