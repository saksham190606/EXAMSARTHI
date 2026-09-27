import { useState, useCallback, useRef, useEffect } from 'react';
import { classifyIntentLocally, playVoiceFeedbackChime } from '@/lib/voice/intent-parser';
import { matchExamIntent } from '@/lib/voice/exam-intents';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';

// Deal with browser prefixes for SpeechRecognition
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpeechRecognition = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;

export interface VoiceCommandConfig {
  isSubmitDialogOpen: boolean;
  onSelectOptionIndex: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onGoToQuestion?: (index: number) => void;
  onReadQuestion: () => void;
  onReadOptions: () => void;
  onStopSpeaking: () => void;
  onSubmitExam: () => void;
  onConfirmSubmit: () => void;
  onCancelSubmit: () => void;
  onFeedback: (message: string) => void;
}

export function useVoiceCommands(config: VoiceCommandConfig) {
  const [isListening, setIsListening] = useState(false);
  const [statusText, setStatusText] = useState('Voice command ready');

  // We use refs for config so the recognition callbacks always see the latest functions
  // without needing to restart the recognition instance.
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const processCommand = useCallback((transcript: string) => {
    const {
      isSubmitDialogOpen,
      onSelectOptionIndex,
      onNext,
      onPrev,
      onGoToQuestion,
      onReadQuestion,
      onReadOptions,
      onStopSpeaking,
      onSubmitExam,
      onConfirmSubmit,
      onCancelSubmit,
      onFeedback
    } = configRef.current;

    const isHi = useAccessibilityStore.getState().language === 'hi';

    // 1. Primary Check: Intelligent Exam Intent & Keyword Matcher
    const examMatch = matchExamIntent(transcript, isSubmitDialogOpen);
    if (examMatch.type !== 'UNKNOWN') {
      playVoiceFeedbackChime();

      if (isSubmitDialogOpen) {
        if (examMatch.type === 'CONFIRM_SUBMIT') {
          onConfirmSubmit();
          onFeedback(isHi ? examMatch.audioConfirmationHi : examMatch.audioConfirmationEn);
          setStatusText(isHi ? 'पुष्टि: परीक्षा सबमिट की गई' : 'Command recognized: Confirm submission');
          return;
        }
        if (examMatch.type === 'CANCEL_SUBMIT') {
          onCancelSubmit();
          onFeedback(isHi ? examMatch.audioConfirmationHi : examMatch.audioConfirmationEn);
          setStatusText(isHi ? 'कार्रवाई रद्द की गई' : 'Command recognized: Cancel submission');
          return;
        }
      }

      switch (examMatch.type) {
        case 'SELECT_OPTION_A':
        case 'SELECT_OPTION_B':
        case 'SELECT_OPTION_C':
        case 'SELECT_OPTION_D': {
          if (!isSubmitDialogOpen && examMatch.optionIndex !== undefined) {
            onSelectOptionIndex(examMatch.optionIndex);
            const letter = String.fromCharCode(65 + examMatch.optionIndex);
            onFeedback(isHi ? examMatch.audioConfirmationHi : examMatch.audioConfirmationEn);
            setStatusText(isHi ? `विकल्प ${letter} चुना गया` : `Command recognized: Option ${letter}`);
            return;
          }
          break;
        }
        case 'NEXT_QUESTION': {
          onNext();
          onFeedback(isHi ? examMatch.audioConfirmationHi : examMatch.audioConfirmationEn);
          setStatusText(isHi ? 'अगला प्रश्न' : 'Command recognized: Next question');
          return;
        }
        case 'PREVIOUS_QUESTION': {
          onPrev();
          onFeedback(isHi ? examMatch.audioConfirmationHi : examMatch.audioConfirmationEn);
          setStatusText(isHi ? 'पिछला प्रश्न' : 'Command recognized: Previous question');
          return;
        }
        case 'READ_AGAIN': {
          onReadQuestion();
          setStatusText(isHi ? 'प्रश्न पढ़ें' : 'Command recognized: Read question');
          return;
        }
        case 'DESCRIBE_DIAGRAM': {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('examsarthi-voice-action', {
              detail: { action: 'describe-diagram' }
            }));
          }
          onFeedback(isHi ? examMatch.audioConfirmationHi : examMatch.audioConfirmationEn);
          return;
        }
        case 'SUBMIT_EXAM': {
          if (!isSubmitDialogOpen) {
            onSubmitExam();
            onFeedback(isHi ? examMatch.audioConfirmationHi : examMatch.audioConfirmationEn);
            setStatusText(isHi ? 'सबमिट परीक्षा' : 'Command recognized: Submit exam');
            return;
          }
          break;
        }
        default:
          break;
      }
    }

    // 2. Submission Dialog Fallbacks
    if (isSubmitDialogOpen) {
      if (/yes|confirm|submit|haan|हाँ|हां|सबमिट/i.test(transcript)) {
        playVoiceFeedbackChime();
        onConfirmSubmit();
        onFeedback('Exam submitted.');
        setStatusText('Command recognized: Confirm submission');
        return;
      }
      if (/no|cancel|nahi|nahin|नहीं|रद्द/i.test(transcript)) {
        playVoiceFeedbackChime();
        onCancelSubmit();
        onFeedback('Submission cancelled.');
        setStatusText('Command recognized: Cancel submission');
        return;
      }
    }

    // 3. Fallback regex checks
    const optionMatch = transcript.match(/(?:option|choose|select)\s*(?:option\s*)?([a-d1-4])/i);
    if (optionMatch && !isSubmitDialogOpen) {
      const val = optionMatch[1].toLowerCase();
      let index = -1;
      if (val === 'a' || val === '1') index = 0;
      else if (val === 'b' || val === '2') index = 1;
      else if (val === 'c' || val === '3') index = 2;
      else if (val === 'd' || val === '4') index = 3;

      if (index !== -1) {
        playVoiceFeedbackChime();
        onSelectOptionIndex(index);
        const letter = ['A', 'B', 'C', 'D'][index];
        onFeedback(`Option ${letter} selected.`);
        setStatusText(`Command recognized: Option ${letter}`);
        return;
      }
    }

    if (/(next|go to next)/i.test(transcript)) {
      playVoiceFeedbackChime();
      onNext();
      onFeedback('Next question.');
      setStatusText('Command recognized: Next question');
      return;
    }
    if (/(previous|go to previous)/i.test(transcript)) {
      playVoiceFeedbackChime();
      onPrev();
      onFeedback('Previous question.');
      setStatusText('Command recognized: Previous question');
      return;
    }

    // Question jumping
    const qMatch = transcript.match(/(?:go to )?question (\d+)/i);
    if (qMatch && !isSubmitDialogOpen) {
      const qNum = parseInt(qMatch[1], 10);
      if (qNum > 0 && onGoToQuestion) {
        playVoiceFeedbackChime();
        onGoToQuestion(qNum - 1);
        onFeedback(`Moved to question ${qNum}.`);
        setStatusText(`Command recognized: Go to question ${qNum}`);
        return;
      }
    }

    // Reading controls
    if (/(read|repeat)\s*question/i.test(transcript)) {
      playVoiceFeedbackChime();
      onReadQuestion();
      setStatusText('Command recognized: Read question');
      return;
    }
    if (/read\s*options/i.test(transcript)) {
      playVoiceFeedbackChime();
      onReadOptions();
      setStatusText('Command recognized: Read options');
      return;
    }
    if (/stop\s*(speaking|reading)/i.test(transcript)) {
      onStopSpeaking();
      setStatusText('Command recognized: Stop speaking');
      return;
    }

    // 4. Polite Fallback for Unrecognized Voice Command
    const politeFallback = isHi
      ? "आदेश समझ नहीं आया। 'अगला', 'पिछला' या 'विकल्प ए' बोलें।"
      : "Command not recognized. Say 'Next', 'Previous', or an option like 'Option A'.";
    onFeedback(politeFallback);
    setStatusText(politeFallback);
  }, []);

  const isListeningRef = useRef(false);
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Initialize recognition
  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      const lang = useAccessibilityStore.getState().language;
      recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setStatusText('Listening for a voice command...');
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        // Echo-cancellation guard: ignore input when speech synthesis is speaking
        if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
          return;
        }

        const resultIndex = event.resultIndex !== undefined ? event.resultIndex : event.results.length - 1;
        const transcript = event.results?.[resultIndex]?.[0]?.transcript?.trim();
        if (transcript) {
          processCommand(transcript);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          return;
        }
        if (event.error === 'aborted') {
          return;
        }
        switch (event.error) {
          case 'network':
            setStatusText('Voice recognition could not connect. Check your internet connection.');
            break;
          case 'not-allowed':
          case 'service-not-allowed':
            setStatusText('Microphone permission is required for voice commands.');
            setIsListening(false);
            break;
          case 'audio-capture':
            setStatusText('No microphone was found. Ensure a microphone is connected.');
            setIsListening(false);
            break;
          default:
            setStatusText(`Notice: ${event.error}`);
            break;
        }
      };

      recognition.onend = () => {
        // Auto-restart recognition if listening toggle remains enabled
        if (isListeningRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (_) {}
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [processCommand]);



  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Already started or error
        console.warn('Speech recognition start error', e);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    isSupported: !!SpeechRecognition,
    isListening,
    statusText,
    startListening,
    stopListening
  };
}
