"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { playVoiceFeedbackChime } from '@/lib/voice/intent-parser';
import { matchExamIntent } from '@/lib/voice/exam-intents';
import { ExamState, announceToScreenReader } from '@/lib/useExamEngine';
import { CandidateQuestion, getQuestionType } from '@/types/question';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { matchTokenToCommand } from '@/lib/voice/speech-recognition';
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

  // 2. FLAG / MARK FOR REVIEW:
  // Toggle review state for the current question
  // Audio confirmation: Speak "Marked for review" / "रिव्यू के लिए चिह्नित किया गया" (or "Unflagged" if toggled off)
  const handleToggleFlag = useCallback(() => {
    const q = currentQuestionRef.current;
    if (!q) return;
    const isCurrentlyFlagged = stateRef.current.flagged.has(q.id);
    if (actionsRef.current.toggleFlag) {
      actionsRef.current.toggleFlag(q.id);
    }
    const isHi = languageRef.current === 'hi';
    const speechLang = isHi ? 'hi-IN' : 'en-US';
    const feedback = isCurrentlyFlagged
      ? (isHi ? 'रिव्यू चिह्न हटाया गया' : 'Unflagged')
      : (isHi ? 'रिव्यू के लिए चिह्नित किया गया' : 'Marked for review');
    setLastActionFeedback(`✓ ${feedback}`);
    announceToScreenReader(feedback);
    speakText(feedback, speechLang, () => {
      if (isActiveRef.current && !userManuallyMutedRef.current) {
        startListening(speechLang);
      }
    });
  }, []);

  // 2. CLEAR RESPONSE:
  // Clear the selected option/text for current question
  // Audio confirmation: Speak "Response cleared" / "उत्तर हटा दिया गया"
  const handleClearAnswer = useCallback(() => {
    const q = currentQuestionRef.current;
    if (!q) return;
    if (actionsRef.current.setAnswer) {
      actionsRef.current.setAnswer(q.id, '');
    }
    actionsRef.current.selectAnswer(q.id, '');
    const isHi = languageRef.current === 'hi';
    const speechLang = isHi ? 'hi-IN' : 'en-US';
    const cleared = isHi ? 'उत्तर हटा दिया गया' : 'Response cleared';
    setLastActionFeedback(`✓ ${cleared}`);
    announceToScreenReader(cleared);
    speakText(cleared, speechLang, () => {
      if (isActiveRef.current && !userManuallyMutedRef.current) {
        startListening(speechLang);
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

  // 3. Question Read-Out Adaptation by Type:
  // Update TTS reader to announce the format clearly so visually impaired candidates know how to answer
  const readQuestion = useCallback((index: number) => {
    const questionsList = questionsRef.current;
    const targetQ = (questionsList && questionsList[index]) ? questionsList[index] : currentQuestionRef.current;
    if (!targetQ) return;

    const isHi = languageRef.current === 'hi';
    const speechLang = isHi ? 'hi-IN' : 'en-US';

    const qType = getQuestionType(targetQ);
    const isTrueFalse =
      qType === 'true-false' ||
      (targetQ.options && targetQ.options.length === 2 &&
       targetQ.options.some((o) => /^(true|false|सत्य|असत्य)/i.test(o.text)));
    const isInputQuestion =
      qType === 'fill-blank' ||
      qType === 'short-answer' ||
      (!targetQ.options || targetQ.options.length === 0);

    const getOptText = (opt: any) => {
      if (!opt) return '';
      return typeof opt === 'string' ? opt : (opt.text || '');
    };
    const opts = targetQ.options || [];
    const optA = getOptText(opts[0]);
    const optB = getOptText(opts[1]);
    const optC = getOptText(opts[2]);
    const optD = getOptText(opts[3]);

    let textToRead = '';
    if (isTrueFalse) {
      // If True/False:
      // Speak: "Question [N]: [question text]. State whether this is True or False."
      // Hindi: "प्रश्न [N]: [question text]। बताएं कि यह सत्य है या गलत।"
      textToRead = isHi
        ? `प्रश्न ${index + 1}: ${targetQ.text}। बताएं कि यह सत्य है या गलत।`
        : `Question ${index + 1}: ${targetQ.text}. State whether this is True or False.`;
    } else if (isInputQuestion) {
      // If Fill in the Blank / Short Answer:
      // Speak: "Question [N]: [question text]. Please speak your answer to fill in the blank."
      // Hindi: "प्रश्न [N]: [question text]। खाली स्थान भरने के लिए अपना उत्तर बोलें।"
      textToRead = isHi
        ? `प्रश्न ${index + 1}: ${targetQ.text}। खाली स्थान भरने के लिए अपना उत्तर बोलें।`
        : `Question ${index + 1}: ${targetQ.text}. Please speak your answer to fill in the blank.`;
    } else {
      // If MCQ:
      // Speak question text and all options A, B, C, D
      textToRead = isHi
        ? `प्रश्न ${index + 1}. ${targetQ.text}. ${optA ? `विकल्प ए: ${optA}. ` : ''}${optB ? `विकल्प बी: ${optB}. ` : ''}${optC ? `विकल्प सी: ${optC}. ` : ''}${optD ? `विकल्प डी: ${optD}.` : ''}`.trim()
        : `Question ${index + 1}. ${targetQ.text}. Option A: ${optA}. Option B: ${optB}. Option C: ${optC}. Option D: ${optD}.`;
    }

    lastReadIndexRef.current = index;
    setStatus('Speaking');
    setVoiceStatus('Reading question...');

    // Wait until speaking completely finishes before starting the mic listener!
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

  // Voice Input Processor with Core Command Priority and Dynamic Question Type Discrimination
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

    const words = transcript.split(/\s+/);
    const phoneticMatch = matchTokenToCommand(transcript);

    // =========================================================================
    // 2. CORE VOICE EXAM COMMANDS (Take immediate precedence across all types)
    // =========================================================================

    // REPEAT / READ AGAIN:
    // Keywords: ["repeat", "repeat question", "read again", "read question", "dobara padho", "फिर से पढ़ो", "दोबारा बोलो", "दोबारा"]
    const repeatKeywords = [
      "repeat", "repeat question", "read again", "read question", "dobara padho", "फिर से पढ़ो", "दोबारा बोलो", "दोबारा", "again", "फिर से"
    ];
    if (phoneticMatch?.action === 'REPEAT_QUESTION' || repeatKeywords.some((k) => transcript === k || transcript.includes(k))) {
      playVoiceFeedbackChime();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
      readCurrentQuestion();
      return;
    }

    // FLAG / MARK FOR REVIEW:
    // Keywords: ["flag", "flag for review", "mark for review", "review later", "रिव्यू", "चिह्नित करो", "बाद में देखेंगे", "फ्लैग"]
    const flagKeywords = [
      "flag", "flag for review", "mark for review", "review later", "रिव्यू", "चिह्नित करो", "बाद में देखेंगे", "फ्लैग", "bookmark", "चिह्नित"
    ];
    if (phoneticMatch?.action === 'FLAG_REVIEW' || flagKeywords.some((k) => transcript === k || transcript.includes(k))) {
      playVoiceFeedbackChime();
      handleToggleFlag();
      return;
    }

    // CLEAR RESPONSE:
    // Keywords: ["clear", "clear response", "unselect", "remove answer", "साफ करो", "हटाओ"]
    const clearKeywords = [
      "clear response", "clear answer", "unselect", "remove answer", "साफ करो", "हटाओ", "clear"
    ];
    if (phoneticMatch?.action === 'CLEAR_RESPONSE' || clearKeywords.some((k) => transcript === k || transcript.includes(k))) {
      playVoiceFeedbackChime();
      handleClearAnswer();
      return;
    }

    // NEXT / PREVIOUS:
    // Keywords for Next: ["next", "next question", "agla", "अगला", "आगे"] -> handleNextQuestion()
    const nextKeywords = ["next", "next question", "agla", "अगला", "आगे"];
    if (phoneticMatch?.action === 'NAVIGATE_NEXT' || nextKeywords.some((k) => transcript === k || transcript.includes(k) || words.includes(k))) {
      playVoiceFeedbackChime();
      handleNextQuestion();
      return;
    }

    // Keywords for Previous: ["previous", "back", "pichla", "पिछला", "पीछे"] -> handlePrevQuestion()
    const prevKeywords = ["previous", "back", "pichla", "पिछला", "पीछे", "piche"];
    if (phoneticMatch?.action === 'NAVIGATE_PREVIOUS' || prevKeywords.some((k) => transcript === k || transcript.includes(k) || words.includes(k))) {
      playVoiceFeedbackChime();
      handlePrevQuestion();
      return;
    }

    // SUBMIT EXAM:
    // Keywords: ["submit exam", "submit test", "finish exam", "end test", "सबमिट करो", "परीक्षा समाप्त"]
    const submitKeywords = [
      "submit exam", "submit test", "finish exam", "end test", "सबमिट करो", "परीक्षा समाप्त", "submit"
    ];
    if (phoneticMatch?.action === 'SUBMIT_EXAM' || submitKeywords.some((k) => transcript === k || transcript.includes(k))) {
      playVoiceFeedbackChime();
      handleSubmitTrigger();
      return;
    }

    // =========================================================================
    // 1. DYNAMIC QUESTION TYPE DISCRIMINATION
    // =========================================================================
    const currentQ = currentQuestionRef.current;
    if (!currentQ) return;

    const qType = getQuestionType(currentQ);
    const isTrueFalse =
      qType === 'true-false' ||
      (currentQ.options && currentQ.options.length === 2 &&
       currentQ.options.some((o) => /^(true|false|सत्य|असत्य)/i.test(o.text)));
    const isInputQuestion =
      qType === 'fill-blank' ||
      qType === 'short-answer' ||
      (!currentQ.options || currentQ.options.length === 0);

    // -------------------------------------------------------------------------
    // A. TYPE: "TRUE_FALSE" (or questions with only 2 binary options)
    // -------------------------------------------------------------------------
    if (isTrueFalse) {
      // Recognized inputs for TRUE:
      // ["true", "sahi", "satya", "yes", "सही", "सत्य", "ट्रू", "हाँ"]
      const trueTokens = ["true", "sahi", "satya", "yes", "सही", "सत्य", "ट्रू", "हाँ", "हा"];
      if (phoneticMatch?.action === 'SELECT_TRUE' || trueTokens.some((t) => transcript === t || words.includes(t) || (t.length > 2 && transcript.includes(t)))) {
        playVoiceFeedbackChime();
        const trueOptId = (currentQ.options && currentQ.options[0]) ? currentQ.options[0].id : "true";
        if (actionsRef.current.setAnswer) {
          actionsRef.current.setAnswer(currentQ.id, true);
        }
        actionsRef.current.selectAnswer(currentQ.id, trueOptId);
        const conf = isHi ? "सत्य चुना गया" : "Selected True";
        setLastActionFeedback(`✓ ${conf}`);
        announceToScreenReader(conf);
        speakText(conf, speechLang, () => startListening(speechLang));
        return;
      }

      // Recognized inputs for FALSE:
      // ["false", "galat", "asatya", "no", "गलत", "असत्य", "फॉल्स", "नहीं"]
      const falseTokens = ["false", "galat", "asatya", "no", "गलत", "असत्य", "फॉल्स", "नहीं", "ना"];
      if (phoneticMatch?.action === 'SELECT_FALSE' || falseTokens.some((t) => transcript === t || words.includes(t) || (t.length > 2 && transcript.includes(t)))) {
        playVoiceFeedbackChime();
        const falseOptId = (currentQ.options && currentQ.options[1]) ? currentQ.options[1].id : "false";
        if (actionsRef.current.setAnswer) {
          actionsRef.current.setAnswer(currentQ.id, false);
        }
        actionsRef.current.selectAnswer(currentQ.id, falseOptId);
        const conf = isHi ? "गलत चुना गया" : "Selected False";
        setLastActionFeedback(`✓ ${conf}`);
        announceToScreenReader(conf);
        speakText(conf, speechLang, () => startListening(speechLang));
        return;
      }

      // If user says A/B/C/D on a True/False question:
      // Announce: "This is a True or False question. Please say True or False."
      const mcqTokens = [
        "option a", "option b", "option c", "option d",
        "विकल्प ए", "विकल्प बी", "विकल्प सी", "विकल्प डी",
        "a", "b", "c", "d", "ए", "बी", "सी", "डी"
      ];
      if ((phoneticMatch && ['SELECT_A', 'SELECT_B', 'SELECT_C', 'SELECT_D'].includes(phoneticMatch.action)) || mcqTokens.some((t) => transcript === t || words.includes(t))) {
        const warning = isHi
          ? "यह सत्य या असत्य प्रश्न है। कृपया सत्य या असत्य कहें।"
          : "This is a True or False question. Please say True or False.";
        setLastActionFeedback(`⚠️ ${warning}`);
        announceToScreenReader(warning);
        speakText(warning, speechLang, () => startListening(speechLang));
        return;
      }

      return;
    }

    // -------------------------------------------------------------------------
    // B. TYPE: "FILL_IN_BLANKS" / "NUMERICAL" / "INPUT"
    // -------------------------------------------------------------------------
    if (isInputQuestion) {
      // Spoken command to erase:
      // ["clear answer", "erase", "हटाओ", "खाली करो"] -> resets input to ""
      const eraseTokens = ["clear answer", "erase", "हटाओ", "खाली करो", "साफ करो"];
      if (eraseTokens.some((t) => transcript === t || transcript.includes(t))) {
        playVoiceFeedbackChime();
        if (actionsRef.current.setAnswer) {
          actionsRef.current.setAnswer(currentQ.id, "");
        }
        actionsRef.current.selectAnswer(currentQ.id, "");
        const conf = isHi ? "उत्तर खाली किया गया" : "Answer erased";
        setLastActionFeedback(`✓ ${conf}`);
        announceToScreenReader(conf);
        speakText(conf, speechLang, () => startListening(speechLang));
        return;
      }

      // Directly pipe recognized spoken transcript into text input value
      // Remove trailing punctuation/periods that speech recognition auto-appends
      const cleanedInput = raw.replace(/[.,;!?]+$/, '').trim();
      if (cleanedInput) {
        playVoiceFeedbackChime();
        if (actionsRef.current.setAnswer) {
          actionsRef.current.setAnswer(currentQ.id, cleanedInput);
        }
        actionsRef.current.selectAnswer(currentQ.id, cleanedInput);
        // Audio confirmation: Speak "Entered: " + transcript
        const conf = isHi ? `दर्ज किया गया: ${cleanedInput}` : `Entered: ${cleanedInput}`;
        setLastActionFeedback(`✓ ${conf}`);
        announceToScreenReader(conf);
        speakText(conf, speechLang, () => startListening(speechLang));
        return;
      }

      return;
    }

    // -------------------------------------------------------------------------
    // C. TYPE: "MCQ" (Standard 4 Options)
    // -------------------------------------------------------------------------
    // Option A: "a", "option a", "1", "one", "पहला", "विकल्प ए" -> select Option 0. Speak "Selected A"
    const optATokens = ["option a", "विकल्प ए", "पहला", "one", "a", "1", "ए", "एक"];
    // Option B: "b", "option b", "2", "two", "दूसरा", "विकल्प बी" -> select Option 1. Speak "Selected B"
    const optBTokens = ["option b", "विकल्प बी", "दूसरा", "two", "b", "2", "बी", "दो"];
    // Option C: "c", "option c", "3", "three", "तीसरा", "विकल्प सी" -> select Option 2. Speak "Selected C"
    const optCTokens = ["option c", "विकल्प सी", "तीसरा", "three", "c", "3", "सी", "तीन"];
    // Option D: "d", "option d", "4", "four", "चौथा", "विकल्प डी" -> select Option 3. Speak "Selected D"
    const optDTokens = ["option d", "विकल्प डी", "चौथा", "four", "d", "4", "डी", "चार"];

    if (phoneticMatch?.action === 'SELECT_A' || optATokens.some((t) => transcript === t || transcript.includes(t) || words.includes(t))) {
      playVoiceFeedbackChime();
      handleSelectOption(0);
      speakText(isHi ? "विकल्प ए चुना गया" : "Selected A", speechLang, () => {
        startListening(speechLang);
      });
      return;
    }

    if (phoneticMatch?.action === 'SELECT_B' || optBTokens.some((t) => transcript === t || transcript.includes(t) || words.includes(t))) {
      playVoiceFeedbackChime();
      handleSelectOption(1);
      speakText(isHi ? "विकल्प बी चुना गया" : "Selected B", speechLang, () => {
        startListening(speechLang);
      });
      return;
    }

    if (phoneticMatch?.action === 'SELECT_C' || optCTokens.some((t) => transcript === t || transcript.includes(t) || words.includes(t))) {
      playVoiceFeedbackChime();
      handleSelectOption(2);
      speakText(isHi ? "विकल्प सी चुना गया" : "Selected C", speechLang, () => {
        startListening(speechLang);
      });
      return;
    }

    if (phoneticMatch?.action === 'SELECT_D' || optDTokens.some((t) => transcript === t || transcript.includes(t) || words.includes(t))) {
      playVoiceFeedbackChime();
      handleSelectOption(3);
      speakText(isHi ? "विकल्प डी चुना गया" : "Selected D", speechLang, () => {
        startListening(speechLang);
      });
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
    }
  }, [
    handleSelectOption,
    handleNextQuestion,
    handlePrevQuestion,
    handleToggleFlag,
    handleClearAnswer,
    handleSubmitTrigger,
    readCurrentQuestion,
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
