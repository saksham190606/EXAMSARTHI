"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QuestionMap, SscCglMockQuestions } from '@/lib/examData';
import { startListening, stopListening, subscribe } from '@/lib/voice/useVoiceEngine';

interface ReviewWalkthroughProps {
  results?: { questions?: any[] };
  onClose: () => void;
}

export default function ReviewWalkthrough({ results, onClose }: ReviewWalkthroughProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicListening, setIsMicListening] = useState(true);
  const [lastHeardCommand, setLastHeardCommand] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const lastActionTimestampRef = useRef<number>(0);

  // 1. Resolve Questions: Guaranteed non-empty array with authoritative master questions fallback
  const rawQuestions = results?.questions && results.questions.length > 0 
    ? results.questions 
    : SscCglMockQuestions;

  const totalQuestions = rawQuestions.length;
  const currentQ = rawQuestions[currentIndex] || {};
  const qId = currentQ.questionId || currentQ.id || '';
  const masterQ = (QuestionMap as any)[qId] || {};

  // Question Text
  const questionText = currentQ.questionText || currentQ.text || masterQ.text || `Question ${currentIndex + 1}`;

  // Options
  const options: Array<{ id: string; text: string }> = currentQ.options || masterQ.options || [];

  // User Answer Resolution
  let userDisplay = 'Not Answered';
  const rawUser = currentQ.userAnswer;
  if (rawUser !== undefined && rawUser !== null && rawUser !== '') {
    if (options.length > 0) {
      const match = options.find((o) => o.id === rawUser);
      if (match) {
        const letter = String.fromCharCode(65 + options.indexOf(match));
        userDisplay = `Option ${letter}: ${match.text}`;
      } else {
        userDisplay = String(rawUser);
      }
    } else {
      userDisplay = String(rawUser);
    }
  }

  // Correct Answer Resolution
  let correctDisplay = 'Verified standard answer';
  const rawCorrect = masterQ.correctAnswerId || masterQ.correctAnswerIds || masterQ.correctAnswer || currentQ.correctAnswer;
  if (rawCorrect !== undefined && rawCorrect !== null && rawCorrect !== '' && rawCorrect !== 'N/A') {
    if (options.length > 0 && typeof rawCorrect === 'string') {
      const match = options.find((o) => o.id === rawCorrect);
      if (match) {
        const letter = String.fromCharCode(65 + options.indexOf(match));
        correctDisplay = `Option ${letter}: ${match.text}`;
      } else {
        correctDisplay = String(rawCorrect);
      }
    } else if (Array.isArray(rawCorrect) && options.length > 0) {
      const matchedTexts = options
        .filter((o) => rawCorrect.includes(o.id))
        .map((o) => `Option ${String.fromCharCode(65 + options.indexOf(o))}: ${o.text}`);
      correctDisplay = matchedTexts.length > 0 ? matchedTexts.join(', ') : rawCorrect.join(', ');
    } else {
      correctDisplay = String(rawCorrect);
    }
  }

  // Correctness Evaluation
  const isCorrect = currentQ.isCorrect !== undefined
    ? Boolean(currentQ.isCorrect)
    : (userDisplay !== 'Not Answered' && (userDisplay === correctDisplay || rawUser === masterQ.correctAnswerId));

  // Explanation: Guaranteed to always be informative and non-empty
  const explanation = currentQ.explanation || masterQ.explanation || (
    isCorrect 
      ? `Correct! Your chosen response matches the verified answer key (${correctDisplay}).` 
      : `The official correct response is ${correctDisplay}. Review foundational subject principles to reinforce this topic.`
  );

  // 2. Navigation Actions with speech cancellation and timestamp debouncing
  const handleStop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    stopListening();
    onClose();
  }, [onClose]);

  const handleNext = useCallback(() => {
    const now = Date.now();
    if (now - lastActionTimestampRef.current < 500) return;
    lastActionTimestampRef.current = now;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    setCurrentIndex((prev) => Math.min(prev + 1, totalQuestions - 1));
  }, [totalQuestions]);

  const handlePrevious = useCallback(() => {
    const now = Date.now();
    if (now - lastActionTimestampRef.current < 500) return;
    lastActionTimestampRef.current = now;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // 3. Speech Synthesis: Reads Question, User Answer, Correct Answer, and Full Explanation
  const speakCurrentQuestion = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
    } catch (_) {}

    const cleanQ = questionText.replace(/[#*_`]/g, '');
    const cleanExp = explanation.replace(/[#*_`]/g, '');

    const speechText = `Question ${currentIndex + 1}. ${cleanQ}. You answered: ${userDisplay}. ${
      isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${correctDisplay}.`
    } Explanation: ${cleanExp}. Review complete for Question ${currentIndex + 1}. Say Next, Previous, Repeat, or Stop.`;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 1.0;
    utterance.lang = 'en-US';

    utterance.onstart = () => {
      if (isMountedRef.current) setIsSpeaking(true);
    };

    utterance.onend = () => {
      if (isMountedRef.current) {
        setIsSpeaking(false);
        // Ensure microphone is active for user response
        startListening('en-IN');
      }
    };

    utterance.onerror = () => {
      if (isMountedRef.current) {
        setIsSpeaking(false);
        startListening('en-IN');
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [currentIndex, questionText, userDisplay, isCorrect, correctDisplay, explanation]);

  const handleRepeat = useCallback(() => {
    speakCurrentQuestion();
  }, [speakCurrentQuestion]);

  // Auto-speak question on index change
  useEffect(() => {
    speakCurrentQuestion();
  }, [speakCurrentQuestion]);

  // 4. Voice Command Interpreter (Dispatches corresponding action on voice match)
  const processVoiceCommand = useCallback((transcript: string) => {
    if (!transcript) return;
    const lower = transcript.toLowerCase().trim();
    console.log('[ReviewWalkthrough Voice Command Detected]:', lower);

    if (lower.includes('next') || lower.includes('forward') || lower.includes('agla') || lower.includes('aage') || lower.includes('nest')) {
      setLastHeardCommand('Next');
      handleNext();
    } else if (lower.includes('previous') || lower.includes('back') || lower.includes('prev') || lower.includes('pichhla') || lower.includes('peeche')) {
      setLastHeardCommand('Previous');
      handlePrevious();
    } else if (lower.includes('repeat') || lower.includes('again') || lower.includes('once more') || lower.includes('dohrao') || lower.includes('fir se') || lower.includes('phir se')) {
      setLastHeardCommand('Repeat');
      handleRepeat();
    } else if (lower.includes('stop') || lower.includes('exit') || lower.includes('close') || lower.includes('quit') || lower.includes('cancel') || lower.includes('khatam') || lower.includes('ruko')) {
      setLastHeardCommand('Stop');
      handleStop();
    }
  }, [handleNext, handlePrevious, handleRepeat, handleStop]);

  // 5. Dedicated Continuous Web Speech Recognition Loop
  useEffect(() => {
    isMountedRef.current = true;
    if (typeof window === 'undefined') return;

    // Start global engine listening
    startListening('en-IN');

    // Layer A: Dedicated local SpeechRecognition instance for instant barge-in
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    let localRecognition: any = null;
    let isAborted = false;

    if (SpeechRecognition) {
      try {
        localRecognition = new SpeechRecognition();
        localRecognition.continuous = true;
        localRecognition.interimResults = false;
        localRecognition.lang = 'en-IN';

        localRecognition.onstart = () => {
          if (isMountedRef.current) setIsMicListening(true);
        };

        localRecognition.onresult = (event: any) => {
          const lastIdx = event.results.length - 1;
          const text = event.results[lastIdx]?.[0]?.transcript || '';
          if (text) processVoiceCommand(text);
        };

        localRecognition.onerror = (err: any) => {
          if (err.error !== 'no-speech' && err.error !== 'aborted') {
            console.warn('[ReviewWalkthrough Local Mic Error]:', err.error);
          }
        };

        localRecognition.onend = () => {
          if (!isAborted && isMountedRef.current) {
            setTimeout(() => {
              if (!isAborted && isMountedRef.current) {
                try { localRecognition.start(); } catch (_) {}
              }
            }, 300);
          }
        };

        localRecognition.start();
      } catch (err) {
        console.warn('[ReviewWalkthrough Local SpeechRecognition Unavailable]:', err);
      }
    }

    // Layer B: Global engine subscriber
    const unsubVoiceEngine = subscribe((text: string) => {
      processVoiceCommand(text);
    });

    // Layer C: Global CustomEvent listener
    const handleGlobalCommandEvent = (e: any) => {
      const { target } = e.detail || {};
      if (target === 'NEXT') handleNext();
      else if (target === 'PREVIOUS') handlePrevious();
      else if (target === 'REPEAT') handleRepeat();
      else if (target === 'STOP') handleStop();
    };
    window.addEventListener('ai_voice_command', handleGlobalCommandEvent);

    return () => {
      isMountedRef.current = false;
      isAborted = true;
      if (localRecognition) {
        try {
          localRecognition.onend = null;
          localRecognition.abort();
        } catch (_) {}
      }
      unsubVoiceEngine();
      window.removeEventListener('ai_voice_command', handleGlobalCommandEvent);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }
    };
  }, [processVoiceCommand, handleNext, handlePrevious, handleRepeat, handleStop]);

  // 6. Keyboard Shortcuts for accessibility: Alt+N (Next), Alt+P (Prev), Alt+R (Repeat), Esc (Stop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleStop();
      } else if ((e.altKey && (e.key === 'n' || e.key === 'N')) || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if ((e.altKey && (e.key === 'p' || e.key === 'P')) || e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        handleRepeat();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious, handleRepeat, handleStop]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#0a0a0a] text-white flex flex-col h-screen overflow-hidden select-none font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-walkthrough-heading"
    >
      {/* Top Banner: Voice Status & Controls */}
      <div className="bg-neutral-900/90 border-b border-neutral-800 px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-sm tracking-wide text-neutral-400">
            AI TUTOR WALKTHROUGH
          </span>
          <span className="text-neutral-600">•</span>
          
          {/* Microphone Live Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Mic Listening (Say: &quot;Next&quot;, &quot;Previous&quot;, &quot;Repeat&quot;, &quot;Stop&quot;)</span>
          </div>

          {/* Speech State Badge */}
          {isSpeaking && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ffed00]/10 text-[#ffed00] border border-[#ffed00]/30 animate-pulse">
              <span>🔊 Reading Question &amp; Explanation...</span>
            </div>
          )}

          {/* Last Heard Feedback */}
          {lastHeardCommand && (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <span>🎙️ Heard: &ldquo;{lastHeardCommand}&rdquo;</span>
            </div>
          )}
        </div>

        <button 
          id="walkthrough-btn-close-top"
          onClick={handleStop}
          className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-sm border border-neutral-700 transition-colors cursor-pointer flex items-center gap-1.5"
          title="Close Walkthrough (Esc)"
        >
          <span>✕ Close</span>
          <kbd className="text-[10px] bg-neutral-900 px-1.5 py-0.5 rounded text-neutral-400">Esc</kbd>
        </button>
      </div>

      {/* Main Question & Explanation Content Card */}
      <div className="flex-grow overflow-y-auto px-6 py-8 pb-32 max-w-4xl mx-auto w-full space-y-6">
        
        {/* Question Counter Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h2 id="review-walkthrough-heading" className="text-2xl font-extrabold text-[#ffed00]">
            Question {currentIndex + 1} <span className="text-sm font-normal text-neutral-400">of {totalQuestions}</span>
          </h2>
          <span className="text-xs px-2.5 py-1 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
            {currentQ.subject || masterQ.subject || 'General Assessment'}
          </span>
        </div>

        {/* Question Prompt */}
        <p className="text-xl sm:text-2xl font-medium leading-relaxed text-neutral-100">
          {questionText}
        </p>

        {/* Candidate & Correct Answers Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* User's Answer */}
          <div className={`p-4 rounded-xl border ${
            isCorrect 
              ? 'border-emerald-500/40 bg-emerald-950/20' 
              : 'border-red-500/40 bg-red-950/20'
          } space-y-1`}>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Your Answer:
            </span>
            <p className={`text-base font-bold flex items-center gap-2 ${
              isCorrect ? 'text-emerald-400' : 'text-red-400'
            }`}>
              <span>{isCorrect ? '✓' : '✗'}</span>
              <span>{userDisplay}</span>
            </p>
          </div>

          {/* Correct Answer */}
          <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Official Correct Answer:
            </span>
            <p className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <span>✓</span>
              <span>{correctDisplay}</span>
            </p>
          </div>
        </div>

        {/* Guaranteed In-Depth Explanation Panel */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2 shadow-lg">
          <div className="flex items-center gap-2 text-[#ffed00] font-bold text-base">
            <span>💡</span>
            <h3>Explanation &amp; Solution</h3>
          </div>
          <p className="text-neutral-300 text-base leading-relaxed whitespace-pre-line">
            {explanation}
          </p>
        </div>

      </div>

      {/* Fixed Bottom Action Bar with Physical & Voice Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800 p-4 flex justify-center items-center gap-3 sm:gap-4 z-20 shadow-2xl">
        
        {/* Previous Button */}
        <button 
          id="walkthrough-btn-prev"
          onClick={handlePrevious} 
          disabled={currentIndex === 0}
          className="px-5 sm:px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg border border-neutral-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <span>◀ Previous</span>
          <kbd className="hidden sm:inline text-[10px] bg-neutral-900 px-1.5 py-0.5 rounded text-neutral-400">Alt+P</kbd>
        </button>

        {/* Repeat Button */}
        <button 
          id="walkthrough-btn-repeat"
          onClick={handleRepeat} 
          className="px-5 sm:px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
        >
          <span>🔁 Repeat</span>
          <kbd className="hidden sm:inline text-[10px] bg-blue-800 px-1.5 py-0.5 rounded text-blue-200">Alt+R</kbd>
        </button>

        {/* Stop Button */}
        <button 
          id="walkthrough-btn-stop"
          onClick={handleStop} 
          className="px-5 sm:px-6 py-2.5 bg-red-900 hover:bg-red-800 text-white font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
        >
          <span>⏹ Stop</span>
          <kbd className="hidden sm:inline text-[10px] bg-red-950 px-1.5 py-0.5 rounded text-red-300">Esc</kbd>
        </button>

        {/* Next Button */}
        <button 
          id="walkthrough-btn-next"
          onClick={handleNext} 
          disabled={currentIndex >= totalQuestions - 1}
          className="px-5 sm:px-6 py-2.5 bg-[#ffed00] hover:bg-[#ffe100] disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
        >
          <span>Next ▶</span>
          <kbd className="hidden sm:inline text-[10px] bg-black/20 px-1.5 py-0.5 rounded text-black/70">Alt+N</kbd>
        </button>

      </div>
    </div>
  );
}
