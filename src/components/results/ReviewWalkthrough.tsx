"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QuestionMap, SscCglMockQuestions } from '@/lib/examData';
import { startListening, stopListening, subscribe } from '@/lib/voice/useVoiceEngine';
import { isMaleVoice, isFemaleVoice } from '@/lib/accessibility/voice-companion';
import { getAvailableVoices } from '@/lib/voice/speech-synthesis';

function getMaleWalkthroughVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  let voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    voices = getAvailableVoices();
  }
  if (!voices || voices.length === 0) return null;

  // 1. Explicitly preferred male English voices
  const maleKeywords = ['david', 'george', 'mark', 'guy', 'christopher', 'ravi', 'hemant', 'male'];
  for (const kw of maleKeywords) {
    const match = voices.find((v) => {
      const name = v.name.toLowerCase();
      return name.includes(kw) && !name.includes('female') && !name.includes('woman') && !name.includes('zira');
    });
    if (match) return match;
  }

  // 2. Any voice classified as male by voice-companion
  const classifiedMale = voices.find((v) => isMaleVoice(v));
  if (classifiedMale) return classifiedMale;

  // 3. Fallback: Any voice that is strictly NOT female
  const nonFemale = voices.find((v) => !isFemaleVoice(v) && v.lang.startsWith('en'));
  if (nonFemale) return nonFemale;

  return null;
}

interface ReviewWalkthroughProps {
  results?: { questions?: any[] };
  onClose: () => void;
}

