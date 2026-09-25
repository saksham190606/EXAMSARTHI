import { useState, useEffect, useCallback, useRef } from 'react';
import { parseVoiceCommand, ParsedCommand } from '@/lib/voice/voiceParser';
import { ExamActions, ExamState } from '@/lib/useExamEngine';
import { Question } from '@/lib/examData';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { getTranslation } from '@/lib/i18n';

export type VoiceStatus = 'Ready' | 'Listening' | 'Processing' | 'Speaking' | 'Error' | 'Unsupported';

interface UseVoiceModeProps {
  actions: {
    selectAnswer: (qId: string, oId: string) => void;
    goToNext: () => void;
    goToPrevious: () => void;
    goToQuestion: (idx: number) => void;
    submitExam: () => void;
  };
  state: ExamState;
  currentQuestion: Question;
  totalQuestions: number;
}

export function useVoiceMode({ actions, state, currentQuestion, totalQuestions }: UseVoiceModeProps) {
  const language = useAccessibilityStore((s) => s.language);
  const voiceSpeed = useAccessibilityStore((s) => s.voiceSpeed);
  const enableVoiceCommands = useAccessibilityStore((s) => s.enableVoiceCommands);
  const setEnableVoiceCommands = useAccessibilityStore((s) => s.setEnableVoiceCommands);

  const [isActive, setIsActive] = useState(enableVoiceCommands);
  const [status, setStatus] = useState<VoiceStatus>('Unsupported');
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  
  // Pending action for two-step confirmation (e.g., submit)
  const [pendingAction, setPendingAction] = useState<ParsedCommand | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const isSpeakingRef = useRef(false);
  const isActiveRef = useRef(false);
  const statusRef = useRef<VoiceStatus>('Unsupported');
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastReadQuestionIndexRef = useRef<number | null>(null);
  const hasAnnouncedStartRef = useRef(false);

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

  // Select appropriate voice based on active language
  const getPreferredVoice = useCallback(() => {
    if (!synthesisRef.current) return null;
    const voices = synthesisRef.current.getVoices();
    if (!voices || voices.length === 0) return null;

    if (language === 'hi') {
      const hindiVoice = voices.find((v) => v.lang.toLowerCase().startsWith('hi'));
      if (hindiVoice) return hindiVoice;
    }

    // Default or English
    const inEnglishVoice = voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith('en-in'));
    if (inEnglishVoice) return inEnglishVoice;

    const anyEnglishVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    return anyEnglishVoice || voices[0] || null;
  }, [language]);

  // Safely stop recognition
  const stopListening = useCallback(() => {
    clearRestartTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore errors when aborting idle recognition
      }
    }
  }, []);

  // Safely start recognition (only if active and not speaking)
  const startListening = useCallback(() => {
    clearRestartTimer();
    if (!recognitionRef.current || !isActiveRef.current || isSpeakingRef.current) {
      return;
    }

    try {
      recognitionRef.current.start();
      setStatus('Listening');
    } catch (e: any) {
      // If already started, ensure status reflects Listening
      if (e?.name === 'InvalidStateError' || e?.message?.includes('already started')) {
        setStatus('Listening');
      }
    }
  }, []);

  // Speech synthesis wrapper that cleanly suppresses microphone collision
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!synthesisRef.current || typeof window === 'undefined') return;

    // Immediately stop recognition before audio output begins
    stopListening();
    isSpeakingRef.current = true;
    setStatus('Speaking');

    try {
      synthesisRef.current.cancel(); // Stop any pending utterances
    } catch (e) {}

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set speech rate from user preference
    if (voiceSpeed === 'slow') utterance.rate = 0.85;
    else if (voiceSpeed === 'fast') utterance.rate = 1.2;
    else utterance.rate = 1.0;

    const voice = getPreferredVoice();
    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

    const handleSpeechEnd = () => {
      isSpeakingRef.current = false;
      // Allow audio buffer to flush (250ms delay) to prevent microphone echo
      clearRestartTimer();
      restartTimerRef.current = setTimeout(() => {
        if (isActiveRef.current && !isSpeakingRef.current) {
          if (onEnd) {
            onEnd();
          } else {
            startListening();
          }
        }
      }, 250);
    };

    utterance.onend = handleSpeechEnd;
    utterance.onerror = (e) => {
      // If speech was canceled manually (e.g. by stopListening), do not trigger errors
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

  // Read current question out loud
  const readCurrentQuestion = useCallback(() => {
    const isHindi = language === 'hi';
    const qNum = state.currentQuestionIndex + 1;
    
    let startAnnouncement = '';
    // Only build announcement if it hasn't actually been fully announced yet
    if (!hasAnnouncedStartRef.current) {
      const minutes = Math.floor(state.timeRemaining / 60);
      startAnnouncement = isHindi
        ? `परीक्षा शुरू हो गई है। आपके पास ${minutes} मिनट हैं। `
        : `Exam started. You have ${minutes} minutes. `;
    }

    const questionPrefix = isHindi 
      ? `प्रश्न ${qNum} का ${totalQuestions}। ` 
      : `Question ${qNum} of ${totalQuestions}. `;
    
    const questionText = `${currentQuestion.text}.`;

    const optionsText = currentQuestion.options
      .map((opt, i) => `${isHindi ? 'विकल्प' : 'Option'} ${String.fromCharCode(65 + i)}: ${opt.text}.`)
      .join(' ');

    const promptText = isHindi
      ? `आपका उत्तर सुन रहे हैं।`
      : `Listening for your answer.`;

    // Chain the speech utterances to ensure no overlap and everything is fully read
    const playPrompt = () => {
      speak(promptText, () => {
        startListening();
      });
    };
    const playOptions = () => {
      speak(optionsText, playPrompt);
    };
    const playQuestion = () => {
      // Mark as announced so we don't repeat the start announcement on next question
      hasAnnouncedStartRef.current = true;
      speak(`${questionPrefix} ${questionText}`, playOptions);
    };
    
    const playStart = () => {
      if (startAnnouncement) {
        speak(startAnnouncement, playQuestion);
      } else {
        playQuestion();
      }
    };

    playStart();
  }, [language, state.currentQuestionIndex, state.timeRemaining, totalQuestions, currentQuestion, speak, startListening]);

  // Initialize Speech APIs once on mount and update language when preference changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    synthesisRef.current = window.speechSynthesis;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      recognitionRef.current = recognition;

      if (statusRef.current === 'Unsupported') {
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
  }, [language]);

  // Update recognition language dynamically when language changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    }
  }, [language]);

  // Command execution router
  const executeCommand = useCallback((cmd: ParsedCommand) => {
    const isHindi = language === 'hi';

    switch (cmd.type) {
      case 'NEXT':
        if (state.currentQuestionIndex < totalQuestions - 1) {
          actions.goToNext();
        } else {
          speak(isHindi ? 'आप अंतिम प्रश्न पर हैं।' : 'You are on the last question.', () => startListening());
        }
        break;

      case 'PREVIOUS':
        if (state.currentQuestionIndex > 0) {
          actions.goToPrevious();
        } else {
          speak(isHindi ? 'आप पहले प्रश्न पर हैं।' : 'You are on the first question.', () => startListening());
        }
        break;

      case 'GOTO':
        const targetIndex = cmd.questionNumber - 1;
        if (targetIndex >= 0 && targetIndex < totalQuestions) {
          if (targetIndex === state.currentQuestionIndex) {
            readCurrentQuestion();
          } else {
            actions.goToQuestion(targetIndex);
          }
        } else {
          speak(
            isHindi ? `प्रश्न ${cmd.questionNumber} उपलब्ध नहीं है।` : `Question ${cmd.questionNumber} is not available.`,
            () => startListening()
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
          () => startListening()
        );
        break;

      case 'REPEAT':
        readCurrentQuestion();
        break;

      case 'READ_QUESTION':
        speak(currentQuestion.text, () => startListening());
        break;

      case 'READ_OPTIONS':
        const optionsText = currentQuestion.options
          .map((opt, i) => `${isHindi ? 'विकल्प' : 'Option'} ${String.fromCharCode(65 + i)}: ${opt.text}.`)
          .join(' ');
        speak(optionsText, () => startListening());
        break;

      case 'SUBMIT':
        actions.submitExam();
        speak(isHindi ? 'परीक्षा सबमिट कर दी गई है।' : 'Exam submitted.');
        setIsActive(false);
        break;

      case 'UNKNOWN':
        // Crucial fix: Speak concise feedback once, then resume listening quietly without looping
        speak(
          isHindi
            ? 'कमांड समझ नहीं आया। कृपया विकल्प ए, बी, सी, डी या अगला कहें।'
            : 'Command not recognized. Please say Option A, B, C, D, Next, or Repeat.',
          () => startListening()
        );
        break;
    }
  }, [language, state.currentQuestionIndex, state.timeRemaining, totalQuestions, currentQuestion, actions, speak, startListening, readCurrentQuestion]);

  // Handle recognized transcript
  const handleCommand = useCallback((transcript: string) => {
    const isHindi = language === 'hi';
    const cmd = parseVoiceCommand(transcript);

    // If confirmation is pending (e.g. submit confirmation)
    if (pendingAction) {
      if (cmd.type === 'YES') {
        const actionToRun = pendingAction;
        setPendingAction(null);
        executeCommand(actionToRun);
      } else if (cmd.type === 'NO') {
        setPendingAction(null);
        speak(isHindi ? 'कार्रवाई रद्द की गई।' : 'Action cancelled.', () => startListening());
      } else {
        speak(isHindi ? 'कृपया हाँ या नहीं कहें।' : 'Please say yes or no.', () => startListening());
      }
      return;
    }

    // Direct submit action requires confirmation safeguard
    if (cmd.type === 'SUBMIT') {
      const unanswered = totalQuestions - Object.keys(state.answers).length;
      setPendingAction(cmd);
      const confirmPrompt = isHindi
        ? `आपके ${unanswered} अनुत्तरित प्रश्न हैं। क्या आप परीक्षा सबमिट करना चाहते हैं? हाँ या नहीं कहें।`
        : `You have ${unanswered} unanswered questions. Are you sure you want to submit the exam? Say yes or no.`;
      speak(confirmPrompt, () => startListening());
      return;
    }

    // Direct option selection
    if (cmd.type === 'SELECT_OPTION') {
      const option = currentQuestion.options[cmd.letterIndex];
      if (option) {
        const letter = String.fromCharCode(65 + cmd.letterIndex);
        actions.selectAnswer(currentQuestion.id, option.id);
        const confirmMsg = isHindi ? `विकल्प ${letter} चुना गया।` : `Option ${letter} selected.`;
        speak(confirmMsg, () => startListening());
      } else {
        speak(isHindi ? 'वह विकल्प उपलब्ध नहीं है।' : 'That option is not available.', () => startListening());
      }
      return;
    }

    // Execute other standard navigation and query commands
    executeCommand(cmd);
  }, [language, pendingAction, totalQuestions, state.answers, currentQuestion, actions, speak, startListening, executeCommand]);

  // Bind speech recognition event handlers
  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) {
        if (isActiveRef.current && !isSpeakingRef.current) {
          startListening();
        }
        return;
      }

      setLastCommand(transcript);
      setStatus('Processing');
      handleCommand(transcript);
    };

    recognition.onerror = (event: any) => {
      const error = event.error;

      if (error === 'not-allowed' || error === 'service-not-allowed') {
        setStatus('Error');
        const isHindi = language === 'hi';
        speak(isHindi ? 'माइक्रोफोन की अनुमति अस्वीकार कर दी गई।' : 'Microphone permission denied. You can continue using keyboard controls.');
        setIsActive(false);
        return;
      }

      // CRITICAL FIX: 'no-speech' is normal when user is thinking quietly.
      // Silently resume listening if still active. NEVER say "I didn't catch that".
      if (error === 'no-speech') {
        if (isActiveRef.current && !isSpeakingRef.current) {
          setStatus('Listening');
          startListening();
        }
        return;
      }

      // 'aborted' happens normally during speech synthesis interruptions or toggles
      if (error === 'aborted') {
        return;
      }

      // Other non-fatal errors: recover to listening state silently without loop
      if (isActiveRef.current && !isSpeakingRef.current) {
        setStatus('Listening');
        startListening();
      }
    };

    recognition.onend = () => {
      // Only restart if active, not speaking, and status is Listening
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
      readCurrentQuestion();
    }
  }, [isActive, state.currentQuestionIndex, readCurrentQuestion]);

  // Toggle voice mode on/off
  const toggleVoiceMode = useCallback(() => {
    if (statusRef.current === 'Unsupported') return;

    if (isActive) {
      setIsActive(false);
      setEnableVoiceCommands(false);
      isActiveRef.current = false;
      lastReadQuestionIndexRef.current = null;
      clearRestartTimer();
      try { synthesisRef.current?.cancel(); } catch (e) {}
      stopListening();
      setStatus('Ready');
    } else {
      setIsActive(true);
      setEnableVoiceCommands(true);
      isActiveRef.current = true;
      lastReadQuestionIndexRef.current = state.currentQuestionIndex;
      
      const isHindi = language === 'hi';
      const welcome = isHindi ? 'आवाज परीक्षा मोड सक्षम किया गया।' : 'Voice Mode enabled.';
      
      speak(welcome, () => {
        readCurrentQuestion();
      });
    }
  }, [isActive, language, speak, stopListening, readCurrentQuestion, state.currentQuestionIndex, setEnableVoiceCommands]);

  return {
    isActive,
    status,
    lastCommand,
    toggleVoiceMode
  };
}
