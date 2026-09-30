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
  speakQuestion,
  startListening,
  stopListening,
  requestMicAccess,
  stopSpeaking,
} from '@/lib/voice/useVoiceEngine';
import { routeVoiceCommand, wholeWordMatch, registerVoiceContext, unregisterVoiceContext } from '@/lib/voice/commandRouter';

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
  const accessibilityMode = useAccessibilityStore((s) => s.accessibilityMode);
  const isKeyboardMode = accessibilityMode === 'keyboard';

  const [isActive, setIsActive] = useState<boolean>(!isKeyboardMode);
  const [status, setStatus] = useState<VoiceStatus>('Listening');
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [lastHeardTranscript, setLastHeardTranscript] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string>('Listening (mic is hot)');
  const [lastActionFeedback, setLastActionFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return Boolean((window as any).__examsarthi_audio_unlocked) ||
          sessionStorage.getItem('examAudioUnlocked') === 'true';
      } catch {
        return Boolean((window as any).__examsarthi_audio_unlocked);
      }
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
  const lastCommandTimeRef = useRef<number>(0);

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
      if (onOpenSubmitDialog) {
        onOpenSubmitDialog();
      }
      const atLast = languageRef.current === 'hi' ? 'यह अंतिम प्रश्न है। परीक्षा सबमिट करें।' : 'You have reached the end of the examination. Ready to submit.';
      setLastActionFeedback(atLast);
      speakText(atLast, languageRef.current === 'hi' ? 'hi-IN' : 'en-US', () => {
        if (isActiveRef.current && !userManuallyMutedRef.current) {
          startListening(languageRef.current === 'hi' ? 'hi-IN' : 'en-US');
        }
      });
    }
  }, [totalQuestions, onOpenSubmitDialog]);

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
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

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
    setVoiceStatus('[ 🔇 Mic Paused (Speaking) ]');

    // Scroll to the active question so it is visible on screen while being read out
    if (typeof window !== 'undefined') {
      const questionEl = document.getElementById('active-question-display') || document.getElementById('active-question-card');
      if (questionEl) {
        questionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    // Wait until speaking completely finishes before starting the mic listener!
    speakQuestion(textToRead, speechLang, () => {
      if (isActiveRef.current && !userManuallyMutedRef.current) {
        setStatus('Listening');
        setVoiceStatus('[ 🎙️ Listening ]');
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

    // Inside your recognition.onresult handler, place this immediately after checking if the system is speaking:
    if (typeof window !== 'undefined' && (window as any).isSystemSpeaking === true) {
      console.warn("BLOCKED ECHO: System is currently speaking.");
      return;
    }

    const now = Date.now();
    if (now - lastCommandTimeRef.current < 800) {
      return; 
    }

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
        lastCommandTimeRef.current = now;
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
        lastCommandTimeRef.current = now;
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
    const routed = routeVoiceCommand(transcript, 'exam');
    const phoneticMatch = matchTokenToCommand(transcript);

    if (routed.handled) {
      lastCommandTimeRef.current = now;
      playVoiceFeedbackChime();
      const feedback = routed.readback || 'Command recognized';
      setLastActionFeedback(`✓ ${feedback}`);
      if (routed.type === 'route' && routed.path) {
        speakText(feedback, speechLang, () => {
          if (typeof window !== 'undefined') {
            window.location.href = routed.path!;
          }
        });
        return;
      }
      if (routed.type === 'next') {
        handleNextQuestion();
        return;
      }
      if (routed.type === 'previous') {
        handlePrevQuestion();
        return;
      }
      if (routed.type === 'clear-answer') {
        handleClearAnswer();
        return;
      }
      if (routed.type === 'flag-unflag') {
        handleToggleFlag();
        return;
      }
      if (routed.type === 'repeat-question') {
        readCurrentQuestion();
        return;
      }
      if (routed.type === 'select-option' && routed.optionIndex !== undefined) {
        const q = currentQuestionRef.current;
        if (q && q.options && routed.optionIndex >= 0 && routed.optionIndex < q.options.length) {
          handleSelectOption(routed.optionIndex);
          const letter = String.fromCharCode(65 + routed.optionIndex);
          const confText = isHi ? `विकल्प ${letter} चुना गया` : `Option ${letter} selected`;
          speakText(confText, speechLang, () => {
            if (isActiveRef.current && !userManuallyMutedRef.current) {
              startListening(speechLang);
            }
          });
          return;
        }
      }
      if (routed.type === 'submit') {
        handleSubmitTrigger();
        return;
      }
      if (routed.type === 'describe-diagram') {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('examsarthi-voice-action', { detail: { action: 'describe-diagram' } }));
        }
        return;
      }
      if (routed.type === 'pause' || routed.type === 'stop') {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          stopSpeaking();
        }
        return;
      }
      if (routed.type === 'resume') {
        readCurrentQuestion();
        return;
      }
      if (routed.type === 'confirm' || routed.type === 'cancel') {
        if (pendingActionRef.current) {
          if (routed.type === 'confirm') {
            const confMsg = isHi ? 'परीक्षा सबमिट कर दी गई है।' : 'Exam submitted.';
            setPendingAction(null);
            pendingActionRef.current = null;
            if (onCloseSubmitDialogRef.current) onCloseSubmitDialogRef.current();
            actionsRef.current.submitExam();
            speakText(confMsg, speechLang, () => setIsActive(false));
            return;
          }
          const cancelMsg = isHi ? 'कार्रवाई रद्द की गई।' : 'Submission cancelled.';
          setPendingAction(null);
          pendingActionRef.current = null;
          if (onCloseSubmitDialogRef.current) onCloseSubmitDialogRef.current();
          speakText(cancelMsg, speechLang, () => startListening(speechLang));
          return;
        }
      }
    }

    // =========================================================================
    // 2. CORE VOICE EXAM COMMANDS (Take immediate precedence across all types)
    // =========================================================================

    // REPEAT / READ AGAIN:
    // Keywords: ["repeat", "again", "dobara", "फिर से", "दोबारा"]
    const repeatKeywords = [
      "repeat", "again", "dobara", "फिर से", "दोबारा", "repeat question", "read again", "read question", "dobara padho", "फिर से पढ़ो", "दोबारा बोलो"
    ];
    if (phoneticMatch?.action === 'REPEAT_QUESTION' || repeatKeywords.some((k) => transcript === k || transcript.includes(k))) {
      lastCommandTimeRef.current = now;
      playVoiceFeedbackChime();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          stopSpeaking();
        } catch (e) {}
      }
      readCurrentQuestion();
      return;
    }

    // FLAG FOR REVIEW:
    // Ensure option selection phrases (e.g. "mark option a", "mark 1") are never hijacked as flags
    const isOptionCommand = routed.type === 'select-option' ||
      /(?:option|opt|choice|select|choose|mark|pick|answer|ans|vikalp|विकल्प|ऑप्शन)\s*(?:is\s*)?(?:option\s*)?([a-d1-4]|ay|bee|see|dee)/i.test(transcript) ||
      /^[a-d1-4]$/i.test(transcript);

    const flagKeywords = [
      "flag for review", "flagfor review", "flagfor", "flag this", "flag question",
      "mark for review", "review later", "bookmark", "रिव्यू", "चिह्नित करो", "फ्लैग", "बाद में देखेंगे", "चिह्नित"
    ];
    const isFlagMatch = !isOptionCommand && (
      phoneticMatch?.action === 'FLAG_REVIEW' ||
      flagKeywords.some((k) => transcript === k || (k.includes(' ') && transcript.includes(k))) ||
      wholeWordMatch(transcript, "flag") ||
      (wholeWordMatch(transcript, "mark") && !/(?:option|opt|choice|[a-d1-4]|ay|bee|see|dee|one|two|three|four)/i.test(transcript))
    );
    if (isFlagMatch) {
      lastCommandTimeRef.current = now;
      playVoiceFeedbackChime();
      handleToggleFlag();
      return;
    }

    // CLEAR RESPONSE:
    // Keywords: ["clear", "remove", "erase", "साफ करो", "हटाओ"]
    const clearKeywords = [
      "clear", "remove", "erase", "साफ करो", "हटाओ", "clear response", "clear answer", "unselect", "remove answer"
    ];
    if (phoneticMatch?.action === 'CLEAR_RESPONSE' || clearKeywords.some((k) => transcript === k || transcript.includes(k))) {
      lastCommandTimeRef.current = now;
      playVoiceFeedbackChime();
      handleClearAnswer();
      return;
    }

    // NEXT QUESTION:
    // Keywords: ["next", "agla", "आगे", "अगला"]
    const nextKeywords = ["next", "agla", "अगला", "next question", "forward", "aage", "आगे", "next please"];
    if (phoneticMatch?.action === 'NAVIGATE_NEXT' || nextKeywords.some((k) => transcript === k || wholeWordMatch(transcript, k))) {
      lastCommandTimeRef.current = now;
      playVoiceFeedbackChime();
      handleNextQuestion();
      return;
    }

    // PREVIOUS QUESTION:
    // Keywords: ["previous", "back", "pichla", "पिछला", "पीछे"]
    const prevKeywords = ["previous", "back", "pichla", "पिछला", "पीछे", "piche", "prev", "previous question", "peeche"];
    if (phoneticMatch?.action === 'NAVIGATE_PREVIOUS' || prevKeywords.some((k) => transcript === k || wholeWordMatch(transcript, k))) {
      lastCommandTimeRef.current = now;
      playVoiceFeedbackChime();
      handlePrevQuestion();
      return;
    }

    // SUBMIT EXAM:
    // Keywords: ["submit exam", "finish test", "end test", "सबमिट करो", "परीक्षा समाप्त"]
    const submitKeywords = [
      "submit exam", "finish test", "end test", "सबमिट करो", "परीक्षा समाप्त", "submit test", "finish exam", "submit"
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
      // Recognized inputs for TRUE (Option A / 1 / True / Sahi):
      const trueTokens = [
        "true", "sahi", "satya", "yes", "सही", "सत्य", "ट्रू", "हाँ", "हा",
        "a", "1", "one", "option a", "option 1", "opt a", "opt 1", "select a", "choose a", "विकल्प ए", "पहला"
      ];
      const matchTrueToken = (t: string) => /^[a1]$/.test(t) ? (transcript === t || words.includes(t)) : (transcript === t || wholeWordMatch(transcript, t));
      if (phoneticMatch?.action === 'SELECT_TRUE' || phoneticMatch?.action === 'SELECT_A' || routed.optionIndex === 0 || trueTokens.some(matchTrueToken)) {
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

      // Recognized inputs for FALSE (Option B / 2 / False / Galat):
      const falseTokens = [
        "false", "galat", "asatya", "no", "गलत", "असत्य", "फॉल्स", "नहीं", "ना",
        "b", "2", "two", "option b", "option 2", "opt b", "opt 2", "select b", "choose b", "विकल्प बी", "दूसरा"
      ];
      const matchFalseToken = (t: string) => /^[b2]$/.test(t) ? (transcript === t || words.includes(t)) : (transcript === t || wholeWordMatch(transcript, t));
      if (phoneticMatch?.action === 'SELECT_FALSE' || phoneticMatch?.action === 'SELECT_B' || routed.optionIndex === 1 || falseTokens.some(matchFalseToken)) {
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

      // If user says C or D on a True/False question:
      const invalidTFTokens = ["option c", "option d", "c", "d", "सी", "डी", "3", "4", "three", "four"];
      if ((phoneticMatch && ['SELECT_C', 'SELECT_D'].includes(phoneticMatch.action)) || invalidTFTokens.some((t) => transcript === t || words.includes(t))) {
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
    const optATokens = [
      "a", "1", "one", "eight", "ay", "hey",
      "option a", "opt a", "choice a", "select a", "select option a", "choose a", "choose option a",
      "mark a", "mark option a", "answer a", "answer is a", "ans a", "option 1", "opt 1", "choice 1",
      "select 1", "select option 1", "first", "first option", "vikalp a", "vikalp 1", "विकल्प ए", "पहला", "ए", "एक", "पहला विकल्प", "ऑप्शन ए", "ऑप्शन 1"
    ];
    const optBTokens = [
      "b", "2", "two", "bee", "be",
      "option b", "opt b", "choice b", "select b", "select option b", "choose b", "choose option b",
      "mark b", "mark option b", "answer b", "answer is b", "ans b", "option 2", "opt 2", "choice 2",
      "select 2", "select option 2", "second", "second option", "vikalp b", "vikalp 2", "विकल्प बी", "दूसरा", "बी", "दो", "दूसरा विकल्प", "ऑप्शन बी", "ऑप्शन 2"
    ];
    const optCTokens = [
      "c", "3", "three", "see", "sea", "si",
      "option c", "opt c", "choice c", "select c", "select option c", "choose c", "choose option c",
      "mark c", "mark option c", "answer c", "answer is c", "ans c", "option 3", "opt 3", "choice 3",
      "select 3", "select option 3", "third", "third option", "vikalp c", "vikalp 3", "विकल्प सी", "तीसरा", "सी", "तीन", "तीसरा विकल्प", "ऑप्शन सी", "ऑप्शन 3"
    ];
    const optDTokens = [
      "d", "4", "four", "dee",
      "option d", "opt d", "choice d", "select d", "select option d", "choose d", "choose option d",
      "mark d", "mark option d", "answer d", "answer is d", "ans d", "option 4", "opt 4", "choice 4",
      "select 4", "select option 4", "fourth", "fourth option", "vikalp d", "vikalp 4", "विकल्प डी", "चौथा", "डी", "चार", "चौथा विकल्प", "ऑप्शन डी", "ऑप्शन 4"
    ];

    const matchOptToken = (t: string) => {
      if (/^[a-d1-4]$/.test(t)) {
        return transcript === t || words.includes(t);
      }
      return transcript === t || wholeWordMatch(transcript, t);
    };

    const match = matchExamIntent(transcript, false);

    if (phoneticMatch?.action === 'SELECT_A' || routed.optionIndex === 0 || optATokens.some(matchOptToken) || match.type === 'SELECT_OPTION_A') {
      lastCommandTimeRef.current = now;
      playVoiceFeedbackChime();
      handleSelectOption(0);
      speakText(isHi ? "विकल्प ए चुना गया" : "Option A selected", speechLang, () => {
        startListening(speechLang);
      });
      return;
    }

    if (phoneticMatch?.action === 'SELECT_B' || routed.optionIndex === 1 || optBTokens.some(matchOptToken) || match.type === 'SELECT_OPTION_B') {
      lastCommandTimeRef.current = now;
      playVoiceFeedbackChime();
      handleSelectOption(1);
      speakText(isHi ? "विकल्प बी चुना गया" : "Option B selected", speechLang, () => {
        startListening(speechLang);
      });
      return;
    }

    if (phoneticMatch?.action === 'SELECT_C' || routed.optionIndex === 2 || optCTokens.some(matchOptToken) || match.type === 'SELECT_OPTION_C') {
      lastCommandTimeRef.current = now;
      playVoiceFeedbackChime();
      handleSelectOption(2);
      speakText(isHi ? "विकल्प सी चुना गया" : "Option C selected", speechLang, () => {
        startListening(speechLang);
      });
      return;
    }

    if (phoneticMatch?.action === 'SELECT_D' || routed.optionIndex === 3 || optDTokens.some(matchOptToken) || match.type === 'SELECT_OPTION_D') {
      lastCommandTimeRef.current = now;
      playVoiceFeedbackChime();
      handleSelectOption(3);
      speakText(isHi ? "विकल्प डी चुना गया" : "Option D selected", speechLang, () => {
        startListening(speechLang);
      });
      return;
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
    isSupported: engineIsSupported,
  } = useVoiceEngine({
    lang: isHindi ? 'hi-IN' : 'en-US',
    autoStart: true,
    onTranscript: handleCapturedSpeech,
  });

  // Explicit user-gesture mic unlock handler
  const handleManualMicActivation = useCallback(async () => {
    if (!engineIsSupported) {
      setIsActive(false);
      isActiveRef.current = false;
      setStatus('Unsupported');
      setVoiceStatus('Speech recognition is not supported in this browser.');
      setErrorMessage('Microphone access needed. Please click to allow voice control.');
      return;
    }
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
  }, [engineIsSupported]);

  const unlockAudio = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const questionEl = document.getElementById('active-question-display') || document.getElementById('active-question-card');
      if (questionEl) {
        questionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    await handleManualMicActivation();
    readCurrentQuestion();
  }, [handleManualMicActivation, readCurrentQuestion]);

  // Register exam context with central command router
  useEffect(() => {
    registerVoiceContext('exam', handleCapturedSpeech);
    return () => unregisterVoiceContext('exam');
  }, [handleCapturedSpeech]);

  // Support globally dispatched AI Voice Commands (NEXT, PREVIOUS, FLAG, REPEAT, STOP)
  useEffect(() => {
    const handleVoiceCommandEvent = (e: Event) => {
      const event = e as CustomEvent;
      if (event.detail?.intent !== 'CONTROL') return;
      const target = event.detail?.target;
      const now = Date.now();

      if (target === 'NEXT') {
        if (now - lastCommandTimeRef.current >= 600) {
          lastCommandTimeRef.current = now;
          playVoiceFeedbackChime();
          handleNextQuestion();
        }
      } else if (target === 'PREVIOUS') {
        if (now - lastCommandTimeRef.current >= 600) {
          lastCommandTimeRef.current = now;
          playVoiceFeedbackChime();
          handlePrevQuestion();
        }
      } else if (target === 'FLAG') {
        if (now - lastCommandTimeRef.current >= 600) {
          lastCommandTimeRef.current = now;
          playVoiceFeedbackChime();
          handleToggleFlag();
        }
      } else if (target === 'REPEAT') {
        if (now - lastCommandTimeRef.current >= 600) {
          lastCommandTimeRef.current = now;
          playVoiceFeedbackChime();
          readCurrentQuestion();
        }
      } else if (target === 'STOP') {
        stopSpeaking();
      }
    };

    window.addEventListener('ai_voice_command', handleVoiceCommandEvent);
    return () => window.removeEventListener('ai_voice_command', handleVoiceCommandEvent);
  }, [handleNextQuestion, handlePrevQuestion, handleToggleFlag, readCurrentQuestion]);

  // Auto-read question 1 on initial load (Voice mode only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isKeyboardMode) return;
    if (hasInitializedMountRef.current) return;
    if (!currentQuestion) return;

    hasInitializedMountRef.current = true;
    setIsActive(true);
    isActiveRef.current = true;
    userManuallyMutedRef.current = false;

    void requestMicAccess();

    const timer = setTimeout(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      readQuestion(state.currentQuestionIndex);
    }, 400);

    return () => clearTimeout(timer);
  }, [currentQuestion, readQuestion, state.currentQuestionIndex]);

  useEffect(() => {
    if (isKeyboardMode) return;
    if (!hasInitializedMountRef.current) return;
    if (userManuallyMutedRef.current || !isActive) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

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
      stopSpeaking();
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
    isActive: isActive && engineIsSupported,
    status: !engineIsSupported ? 'Unsupported' : engineIsSpeaking ? 'Speaking' : (engineIsListening ? 'Listening' : status),
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
