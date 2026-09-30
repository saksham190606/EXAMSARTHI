import { useState, useCallback, useRef, useEffect } from 'react';
import { playVoiceFeedbackChime } from '@/lib/voice/intent-parser';
import { matchExamIntent } from '@/lib/voice/exam-intents';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';

import {
  useVoiceRecognitionSupport,
  startListening as engineStartListening,
  stopListening as engineStopListening,
} from '@/lib/voice/useVoiceEngine';

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
  const isSupported = useVoiceRecognitionSupport();
  const [isListening, setIsListening] = useState(false);
  const [statusText, setStatusText] = useState('Voice command ready');

  // We use refs for config so the recognition callbacks always see the latest functions
  // without needing to restart the recognition instance.
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

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
    const optionMatch = transcript.match(/(?:option|choose|select|mark|pick|answer|ans|vikalp|विकल्प|ऑप्शन)?\s*(?:is\s*)?(?:option\s*|vikalp\s*)?([a-d1-4])/i);
    const isOptionUtterance = optionMatch && (
      /^[a-d1-4]$/i.test(transcript.trim()) ||
      /(?:option|opt|choice|choose|select|mark|pick|answer|ans|vikalp|विकल्प|ऑप्शन)/i.test(transcript)
    );
    if (isOptionUtterance && !isSubmitDialogOpen && optionMatch) {
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
  // Managed by centralized global Voice Engine in useVoiceEngine



  const startListening = useCallback(() => {
    if (useAccessibilityStore.getState().accessibilityMode === 'keyboard') {
      setIsListening(false);
      return;
    }
    const isHi = useAccessibilityStore.getState().language === 'hi';
    if (!isSupported) {
      setIsListening(false);
      setStatusText(isHi ? 'इस ब्राउज़र में वॉइस कमांड उपलब्ध नहीं हैं' : 'Voice commands are not supported in this browser');
      return;
    }
    setIsListening(true);
    isListeningRef.current = true;
    setStatusText('Listening for a voice command...');
    engineStartListening(isHi ? 'hi-IN' : 'en-US', (transcript) => {
      processCommand(transcript);
    });
  }, [isSupported, processCommand]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    isListeningRef.current = false;
    engineStopListening();
    setStatusText('Voice command ready');
  }, []);

  return {
    isSupported,
    isListening,
    statusText,
    startListening,
    stopListening
  };
}
