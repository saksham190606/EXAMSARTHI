import { useState, useEffect, useCallback, useRef } from 'react';
import { parseVoiceCommand, ParsedCommand } from '@/lib/voice/voiceParser';
import { classifyIntentLocally, playVoiceFeedbackChime } from '@/lib/voice/intent-parser';
import { matchExamIntent } from '@/lib/voice/exam-intents';
import { ExamState, announceToScreenReader } from '@/lib/useExamEngine';
import { CandidateQuestion, getQuestionType, isQuestionAnswered } from '@/types/question';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { getTranslation } from '@/lib/i18n';
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

  const [isActive, setIsActive] = useState(true);
  const [status, setStatus] = useState<VoiceStatus>('Listening');
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [lastActionFeedback, setLastActionFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Pending action for two-step confirmation (e.g., submit)
  const [pendingAction, setPendingAction] = useState<ParsedCommand | null>(null);

  // Stale state prevention refs
  const currentQuestionRef = useRef<CandidateQuestion>(currentQuestion);
  const actionsRef = useRef(actions);
  const stateRef = useRef(state);
  const questionsRef = useRef(questions);
  const languageRef = useRef(language);
  const totalQuestionsRef = useRef(totalQuestions);
  const activeSectionRef = useRef(activeSection);
  const sectionTimeRemainingRef = useRef(sectionTimeRemaining);
  const handleCommandRef = useRef<(cmd: string) => void>(() => {});

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSpeakingRef = useRef(false);
  const isActiveRef = useRef(true);
  const statusRef = useRef<VoiceStatus>('Listening');
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechWatchdogRef = useRef<NodeJS.Timeout | null>(null);
  const lastReadQuestionIndexRef = useRef<number | null>(null);
  const consecutiveFailuresRef = useRef<number>(0);

  // Synchronize mutable refs with latest React props and store state
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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

  // Clean up any pending restart timer
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

  // Select appropriate voice based on target language
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

  // Safely start speech recognition (only if active and not speaking)
  const startListening = useCallback(() => {
    clearRestartTimer();
    if (!recognitionRef.current || !isActiveRef.current || isSpeakingRef.current) {
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

  // Speech synthesis wrapper with echo-cancellation and watchdog timer to prevent dropped onend hangs
  const speak = useCallback((text: string, options?: { onEnd?: () => void; langOverride?: 'hi' | 'en' }) => {
    if (!synthesisRef.current || typeof window === 'undefined') return;

    // Immediately stop recognition before audio output begins (prevents acoustic feedback)
    stopListening();
    clearSpeechWatchdog();
    isSpeakingRef.current = true;
    setStatus('Speaking');

    try {
      synthesisRef.current.cancel(); // Flush any pending utterances
    } catch (e) {}

    const utterance = new SpeechSynthesisUtterance(formatSpeechPronunciation(text));
    
    // Set speech rate from user preference
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
      (window as any).__voiceModeUtterance = utterance;
    }

    // Safety watchdog timer: SpeechSynthesisUtterance in Chrome/Edge can occasionally drop onend
    const estimatedDurationMs = Math.min(12000, Math.max(3000, (text.length / 12) * 1000 + 2000));
    speechWatchdogRef.current = setTimeout(() => {
      if (isSpeakingRef.current) {
        console.warn('[VoiceMode] Speech watchdog timeout expired - resetting speech state to listening');
        isSpeakingRef.current = false;
        utteranceRef.current = null;
        if (isActiveRef.current) {
          startListening();
        }
      }
    }, estimatedDurationMs);

    const handleSpeechEnd = () => {
      clearSpeechWatchdog();
      utteranceRef.current = null;
      if (typeof window !== 'undefined') {
        (window as any).__voiceModeUtterance = null;
      }
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
    utterance.onerror = (e) => {
      console.warn('[VoiceMode] Utterance error:', e);
      clearSpeechWatchdog();
      utteranceRef.current = null;
      if (typeof window !== 'undefined') {
        (window as any).__voiceModeUtterance = null;
      }
      isSpeakingRef.current = false;
      if (isActiveRef.current && !isSpeakingRef.current) {
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
      if (isActiveRef.current) {
        startListening();
      }
    }
  }, [voiceSpeed, getPreferredVoice, stopListening, startListening, clearRestartTimer, clearSpeechWatchdog]);

  // Read current question out loud
  const readCurrentQuestion = useCallback((langPref?: 'hi' | 'en') => {
    const curQ = currentQuestionRef.current;
    const curLang = languageRef.current;
    const curState = stateRef.current;
    const totalQ = totalQuestionsRef.current;
    if (!curQ) return;

    const isHindi = langPref ? langPref === 'hi' : curLang === 'hi';
    const qNum = curState.currentQuestionIndex + 1;
    const qType = getQuestionType(curQ);

    let promptText = '';

    if (qType === 'single-choice') {
      const opts = (curQ as any).options || [];
      const optionsText = opts
        .map((opt: any, i: number) => `${isHindi ? 'विकल्प' : 'Option'} ${String.fromCharCode(65 + i)}: ${opt.text}.`)
        .join(' ');
      promptText = isHindi
        ? `प्रश्न संख्या ${qNum} का ${totalQ}। ${curQ.text}। विकल्प: ${optionsText} आप A, B, C या D कह सकते हैं।`
        : `Question ${qNum} of ${totalQ}. ${curQ.text}. Options: ${optionsText} You can say Option A, B, C, or D.`;
    } else if (qType === 'multiple-choice') {
      const opts = (curQ as any).options || [];
      const optionsText = opts
        .map((opt: any, i: number) => `${isHindi ? 'विकल्प' : 'Option'} ${String.fromCharCode(65 + i)}: ${opt.text}.`)
        .join(' ');
      promptText = isHindi
        ? `प्रश्न संख्या ${qNum} का ${totalQ}। सभी सही उत्तर चुनें। ${curQ.text}। विकल्प: ${optionsText}`
        : `Question ${qNum} of ${totalQ}. Select all correct answers. ${curQ.text}. Options: ${optionsText}`;
    } else if (qType === 'true-false') {
      promptText = isHindi
        ? `प्रश्न संख्या ${qNum} का ${totalQ}। ${curQ.text}। आप सत्य या असत्य कह सकते हैं।`
        : `Question ${qNum} of ${totalQ}. ${curQ.text}. You can answer true or false.`;
    } else if (qType === 'short-answer') {
      promptText = isHindi
        ? `प्रश्न संख्या ${qNum} का ${totalQ}। ${curQ.text}। कृपया अपना उत्तर बोलें।`
        : `Question ${qNum} of ${totalQ}. ${curQ.text}. Please speak your answer.`;
    } else if (qType === 'fill-blank') {
      const speechText = curQ.text.replace(/_{2,}/g, isHindi ? 'रिक्त स्थान' : 'blank');
      promptText = isHindi
        ? `प्रश्न संख्या ${qNum} का ${totalQ}। वाक्य पूरा करें। ${speechText}। कृपया अपना उत्तर बोलें।`
        : `Question ${qNum} of ${totalQ}. Complete the sentence. ${speechText}. Please speak your answer.`;
    } else {
      promptText = isHindi
        ? `प्रश्न संख्या ${qNum} का ${totalQ}। ${curQ.text}।`
        : `Question ${qNum} of ${totalQ}. ${curQ.text}.`;
    }

    speak(promptText, {
      langOverride: isHindi ? 'hi' : 'en',
      onEnd: () => startListening()
    });
  }, [speak, startListening]);

  // Read everything (question + all options completely)
  const readEverything = useCallback((langPref?: 'hi' | 'en') => {
    const curQ = currentQuestionRef.current;
    const curLang = languageRef.current;
    const curState = stateRef.current;
    const totalQ = totalQuestionsRef.current;
    if (!curQ) return;

    const isHindi = langPref ? langPref === 'hi' : curLang === 'hi';
    const qNum = curState.currentQuestionIndex + 1;
    const qType = getQuestionType(curQ);

    let promptText = '';
    if (qType === 'single-choice' || qType === 'multiple-choice') {
      const opts = (curQ as any).options || [];
      const optionsText = opts
        .map((opt: any, i: number) => `${isHindi ? 'विकल्प' : 'Option'} ${String.fromCharCode(65 + i)}: ${opt.text}.`)
        .join(' ');
      promptText = isHindi
        ? `प्रश्न ${qNum} का ${totalQ}। ${curQ.text}। सभी विकल्प हैं: ${optionsText}`
        : `Question ${qNum} of ${totalQ}. ${curQ.text}. All options are: ${optionsText}`;
    } else if (qType === 'true-false') {
      promptText = isHindi
        ? `प्रश्न ${qNum} का ${totalQ}। ${curQ.text}। विकल्प: सत्य या असत्य।`
        : `Question ${qNum} of ${totalQ}. ${curQ.text}. Options: True or False.`;
    } else {
      promptText = isHindi
        ? `प्रश्न ${qNum} का ${totalQ}। ${curQ.text}`
        : `Question ${qNum} of ${totalQ}. ${curQ.text}`;
    }

    speak(promptText, {
      langOverride: isHindi ? 'hi' : 'en',
      onEnd: () => startListening()
    });
  }, [speak, startListening]);

  // Initialize Speech APIs once on mount and guard against browser mismatches
  useEffect(() => {
    if (typeof window === 'undefined') return;

    synthesisRef.current = window.speechSynthesis;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.lang = languageRef.current === 'hi' ? 'hi-IN' : 'en-US';
      recognitionRef.current = recognition;

      if (statusRef.current === 'Unsupported' || statusRef.current === 'Ready') {
        setStatus('Ready');
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
  }, [clearRestartTimer, clearSpeechWatchdog]);

  // Update recognition language dynamically based on platform's active language setting
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-US';
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
    clearSpeechWatchdog();
    try { synthesisRef.current?.cancel(); } catch (e) {}
    stopListening();
    setStatus('Ready');
    setErrorMessage(null);
  }, [stopListening, clearRestartTimer, clearSpeechWatchdog]);

  // Direct option selection and answer locking helper (avoids stale closures via refs)
  const handleOptionSelect = useCallback((optionIndex: number) => {
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

        // Immediate visual & custom event notification
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('examsarthi-voice-action', {
            detail: { action: 'select-option', index: optionIndex, letter }
          }));
        }

        const confirmMsg = isHindi ? `विकल्प ${letter} चुना गया` : `Option ${letter} selected`;
        setLastActionFeedback(`✓ ${confirmMsg}`);
        announceToScreenReader(confirmMsg);
        speak(confirmMsg, { langOverride: targetLang, onEnd: () => startListening() });
      } else {
        const notAvail = isHindi ? `विकल्प ${letter} उपलब्ध नहीं है।` : `Option ${letter} is not available.`;
        speak(notAvail, { langOverride: targetLang, onEnd: () => startListening() });
      }
    } else if (qType === 'single-choice') {
      const opts = (curQ as any)?.options || [];
      const option = opts[optionIndex];
      if (option) {
        if (curActions.setAnswer) {
          curActions.setAnswer(curQ.id, option.id);
        }
        curActions.selectAnswer(curQ.id, option.id);

        // Immediate visual & custom event notification
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('examsarthi-voice-action', {
            detail: { action: 'select-option', index: optionIndex, letter }
          }));
        }

        const confirmMsg = isHindi ? `विकल्प ${letter} चुना गया` : `Option ${letter} selected`;
        setLastActionFeedback(`✓ ${confirmMsg}`);
        announceToScreenReader(confirmMsg);
        speak(confirmMsg, { langOverride: targetLang, onEnd: () => startListening() });
      } else {
        const notAvail = isHindi ? `विकल्प ${letter} उपलब्ध नहीं है।` : `Option ${letter} is not available.`;
        speak(notAvail, { langOverride: targetLang, onEnd: () => startListening() });
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

      const confirmMsg = boolVal
        ? (isHindi ? 'सत्य चुना गया' : 'True selected')
        : (isHindi ? 'असत्य चुना गया' : 'False selected');
      setLastActionFeedback(`✓ ${confirmMsg}`);
      announceToScreenReader(confirmMsg);
      speak(confirmMsg, { langOverride: targetLang, onEnd: () => startListening() });
    } else {
      speak(
        isHindi ? 'कृपया अपना उत्तर बोलें।' : 'Please speak your answer.',
        { langOverride: targetLang, onEnd: () => startListening() }
      );
    }
  }, [speak, startListening]);

  // Command execution router for system/navigation/reading controls
  const executeCommand = useCallback((cmd: ParsedCommand) => {
    const curActions = actionsRef.current;
    const curState = stateRef.current;
    const curQ = currentQuestionRef.current;
    const totalQ = totalQuestionsRef.current;
    const curLang = languageRef.current;
    const actSec = activeSectionRef.current;
    const secTime = sectionTimeRemainingRef.current;

    const isHindi = cmd.detectedLanguage === 'hi' || (cmd.detectedLanguage === 'mixed' && curLang === 'hi');
    const targetLang: 'hi' | 'en' = isHindi ? 'hi' : 'en';

    switch (cmd.type) {
      case 'NEXT':
        setLastActionFeedback(null);
        if (curState.currentQuestionIndex < totalQ - 1) {
          curActions.goToNext();
        } else {
          speak(
            isHindi ? 'आप अंतिम प्रश्न पर हैं।' : 'You are on the last question.',
            { langOverride: targetLang, onEnd: () => startListening() }
          );
        }
        break;

      case 'PREVIOUS':
        setLastActionFeedback(null);
        if (curState.currentQuestionIndex > 0) {
          curActions.goToPrevious();
        } else {
          speak(
            isHindi ? 'आप पहले प्रश्न पर हैं।' : 'You are on the first question.',
            { langOverride: targetLang, onEnd: () => startListening() }
          );
        }
        break;

      case 'NEXT_SECTION':
        setLastActionFeedback(null);
        if (curActions.goToNextSection) {
          curActions.goToNextSection();
          speak(
            isHindi ? 'अगले सेक्शन पर जा रहे हैं।' : 'Advancing to the next section.',
            { langOverride: targetLang, onEnd: () => startListening() }
          );
        } else {
          speak(
            isHindi ? 'इस परीक्षा में कोई अन्य सेक्शन नहीं है।' : 'This exam has no additional sections.',
            { langOverride: targetLang, onEnd: () => startListening() }
          );
        }
        break;

      case 'CURRENT_SECTION':
        setLastActionFeedback(null);
        if (actSec) {
          const secMins = Math.floor((secTime ?? 0) / 60);
          const secSecs = (secTime ?? 0) % 60;
          const qCountText = actSec.question_count ? ` इसमें ${actSec.question_count} प्रश्न हैं।` : '';
          const qCountTextEn = actSec.question_count ? ` It has ${actSec.question_count} questions.` : '';
          speak(
            isHindi
              ? `वर्तमान सेक्शन है ${actSec.name}।${qCountText} इसमें ${secMins} मिनट और ${secSecs} सेकंड का समय शेष है।`
              : `Current section is ${actSec.name}.${qCountTextEn} It has ${secMins} minutes and ${secSecs} seconds remaining.`,
            { langOverride: targetLang, onEnd: () => startListening() }
          );
        } else {
          speak(
            isHindi ? 'वर्तमान परीक्षा में अलग-अलग सेक्शन नहीं हैं।' : 'This exam has no separate sections.',
            { langOverride: targetLang, onEnd: () => startListening() }
          );
        }
        break;

      case 'GOTO':
        setLastActionFeedback(null);
        const targetIndex = cmd.questionNumber - 1;
        if (targetIndex >= 0 && targetIndex < totalQ) {
          if (targetIndex === curState.currentQuestionIndex) {
            readCurrentQuestion(targetLang);
          } else {
            curActions.goToQuestion(targetIndex);
          }
        } else {
          speak(
            isHindi ? `प्रश्न संख्या ${cmd.questionNumber} उपलब्ध नहीं है।` : `Question ${cmd.questionNumber} is not available.`,
            { langOverride: targetLang, onEnd: () => startListening() }
          );
        }
        break;

      case 'TIME_LEFT':
        const mins = Math.floor(curState.timeRemaining / 60);
        const secs = curState.timeRemaining % 60;
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
        if (curQ) {
          speak(curQ.text, {
            langOverride: targetLang,
            onEnd: () => startListening()
          });
        }
        break;

      case 'READ_OPTIONS': {
        if (!curQ) break;
        const qType = getQuestionType(curQ);
        if (qType === 'single-choice' || qType === 'multiple-choice') {
          const opts = (curQ as any).options || [];
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
        if (curQ && curActions.toggleFlag) {
          const wasFlagged = curState.flagged.has(curQ.id);
          curActions.toggleFlag(curQ.id);
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

      case 'SWITCH_TO_HINDI': {
        useAccessibilityStore.getState().setLanguage('hi');
        if (recognitionRef.current) {
          recognitionRef.current.lang = 'hi-IN';
        }
        speak(
          'भाषा हिंदी में बदल दी गई है। अब आप हिंदी में नेविगेट कर सकते हैं।',
          { langOverride: 'hi', onEnd: () => startListening() }
        );
        break;
      }

      case 'SWITCH_TO_ENGLISH': {
        useAccessibilityStore.getState().setLanguage('en');
        if (recognitionRef.current) {
          recognitionRef.current.lang = 'en-US';
        }
        speak(
          'Language switched to English.',
          { langOverride: 'en', onEnd: () => startListening() }
        );
        break;
      }

      case 'NAVIGATE': {
        const targetPath = cmd.path;
        speak(
          isHindi ? `${cmd.labelHi} पर जा रहे हैं` : `Navigating to ${cmd.labelEn}`,
          {
            langOverride: targetLang,
            onEnd: () => {
              if (typeof window !== 'undefined') {
                window.location.href = targetPath;
              }
            }
          }
        );
        break;
      }

      case 'HELP': {
        const helpText = isHindi
          ? "आप 'विकल्प ए', 'विकल्प बी', 'अगला', 'पिछला' या 'दोबारा पढ़ो' बोल सकते हैं।"
          : "You can say 'Option A', 'Option B', 'Next', 'Previous', or 'Repeat question'.";
        speak(helpText, { langOverride: targetLang, onEnd: () => startListening() });
        break;
      }

      case 'CLEAR_RESPONSE': {
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
        break;
      }

      case 'DESCRIBE_DIAGRAM': {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('examsarthi-voice-action', {
            detail: { action: 'describe-diagram' }
          }));
        }
        break;
      }

      case 'UNKNOWN': {
        const errorMsg = isHindi
          ? "आदेश समझ नहीं आया। 'अगला', 'पिछला' या 'विकल्प ए' बोलें।"
          : "Command not recognized. Say 'Next', 'Previous', or an option like 'Option A'.";
        setLastActionFeedback(errorMsg);
        speak(errorMsg, { langOverride: targetLang, onEnd: () => startListening() });
        break;
      }

      default:
        startListening();
        break;
    }
  }, [
    speak, 
    startListening, 
    readCurrentQuestion, 
    readEverything,
    onStartExam,
    deactivateVoiceMode
  ]);

  // Handle recognized transcript with high-priority direct option matching and fuzzy intent classification
  const handleCommand = useCallback((transcript: string) => {
    const curQ = currentQuestionRef.current;
    const curActions = actionsRef.current;
    const curState = stateRef.current;
    const curLang = languageRef.current;
    const isHindi = curLang === 'hi';
    const targetLang: 'hi' | 'en' = isHindi ? 'hi' : 'en';

    if (!curQ) return;
    const qType = getQuestionType(curQ);

    const clean = transcript.trim().toLowerCase().replace(/[.,!?;:]/g, '');

    // 1. HIGH-PRIORITY DIRECT OPTION MATCHING (English, Hindi, Hinglish, Digits, Devanagari)
    // - Match "A", "Option A", "One", "First", "ए", "विकल्प ए", "पहला": -> handleOptionSelect(0)
    // - Match "B", "Option B", "Two", "Second", "बी", "विकल्प बी", "दूसरा": -> handleOptionSelect(1)
    // - Match "C", "Option C", "Three", "Third", "सी", "विकल्प सी", "तीसरा": -> handleOptionSelect(2)
    // - Match "D", "Option D", "Four", "Fourth", "डी", "विकल्प डी", "चौथा": -> handleOptionSelect(3)
    const optionAMatches = ["a", "option a", "one", "first", "1", "ए", "विकल्प ए", "पहला", "ऑप्शन ए", "एक", "option ek"];
    const optionBMatches = ["b", "option b", "two", "second", "2", "बी", "विकल्प बी", "दूसरा", "ऑप्शन बी", "दो", "option do"];
    const optionCMatches = ["c", "option c", "three", "third", "3", "सी", "विकल्प सी", "तीसरा", "ऑप्शन सी", "तीन", "option teen"];
    const optionDMatches = ["d", "option d", "four", "fourth", "4", "डी", "विकल्प डी", "चौथा", "ऑप्शन डी", "चार", "option char"];

    if (optionAMatches.includes(clean)) {
      playVoiceFeedbackChime();
      handleOptionSelect(0);
      return;
    }
    if (optionBMatches.includes(clean)) {
      playVoiceFeedbackChime();
      handleOptionSelect(1);
      return;
    }
    if (optionCMatches.includes(clean)) {
      playVoiceFeedbackChime();
      handleOptionSelect(2);
      return;
    }
    if (optionDMatches.includes(clean)) {
      playVoiceFeedbackChime();
      handleOptionSelect(3);
      return;
    }

    // 2. Intelligent Exam Intent Matcher (fuzzy + phonetic)
    const examMatch = matchExamIntent(transcript, !!pendingAction);

    // Two-step confirmation active (e.g. submit exam verbal confirmation)
    if (pendingAction) {
      if (
        examMatch.type === 'CONFIRM_SUBMIT' || 
        /^(yes|yeah|sure|confirm|submit|proceed|haan|sahi|thik\s*hai|हाँ|हां|सबमिट|पुष्टि)/i.test(clean)
      ) {
        playVoiceFeedbackChime();
        setPendingAction(null);
        if (onCloseSubmitDialog) onCloseSubmitDialog();
        curActions.submitExam();
        const confMsg = isHindi ? 'परीक्षा सबमिट कर दी गई है।' : 'Exam submitted.';
        setLastActionFeedback(`✓ ${confMsg}`);
        speak(confMsg, {
          langOverride: targetLang,
          onEnd: () => deactivateVoiceMode()
        });
        return;
      } else if (
        examMatch.type === 'CANCEL_SUBMIT' || 
        /^(no|nope|cancel|nahi|nahin|chhodo|नहीं|ना|रद्द|छोड़ो)/i.test(clean)
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

    if (examMatch.type !== 'UNKNOWN') {
      playVoiceFeedbackChime();
      consecutiveFailuresRef.current = 0;

      switch (examMatch.type) {
        case 'SELECT_OPTION_A':
          handleOptionSelect(0);
          return;
        case 'SELECT_OPTION_B':
          handleOptionSelect(1);
          return;
        case 'SELECT_OPTION_C':
          handleOptionSelect(2);
          return;
        case 'SELECT_OPTION_D':
          handleOptionSelect(3);
          return;

        case 'NEXT_QUESTION': {
          const confirmText = isHindi ? examMatch.audioConfirmationHi : examMatch.audioConfirmationEn;
          setLastActionFeedback(`✓ ${confirmText}`);
          announceToScreenReader(confirmText);
          curActions.goToNext();
          speak(confirmText, { langOverride: targetLang, onEnd: () => startListening() });
          return;
        }

        case 'PREVIOUS_QUESTION': {
          const confirmText = isHindi ? examMatch.audioConfirmationHi : examMatch.audioConfirmationEn;
          setLastActionFeedback(`✓ ${confirmText}`);
          announceToScreenReader(confirmText);
          curActions.goToPrevious();
          speak(confirmText, { langOverride: targetLang, onEnd: () => startListening() });
          return;
        }

        case 'CLEAR_SELECTION': {
          if (curActions.setAnswer) {
            curActions.setAnswer(curQ.id, "");
          }
          curActions.selectAnswer(curQ.id, "");
          const confirmText = isHindi ? examMatch.audioConfirmationHi : examMatch.audioConfirmationEn;
          setLastActionFeedback(`✓ ${confirmText}`);
          announceToScreenReader(confirmText);
          speak(confirmText, { langOverride: targetLang, onEnd: () => startListening() });
          return;
        }

        case 'MARK_FOR_REVIEW': {
          if (curActions.toggleFlag) {
            curActions.toggleFlag(curQ.id);
          }
          const confirmText = isHindi ? examMatch.audioConfirmationHi : examMatch.audioConfirmationEn;
          setLastActionFeedback(`✓ ${confirmText}`);
          announceToScreenReader(confirmText);
          speak(confirmText, { langOverride: targetLang, onEnd: () => startListening() });
          return;
        }

        case 'READ_AGAIN': {
          readEverything(targetLang);
          return;
        }

        case 'DESCRIBE_DIAGRAM': {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('examsarthi-voice-action', {
              detail: { action: 'describe-diagram' }
            }));
          }
          const describeBtn = typeof document !== 'undefined'
            ? document.querySelector<HTMLElement>('button[aria-label*="Describe diagram" i], button:has(svg.lucide-sparkles)')
            : null;
          if (describeBtn) {
            describeBtn.click();
          }
          const confirmText = isHindi ? examMatch.audioConfirmationHi : examMatch.audioConfirmationEn;
          speak(confirmText, { langOverride: targetLang, onEnd: () => startListening() });
          return;
        }

        case 'SUBMIT_EXAM': {
          setPendingAction({ type: 'SUBMIT' } as any);
          if (onOpenSubmitDialog) onOpenSubmitDialog();
          const confirmPrompt = isHindi ? examMatch.audioConfirmationHi : examMatch.audioConfirmationEn;
          speak(confirmPrompt, { langOverride: targetLang, onEnd: () => startListening() });
          return;
        }

        default:
          break;
      }
    }

    // 3. Fallback to voiceParser (for true/false, text input, navigation)
    const cmd = parseVoiceCommand(transcript, {
      questionType: qType,
      currentQuestion: curQ,
      isPendingConfirmation: !!pendingAction
    });

    if (cmd.type !== 'UNKNOWN') {
      playVoiceFeedbackChime();
      consecutiveFailuresRef.current = 0;
    } else {
      // Check fallback intent classifier before failing
      const fallbackResult = classifyIntentLocally(transcript);
      if (fallbackResult.intent !== 'UNKNOWN') {
        playVoiceFeedbackChime();
        consecutiveFailuresRef.current = 0;

        switch (fallbackResult.intent) {
          case 'NAVIGATE_BACK':
          case 'PREVIOUS_QUESTION': {
            const feedbackText = isHindi ? 'पिछला प्रश्न' : 'Previous question';
            announceToScreenReader(feedbackText);
            setLastActionFeedback(`✓ ${feedbackText}`);
            curActions.goToPrevious();
            speak(feedbackText, { langOverride: targetLang, onEnd: () => startListening() });
            return;
          }
          case 'NEXT_QUESTION': {
            const feedbackText = isHindi ? 'अगला प्रश्न' : 'Next question';
            announceToScreenReader(feedbackText);
            setLastActionFeedback(`✓ ${feedbackText}`);
            curActions.goToNext();
            speak(feedbackText, { langOverride: targetLang, onEnd: () => startListening() });
            return;
          }
          case 'CLEAR_RESPONSE': {
            if (curActions.setAnswer) curActions.setAnswer(curQ.id, "");
            curActions.selectAnswer(curQ.id, "");
            const confirmClear = isHindi ? 'उत्तर हटा दिया गया।' : 'Response cleared.';
            setLastActionFeedback(`✓ ${confirmClear}`);
            announceToScreenReader(confirmClear);
            speak(confirmClear, { langOverride: targetLang, onEnd: () => startListening() });
            return;
          }
          default:
            break;
        }
      }
    }

    // Submit dialog initiation
    if (cmd.type === 'SUBMIT') {
      const activeQList = questionsRef.current && questionsRef.current.length > 0 ? questionsRef.current : [];
      const answered = activeQList.filter(q => isQuestionAnswered(q, curState.answers[q.id])).length;
      const unanswered = totalQuestionsRef.current - answered;
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

    // True/False answer
    if (cmd.type === 'TRUE_FALSE') {
      if (curActions.setAnswer) {
        curActions.setAnswer(curQ.id, cmd.value);
      }
      curActions.selectAnswer(curQ.id, cmd.value ? 'true' : 'false');
      
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

    // Text answer
    if (cmd.type === 'TEXT_ANSWER') {
      if (curActions.setAnswer) {
        curActions.setAnswer(curQ.id, cmd.text);
      }
      curActions.selectAnswer(curQ.id, cmd.text);

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

    // Multiple selection
    if (cmd.type === 'SELECT_MULTIPLE_OPTIONS') {
      const opts = (curQ as any).options || [];
      const currentSelected: string[] = Array.isArray(curState.answers[curQ.id])
        ? (curState.answers[curQ.id] as string[])
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
        const newSelection = Array.from(new Set([...currentSelected, ...targetOptionIds]));
        if (curActions.setAnswer) {
          curActions.setAnswer(curQ.id, newSelection);
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
      }
      return;
    }

    // Single option selection via parser
    if (cmd.type === 'SELECT_OPTION') {
      handleOptionSelect(cmd.letterIndex);
      return;
    }

    // Route other standard commands
    executeCommand(cmd);
  }, [
    handleOptionSelect,
    executeCommand,
    pendingAction,
    onOpenSubmitDialog,
    onCloseSubmitDialog,
    speak,
    startListening,
    readEverything,
    deactivateVoiceMode
  ]);

  // Always keep handleCommandRef pointing to current handleCommand callback
  useEffect(() => {
    handleCommandRef.current = handleCommand;
  }, [handleCommand]);

  // Bind Web Speech API recognition event handlers
  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    recognition.onresult = (event: any) => {
      // Echo-cancellation guard: ignore input while TTS / screen reader is speaking to prevent false self-triggers
      if (
        isSpeakingRef.current || 
        (synthesisRef.current && synthesisRef.current.speaking) ||
        (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking)
      ) {
        return;
      }

      consecutiveFailuresRef.current = 0;
      const resultIndex = event.resultIndex !== undefined ? event.resultIndex : event.results.length - 1;
      const transcript = event.results?.[resultIndex]?.[0]?.transcript?.trim();
      if (!transcript) {
        return;
      }

      setLastCommand(transcript);
      setStatus('Processing');
      if (handleCommandRef.current) {
        handleCommandRef.current(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      const error = event.error;
      console.warn('[VoiceMode] Speech recognition error encountered:', error);

      // Fatal microphone permission denied or revoked mid-exam
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        setStatus('Error');
        const fallbackMsg = languageRef.current === 'hi'
          ? 'माइक्रोफ़ोन अनुमति अस्वीकृत या निरस्त। कीबोर्ड मोड सक्रिय है, और आपकी परीक्षा प्रगति पूरी तरह सुरक्षित है।'
          : 'Microphone permission denied or revoked. Voice mode disabled. Keyboard controls remain active, and your exam progress is safely preserved.';
        
        setErrorMessage(fallbackMsg);
        setIsActive(false);
        isActiveRef.current = false;
        announceToScreenReader(fallbackMsg);
        speak(fallbackMsg, { langOverride: languageRef.current === 'hi' ? 'hi' : 'en' });
        return;
      }

      // CRITICAL: 'no-speech' is normal silence while candidate is thinking. Auto-recover silently.
      if (error === 'no-speech') {
        if (isActiveRef.current && !isSpeakingRef.current) {
          setStatus('Listening');
          clearRestartTimer();
          restartTimerRef.current = setTimeout(() => {
            if (isActiveRef.current && !isSpeakingRef.current) {
              startListening();
            }
          }, 300);
        }
        return;
      }

      if (error === 'aborted') {
        return;
      }

      if (error === 'network') {
        console.warn('[VoiceMode] Transient network speech service error, auto-recovering...');
        if (isActiveRef.current && !isSpeakingRef.current) {
          clearRestartTimer();
          restartTimerRef.current = setTimeout(() => {
            if (isActiveRef.current && !isSpeakingRef.current) {
              startListening();
            }
          }, 500);
        }
        return;
      }

      // Non-fatal transient errors: quietly recover to listening state
      if (isActiveRef.current && !isSpeakingRef.current) {
        setStatus('Listening');
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          if (isActiveRef.current && !isSpeakingRef.current) {
            startListening();
          }
        }, 300);
      }
    };

    recognition.onend = () => {
      // Continuous listening loop: automatically re-invoke recognition.start() within 300ms timeout
      // so momentary pauses or silence do not kill the listener permanently.
      if (isActiveRef.current && !isSpeakingRef.current) {
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          if (isActiveRef.current && !isSpeakingRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
              setStatus('Listening');
            } catch (e: any) {
              // Ignore if already started or transitioning
            }
          }
        }, 300);
      }
    };
  }, [speak, startListening, clearRestartTimer]);

  const hasAutoStartedRef = useRef(false);

  // Auto-Start Listener & TalkBack on Component Mount:
  // Automatically start recognition without manual toggle, and trigger TTS TalkBack:
  // "Exam started. Voice mode is active. Question 1..." followed by question text and options.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasAutoStartedRef.current) return;
    if (!currentQuestion) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('Unsupported');
      return;
    }

    hasAutoStartedRef.current = true;
    setIsActive(true);
    isActiveRef.current = true;
    setStatus('Listening');

    // Trigger permission dialog if not yet approved
    if (navigator?.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
        })
        .catch((err) => {
          console.warn('[VoiceMode] Mic permission prompt notice on auto-mount:', err);
        });
    }

    const curLang = languageRef.current;
    const isHindi = curLang === 'hi';
    const curQ = currentQuestionRef.current;
    const curState = stateRef.current;
    const totalQ = totalQuestionsRef.current;
    const qNum = curState.currentQuestionIndex + 1;
    const qType = getQuestionType(curQ);

    let optionsText = '';
    if (qType === 'single-choice' || qType === 'multiple-choice') {
      const opts = (curQ as any).options || [];
      optionsText = opts
        .map((opt: any, i: number) => `${isHindi ? 'विकल्प' : 'Option'} ${String.fromCharCode(65 + i)}: ${opt.text}.`)
        .join(' ');
    } else if (qType === 'true-false') {
      optionsText = isHindi ? 'विकल्प: सत्य या असत्य।' : 'Options: True or False.';
    }

    const welcomeIntro = isHindi
      ? `परीक्षा शुरू हो गई है। वॉइस मोड सक्रिय है। प्रश्न संख्या ${qNum} का ${totalQ}। ${curQ.text}। ${optionsText} ${qType === 'single-choice' ? 'आप A, B, C या D कह सकते हैं।' : ''}`
      : `Exam started. Voice mode is active. Question ${qNum} of ${totalQ}. ${curQ.text}. ${optionsText} ${qType === 'single-choice' ? 'You can say Option A, B, C, or D.' : ''}`;

    lastReadQuestionIndexRef.current = curState.currentQuestionIndex;

    const timer = setTimeout(() => {
      speak(welcomeIntro, {
        langOverride: isHindi ? 'hi' : 'en',
        onEnd: () => {
          startListening();
        }
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [currentQuestion, speak, startListening]);

  // Auto-read question when candidate navigates to a new question
  useEffect(() => {
    if (isActive && hasAutoStartedRef.current && lastReadQuestionIndexRef.current !== state.currentQuestionIndex) {
      lastReadQuestionIndexRef.current = state.currentQuestionIndex;
      setLastActionFeedback(null);
      readCurrentQuestion();
    }
  }, [isActive, state.currentQuestionIndex, readCurrentQuestion]);

  // Explicit Microphone Permission & Initialization:
  // Before starting recognition, invoke navigator.mediaDevices.getUserMedia({ audio: true })
  // to force the browser permission dialog if not yet granted.
  const enableVoiceMode = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('Unsupported');
      return;
    }

    setStatus('RequestingPermission');
    setErrorMessage(null);

    // Explicit browser permission request
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release media stream tracks so SpeechRecognition has sole access to the microphone
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        console.warn('[VoiceMode] getUserMedia permission denied or failed:', err);
        setStatus('Error');
        const errText = languageRef.current === 'hi'
          ? 'माइक्रोफ़ोन अनुमति अस्वीकृत। आप कीबोर्ड का उपयोग जारी रख सकते हैं।'
          : 'Microphone permission denied. You can continue using keyboard controls.';
        setErrorMessage(errText);
        setIsActive(false);
        isActiveRef.current = false;
        speak(errText, { langOverride: languageRef.current === 'hi' ? 'hi' : 'en' });
        return;
      }
    }

    setIsActive(true);
    isActiveRef.current = true;
    lastReadQuestionIndexRef.current = stateRef.current.currentQuestionIndex;

    const isHindi = languageRef.current === 'hi';
    const welcome = isHindi ? 'वॉइस मोड सक्षम किया गया।' : 'Voice mode enabled.';

    speak(welcome, {
      langOverride: isHindi ? 'hi' : 'en',
      onEnd: () => {
        readCurrentQuestion();
      }
    });
  }, [speak, readCurrentQuestion]);

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