export default function ReviewWalkthrough({ results, onClose }: ReviewWalkthroughProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speechTrigger, setSpeechTrigger] = useState(0);
  const [lastHeardCommand, setLastHeardCommand] = useState<string | null>(null);
  const lastSpokenRef = useRef({ index: -1, trigger: 0 });
  const lastCommandTimeRef = useRef<number>(0);
  const COMMAND_COOLDOWN_MS = 600;

  // Ensure questionText is present on questions for speech
  if (results?.questions) {
    for (const q of results.questions) {
      if (!q.questionText && q.text) {
        q.questionText = q.text;
      }
    }
  }

  // 1. Authoritative Question Resolution with fallback
  const rawQuestions = results?.questions && results.questions.length > 0 
    ? results.questions 
    : SscCglMockQuestions;

  const totalQuestions = rawQuestions.length;
  const currentQ = rawQuestions[currentIndex] || {};
  const qId = currentQ.questionId || currentQ.id || '';
  const masterQ = (QuestionMap as any)[qId] || {};

  // Clean Question Text
  const questionText = currentQ.questionText || currentQ.text || masterQ.text || `Question ${currentIndex + 1}`;

  // Options Mapping
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

  // In-Depth Explanation
  const explanation = currentQ.explanation || masterQ.explanation || (
    isCorrect 
      ? `Correct! Your chosen response matches the verified answer key (${correctDisplay}).` 
      : `The official correct response is ${correctDisplay}. Review foundational subject principles to reinforce this topic.`
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. The Anti-Loop Lock: Only proceed if the index or the repeat trigger actually changed
    if (lastSpokenRef.current.index === currentIndex && lastSpokenRef.current.trigger === speechTrigger) {
      return;
    }
    
    // 2. Lock it in
    lastSpokenRef.current = { index: currentIndex, trigger: speechTrigger };

    const q = rawQuestions[currentIndex];
    if (!q) return;

    // 3. Kill any currently playing audio instantly & pause mic so it cannot hear itself
    window.speechSynthesis.cancel();
    stopListening();

    // 4. Speak exactly once with a strictly male voice
    const text = `Question ${currentIndex + 1}. ${q.questionText || q.text || `Question ${currentIndex + 1}`}. You answered ${userDisplay}. ${isCorrect ? "Correct!" : `Incorrect. The correct answer is ${correctDisplay}.`} Explanation: ${explanation}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';

    const maleVoice = getMaleWalkthroughVoice();
    if (maleVoice) {
      utterance.voice = maleVoice;
    }

    // Microphone opens ONLY after companion finishes speaking
    utterance.onend = () => {
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          startListening('en-IN');
        }, 300);
      }
    };

    utterance.onerror = () => {
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          startListening('en-IN');
        }, 300);
      }
    };

    window.speechSynthesis.speak(utterance);

    // 5. Cleanup on unmount
    return () => {
      window.speechSynthesis.cancel();
      stopListening();
    };
  }, [currentIndex, rawQuestions, speechTrigger, userDisplay, isCorrect, correctDisplay, explanation]);

  // 2. Navigation Actions with Cooldown Guard
  const handleStop = useCallback(() => {
    const now = Date.now();
    lastCommandTimeRef.current = now;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    stopListening();
    onClose();
  }, [onClose]);

  const handleNext = useCallback(() => {
    const now = Date.now();
    if (now - lastCommandTimeRef.current < COMMAND_COOLDOWN_MS) {
      console.log('⏳ [ReviewWalkthrough] Ignoring duplicate NEXT (cooldown active)');
      return;
    }
    lastCommandTimeRef.current = now;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    setCurrentIndex((prev) => Math.min(prev + 1, totalQuestions - 1));
  }, [totalQuestions]);

  const handlePrevious = useCallback(() => {
    const now = Date.now();
    if (now - lastCommandTimeRef.current < COMMAND_COOLDOWN_MS) {
      console.log('⏳ [ReviewWalkthrough] Ignoring duplicate PREVIOUS (cooldown active)');
      return;
    }
    lastCommandTimeRef.current = now;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleRepeat = useCallback(() => {
    const now = Date.now();
    if (now - lastCommandTimeRef.current < COMMAND_COOLDOWN_MS) {
      return;
    }
    lastCommandTimeRef.current = now;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    setSpeechTrigger((prev) => prev + 1);
  }, []);

  // 4. Voice Command Interpreter (Direct Mic Subscriber)
  const processVoiceCommand = useCallback((transcript: string) => {
    if (!transcript) return;

    const lower = transcript.toLowerCase().trim();
    console.log('[ReviewWalkthrough Direct Mic]:', lower);

    const now = Date.now();
    if (now - lastCommandTimeRef.current < COMMAND_COOLDOWN_MS) {
      return;
    }

    if (
      lower.includes('next') || 
      lower.includes('forward') || 
      lower.includes('agla') || 
      lower.includes('aage') ||
      lower.includes('अगला')
    ) {
      setLastHeardCommand('Next');
      handleNext();
    } else if (
      lower.includes('previous') || 
      lower.includes('back') || 
      lower.includes('prev') || 
      lower.includes('pichhla') || 
      lower.includes('pichla') ||
      lower.includes('peeche') ||
      lower.includes('पिछला')
    ) {
      setLastHeardCommand('Previous');
      handlePrevious();
    } else if (
      lower.includes('repeat') || 
      lower.includes('again') || 
      lower.includes('once more') || 
      lower.includes('dohrao') ||
      lower.includes('fir se') ||
      lower.includes('phir se') ||
      lower.includes('दोबारा')
    ) {
      setLastHeardCommand('Repeat');
      handleRepeat();
    } else if (
      lower.includes('stop') || 
      lower.includes('exit') || 
      lower.includes('close') || 
      lower.includes('quit') || 
      lower.includes('cancel') || 
      lower.includes('khatam') || 
      lower.includes('ruko') ||
      lower.includes('रुक')
    ) {
      setLastHeardCommand('Stop');
      handleStop();
    }
  }, [handleNext, handlePrevious, handleRepeat, handleStop]);

  // 5. UNIFIED EVENT LISTENER: Executes state changes safely from global voice engine
  useEffect(() => {
    const handleVoiceCommand = (e: any) => {
      const { target } = e.detail || {};
      console.log('🔥 [ReviewWalkthrough Event Listener] Command received:', target);

      if (target === 'NEXT') {
        setLastHeardCommand('Next');
        handleNext();
      } else if (target === 'PREVIOUS') {
        setLastHeardCommand('Previous');
        handlePrevious();
      } else if (target === 'REPEAT') {
        setLastHeardCommand('Repeat');
        handleRepeat();
      } else if (target === 'STOP') {
        setLastHeardCommand('Stop');
        handleStop();
      }
    };

    window.addEventListener('ai_voice_command', handleVoiceCommand);
    return () => window.removeEventListener('ai_voice_command', handleVoiceCommand);
  }, [handleNext, handlePrevious, handleRepeat, handleStop]);

  // 6. Start Voice Engine Listener
  useEffect(() => {
    const unsub = subscribe((text: string) => {
      processVoiceCommand(text);
    });

    return () => {
      unsub();
      stopListening();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }
    };
  }, [processVoiceCommand]);

  // 7. Keyboard Shortcuts: Alt+N (Next), Alt+P (Prev), Alt+R (Repeat), Esc (Stop)
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
          
          {/* Dynamic Microphone Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            <span>🎤 Microphone Open — Say &quot;Next&quot;, &quot;Previous&quot;, &quot;Repeat&quot;, or &quot;Stop&quot;</span>
          </div>

          {/* Last Heard Feedback */}
          {lastHeardCommand && (
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <span>🎙️ Command: &ldquo;{lastHeardCommand}&rdquo;</span>
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
