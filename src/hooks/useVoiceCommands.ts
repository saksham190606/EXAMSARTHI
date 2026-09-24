import { useState, useCallback, useRef, useEffect } from 'react';

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

    // Check submission dialog commands first if dialog is open
    if (isSubmitDialogOpen) {
      if (/yes|confirm|submit/i.test(transcript)) {
        onConfirmSubmit();
        onFeedback('Exam submitted.');
        setStatusText('Command recognized: Confirm submission');
        return;
      }
      if (/no|cancel/i.test(transcript)) {
        onCancelSubmit();
        onFeedback('Submission cancelled.');
        setStatusText('Command recognized: Cancel submission');
        return;
      }
    }

    // Answer Selection: "Option A", "Choose option 2", "Select C"
    const optionMatch = transcript.match(/(?:option|choose|select)\s*(?:option\s*)?([a-d1-4])/i);
    if (optionMatch && !isSubmitDialogOpen) {
      const val = optionMatch[1].toLowerCase();
      let index = -1;
      if (val === 'a' || val === '1') index = 0;
      else if (val === 'b' || val === '2') index = 1;
      else if (val === 'c' || val === '3') index = 2;
      else if (val === 'd' || val === '4') index = 3;

      if (index !== -1) {
        onSelectOptionIndex(index);
        const letter = ['A', 'B', 'C', 'D'][index];
        onFeedback(`Option ${letter} selected.`);
        setStatusText(`Command recognized: Option ${letter}`);
        return;
      }
    }

    // Navigation
    if (/(next|go to next)/i.test(transcript)) {
      onNext();
      onFeedback('Next question.');
      setStatusText('Command recognized: Next question');
      return;
    }
    if (/(previous|go to previous)/i.test(transcript)) {
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
        onGoToQuestion(qNum - 1);
        onFeedback(`Moved to question ${qNum}.`);
        setStatusText(`Command recognized: Go to question ${qNum}`);
        return;
      }
    }

    // Reading controls
    if (/(read|repeat)\s*question/i.test(transcript)) {
      onReadQuestion();
      setStatusText('Command recognized: Read question');
      return;
    }
    if (/read\s*options/i.test(transcript)) {
      onReadOptions();
      setStatusText('Command recognized: Read options');
      return;
    }
    if (/stop\s*(speaking|reading)/i.test(transcript)) {
      onStopSpeaking();
      setStatusText('Command recognized: Stop speaking');
      return;
    }

    // Exam controls
    if (/submit(?:\s*exam)?/i.test(transcript) && !isSubmitDialogOpen) {
      onSubmitExam();
      onFeedback('Submission confirmation opened. Are you sure you want to submit the exam?');
      setStatusText('Command recognized: Submit exam');
      return;
    }

    // Unknown command
    onFeedback('Command not recognized. Please try again.');
    setStatusText(`Command not recognized: "${transcript}"`);
  }, []);

  // Initialize recognition
  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setStatusText('Listening for a voice command...');
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        processCommand(transcript);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        setIsListening(false);
        switch (event.error) {
          case 'network':
            setStatusText('Voice recognition could not connect. Check your internet connection or try Chrome.');
            break;
          case 'not-allowed':
          case 'service-not-allowed':
            setStatusText('Microphone permission is required for voice commands.');
            break;
          case 'no-speech':
            setStatusText('No speech detected. Please try again.');
            break;
          case 'audio-capture':
            setStatusText('No microphone was found. Ensure a microphone is connected.');
            break;
          case 'aborted':
            setStatusText('Voice command cancelled.');
            break;
          default:
            setStatusText(`Error: ${event.error}`);
            break;
        }
      };

      recognition.onend = () => {
        setIsListening(false);
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
