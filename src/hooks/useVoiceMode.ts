import { useState, useEffect, useCallback, useRef } from 'react';
import { parseVoiceCommand, ParsedCommand } from '@/lib/voice/voiceParser';
import { ExamActions, ExamState } from '@/lib/useExamEngine';
import { Question } from '@/lib/examData';

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
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>('Unsupported');
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  
  // To handle confirmation flows
  const [pendingAction, setPendingAction] = useState<ParsedCommand | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  // Initialize Speech APIs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthesisRef.current = window.speechSynthesis;
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        setStatus('Ready');
      }
    }
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!synthesisRef.current) return;
    synthesisRef.current.cancel(); // Stop any ongoing speech
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    
    utterance.onstart = () => {
      if (isActive) setStatus('Speaking');
    };
    
    utterance.onend = () => {
      if (onEnd) onEnd();
      else if (isActive) {
        // Automatically start listening after speaking if active and no specific callback
        startListening();
      }
    };
    
    synthesisRef.current.speak(utterance);
  }, [isActive]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isActive) return;
    
    try {
      recognitionRef.current.start();
      setStatus('Listening');
    } catch (e) {
      // Already started
    }
  }, [isActive]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  }, []);

  // Handle auto-reading when a new question arrives, if voice mode is active
  useEffect(() => {
    if (isActive) {
      // Cancel previous speech/listening
      synthesisRef.current?.cancel();
      stopListening();
      
      const textToRead = `Question ${state.currentQuestionIndex + 1} of ${totalQuestions}. ${currentQuestion.text}. ` + 
        currentQuestion.options.map((opt, i) => `Option ${String.fromCharCode(65 + i)}: ${opt.text}.`).join(' ');
      
      speak(textToRead + " Listening for your answer.", () => {
        if (isActive) startListening();
      });
    }
  }, [state.currentQuestionIndex, currentQuestion, isActive, totalQuestions]); // Dependencies designed to trigger on question change

  // Setup recognition handlers
  useEffect(() => {
    if (!recognitionRef.current) return;

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setLastCommand(transcript);
      setStatus('Processing');
      handleCommand(transcript);
    };

    recognitionRef.current.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setStatus('Error');
        speak("Microphone permission denied. You can continue using keyboard controls.");
        setIsActive(false);
      } else if (event.error !== 'aborted' && isActive) {
        setStatus('Error');
        speak("I didn't catch that.", () => startListening());
      }
    };

    recognitionRef.current.onend = () => {
      // If we are active and supposed to be ready/listening, restart listening
      // unless we are currently speaking (speaking callback handles restart)
      if (isActive && status === 'Listening') {
        // We stopped without a result, try restarting
        try { recognitionRef.current.start(); } catch(e){}
      }
    };
  }, [isActive, status, currentQuestion]);

  const handleCommand = (transcript: string) => {
    const cmd = parseVoiceCommand(transcript);

    // If we have a pending confirmation
    if (pendingAction) {
      if (cmd.type === 'YES') {
        executeCommand(pendingAction);
        setPendingAction(null);
      } else if (cmd.type === 'NO') {
        setPendingAction(null);
        speak("Action cancelled.", () => startListening());
      } else {
        speak("Please say yes or no.", () => startListening());
      }
      return;
    }

    // Direct actions that need confirmation
    if (cmd.type === 'SUBMIT') {
      const unanswered = totalQuestions - Object.keys(state.answers).length;
      setPendingAction(cmd);
      speak(`You have ${unanswered} unanswered questions. Are you sure you want to submit the exam?`, () => startListening());
      return;
    }

    if (cmd.type === 'SELECT_OPTION') {
      const option = currentQuestion.options[cmd.letterIndex];
      if (option) {
        // Concise confirmation and action
        const letter = String.fromCharCode(65 + cmd.letterIndex);
        speak(`${letter} selected.`, () => {
          actions.selectAnswer(currentQuestion.id, option.id);
          startListening();
        });
      } else {
        speak("That option is not available.", () => startListening());
      }
      return;
    }

    // Direct actions without confirmation
    executeCommand(cmd);
  };

  const executeCommand = (cmd: ParsedCommand) => {
    switch (cmd.type) {
      case 'NEXT':
        if (state.currentQuestionIndex < totalQuestions - 1) {
          actions.goToNext();
        } else {
          speak("You are on the last question.", () => startListening());
        }
        break;
      case 'PREVIOUS':
        if (state.currentQuestionIndex > 0) {
          actions.goToPrevious();
        } else {
          speak("You are on the first question.", () => startListening());
        }
        break;
      case 'GOTO':
        const targetIndex = cmd.questionNumber - 1;
        if (targetIndex >= 0 && targetIndex < totalQuestions) {
          actions.goToQuestion(targetIndex);
        } else {
          speak(`Question ${cmd.questionNumber} is not available.`, () => startListening());
        }
        break;
      case 'TIME_LEFT':
        const mins = Math.floor(state.timeRemaining / 60);
        const secs = state.timeRemaining % 60;
        speak(`You have ${mins} minutes and ${secs} seconds remaining.`, () => startListening());
        break;
      case 'REPEAT':
        const textToRead = `${currentQuestion.text}. ` + 
          currentQuestion.options.map((opt, i) => `Option ${String.fromCharCode(65 + i)}: ${opt.text}.`).join(' ');
        speak(textToRead, () => startListening());
        break;
      case 'READ_QUESTION':
        speak(currentQuestion.text, () => startListening());
        break;
      case 'READ_OPTIONS':
        const optionsText = currentQuestion.options.map((opt, i) => `Option ${String.fromCharCode(65 + i)}: ${opt.text}.`).join(' ');
        speak(optionsText, () => startListening());
        break;
      case 'SUBMIT':
        actions.submitExam();
        speak("Exam submitted.");
        setIsActive(false);
        break;
      case 'UNKNOWN':
        speak("I didn't understand that. Please say A, B, C, D, or a command such as next or repeat.", () => startListening());
        break;
    }
  };

  const toggleVoiceMode = useCallback(() => {
    if (status === 'Unsupported') return;

    if (isActive) {
      setIsActive(false);
      synthesisRef.current?.cancel();
      stopListening();
      setStatus('Ready');
    } else {
      setIsActive(true);
      speak("Voice Mode enabled.", () => {
        // Initial auto-read when turned on will trigger via the useEffect if dependencies are set up right, 
        // or we just manually trigger a read here for the current question
        const textToRead = `Question ${state.currentQuestionIndex + 1} of ${totalQuestions}. ${currentQuestion.text}. ` + 
          currentQuestion.options.map((opt, i) => `Option ${String.fromCharCode(65 + i)}: ${opt.text}.`).join(' ');
        speak(textToRead + " Listening for your answer.", () => startListening());
      });
    }
  }, [isActive, status, stopListening, speak, state.currentQuestionIndex, totalQuestions, currentQuestion, startListening]);

  return {
    isActive,
    status,
    lastCommand,
    toggleVoiceMode
  };
}
