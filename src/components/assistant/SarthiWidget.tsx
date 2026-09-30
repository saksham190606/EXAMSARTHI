"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeech } from '@/hooks/useSpeech';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { executeSarthiAction, SarthiActionContext, SarthiAction } from '@/lib/assistant/sarthiActions';
import { isExamRoute, isExamActiveNow } from '@/lib/assistant/sarthiExamLock';
import {
  isVoiceRecognitionSupported,
  startListening as startVoiceRecognition,
  stopListening as stopVoiceRecognition,
} from '@/lib/voice/useVoiceEngine';

type SarthiState = 'IDLE' | 'ACTIVATED' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'CLOSING_SPEAKING' | 'FOLLOW_UP' | 'UNSUPPORTED' | 'CLOSED';
type TranscriptHandler = (transcript: string) => void;

interface Message {
  id: string;
  sender: 'user' | 'sarthi';
  text: string;
}

export function SarthiWidget() {
  const [state, setState] = useState<SarthiState>('CLOSED');
  const [typedInput, setTypedInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const { speak, stop, status: speechStatus } = useSpeech();
  const accessibilityStore = useAccessibilityStore();
  const { language, accessibilityMode } = accessibilityStore;
  const router = useRouter();
  const pathname = usePathname();

  const isHindi = language === 'hi';
  const transcriptHandlerRef = useRef<TranscriptHandler>(() => {});
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isExamActive = isExamRoute(pathname) || isExamActiveNow();
  const isExamActiveRef = useRef(isExamActive);
  const stateRef = useRef(state);
  const pathnameRef = useRef(pathname);

  const { user, loading: authLoading } = useAuth();
  const userRef = useRef(user);
  const authLoadingRef = useRef(authLoading);
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isExamActiveRef.current = isExamActive;
    stateRef.current = state;
    pathnameRef.current = pathname;
    userRef.current = user;
    authLoadingRef.current = authLoading;
  }, [isExamActive, pathname, state, user, authLoading]);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopListening = useCallback(() => {
    stopVoiceRecognition();
  }, []);

  const startListening = useCallback(() => {
    if (isExamActiveRef.current || isExamActiveNow()) {
      return;
    }
    if (!isVoiceRecognitionSupported()) {
      stopVoiceRecognition();
      setState('UNSUPPORTED');
      stateRef.current = 'UNSUPPORTED';
      return;
    }
    startVoiceRecognition(
      isHindi ? 'hi-IN' : 'en-IN',
      (transcript) => transcriptHandlerRef.current(transcript),
      { resolveAlternatives: false, explicitSession: true }
    );
  }, [isHindi]);

  const handleStateChange = useCallback((newState: SarthiState) => {
    if (isExamActiveRef.current || isExamActiveNow()) {
      newState = 'CLOSED';
    }

    setState(newState);
    stateRef.current = newState;

    if (newState === 'CLOSED') {
      stop();
      stopListening();
    } else if (newState === 'ACTIVATED') {
      stopListening();
      const greeting = isHindi 
        ? 'नमस्ते, मैं सारथी हूँ। मैं आपकी कैसे मदद कर सकती हूँ? आप बोल सकते हैं या नीचे लिख सकते हैं।' 
        : "Hi, I'm Sarthi. How can I help you? You can speak or type your question below.";
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now()), sender: 'sarthi', text: greeting }
      ]);
      speak(greeting, 'Voice feedback');
      // Focus the text input for keyboard users
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else if (newState === 'FOLLOW_UP') {
      stopListening();
      const prompt = isHindi ? 'क्या आपको कोई और मदद चाहिए?' : 'Do you need any other help?';
      speak(prompt, 'Voice feedback');
    } else if (newState === 'LISTENING') {
      startListening();
    }
  }, [isHindi, speak, stop, startListening, stopListening]);

  // Core processor for user inputs (voice, typed, or button clicks)
  const processInput = useCallback(async (rawText: string) => {
    if (isExamActiveRef.current || isExamActiveNow()) return;
    const text = rawText.trim();
    if (!text) return;

    stopListening();
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), sender: 'user', text }
    ]);
    const lower = text.toLowerCase();

    // Check for exit commands
    if (/^(no|thank you|thanks sarthi|close sarthi|नहीं|धन्यवाद|शुक्रिया|that's all|no, that's all|close|बंद करो)$/i.test(lower)) {
      handleStateChange('CLOSING_SPEAKING');
      const bye = isHindi ? 'धन्यवाद, सारथी बंद हो रहा है।' : 'Thank you, closing Sarthi.';
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now()), sender: 'sarthi', text: bye }
      ]);
      speak(bye, 'Voice feedback');
      return;
    }

    // Fast deterministic command checks
    if (
      lower === 'exam' ||
      lower === 'exams' ||
      lower === 'open exam' ||
      lower === 'go to exam' ||
      lower === 'exam kholo' ||
      lower === 'exam shuru karo' ||
      lower === 'exam shuru' ||
      lower === 'परीक्षा' ||
      lower === 'मॉक टेस्ट'
    ) {
      handleStateChange('SPEAKING');
      const resp = isHindi ? 'परीक्षा केंद्र खोला जा रहा है।' : 'Opening the exams hub.';
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now()), sender: 'sarthi', text: resp }
      ]);
      router.push('/exam');
      speak(resp, 'Voice feedback');
      return;
    }
    if (
      lower === 'dashboard' ||
      lower === 'home' ||
      lower === 'go to dashboard' ||
      lower === 'open dashboard' ||
      lower === 'डैशबोर्ड' ||
      lower === 'होम'
    ) {
      handleStateChange('SPEAKING');
      const resp = isHindi ? 'डैशबोर्ड खोला जा रहा है।' : 'Navigating to your dashboard.';
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now()), sender: 'sarthi', text: resp }
      ]);
      router.push('/dashboard');
      speak(resp, 'Voice feedback');
      return;
    }
    if (
      lower === 'practice' ||
      lower === 'go to practice' ||
      lower === 'open practice' ||
      lower === 'अभ्यास' ||
      lower === 'प्रैक्टिस'
    ) {
      handleStateChange('SPEAKING');
      const resp = isHindi ? 'अभ्यास अनुभाग खोला जा रहा है।' : 'Navigating to the practice section.';
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now()), sender: 'sarthi', text: resp }
      ]);
      router.push('/practice');
      speak(resp, 'Voice feedback');
      return;
    }
    if (
      lower === 'results' ||
      lower === 'result' ||
      lower === 'go to results' ||
      lower === 'open results' ||
      lower === 'परिणाम' ||
      lower === 'रिजल्ट'
    ) {
      handleStateChange('SPEAKING');
      const resp = isHindi ? 'परिणाम अनुभाग खोला जा रहा है।' : 'Navigating to results section.';
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now()), sender: 'sarthi', text: resp }
      ]);
      router.push('/results');
      speak(resp, 'Voice feedback');
      return;
    }
    if (
      lower === 'contrast' ||
      lower === 'high contrast' ||
      lower === 'toggle contrast' ||
      lower === 'कंट्रास्ट'
    ) {
      const cur = accessibilityStore.contrast;
      const next = cur === 'high' ? 'default' : 'high';
      accessibilityStore.setContrast(next);
      handleStateChange('SPEAKING');
      const resp = next === 'high' 
        ? (isHindi ? 'उच्च कंट्रास्ट मोड सक्षम किया गया।' : 'High contrast mode enabled.')
        : (isHindi ? 'सामान्य कंट्रास्ट मोड सक्षम किया गया।' : 'Standard contrast mode enabled.');
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now()), sender: 'sarthi', text: resp }
      ]);
      speak(resp, 'Voice feedback');
      return;
    }

    // Call Sarthi AI API endpoint
    let currentUser = userRef.current;
    if (authLoadingRef.current) {
      const start = Date.now();
      while (authLoadingRef.current && Date.now() - start < 1500) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      currentUser = userRef.current;
    }

    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

    handleStateChange('THINKING');
    try {
      const res = await fetch('/api/ai/sarthi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          language: isHindi ? 'hi' : 'en',
          currentUrl: pathnameRef.current || window.location.pathname || '/',
        }),
        signal: controller.signal,
      });

      if (isExamActiveRef.current || isExamActiveNow()) return;
      if (!res.ok) {
        handleStateChange('SPEAKING');
        const errText = isHindi ? 'मुझे कुछ समझने में दिक्कत हुई।' : 'I had trouble understanding that.';
        setMessages((prev) => [
          ...prev,
          { id: String(Date.now()), sender: 'sarthi', text: errText }
        ]);
        speak(errText, 'Voice feedback');
        return;
      }

      const actionData = (await res.json()) as SarthiAction;
      if (isExamActiveRef.current || isExamActiveNow()) return;

      const ctx: SarthiActionContext = { router, accessibilityStore, isHindi };
      const spokenResponse = await executeSarthiAction(actionData, ctx);
      if (isExamActiveRef.current || isExamActiveNow()) return;

      const replyText = spokenResponse || (isHindi ? 'कार्रवाई पूरी हुई।' : 'Action completed.');
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now()), sender: 'sarthi', text: replyText }
      ]);
      handleStateChange(actionData.action === 'CLOSE_SARTHI' ? 'CLOSING_SPEAKING' : 'SPEAKING');
      speak(replyText, 'Voice feedback');
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('[Sarthi] Failed to process request:', error);
      if (isExamActiveRef.current || isExamActiveNow()) return;
      handleStateChange('SPEAKING');
      const failText = isHindi ? 'सर्वर से संपर्क नहीं हो पाया।' : 'Could not reach the server.';
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now()), sender: 'sarthi', text: failText }
      ]);
      speak(failText, 'Voice feedback');
    } finally {
      if (activeAbortControllerRef.current === controller) {
        activeAbortControllerRef.current = null;
      }
    }
  }, [accessibilityStore, handleStateChange, isHindi, router, speak, stopListening]);

  // Wire transcript listener
  useEffect(() => {
    transcriptHandlerRef.current = (transcript) => {
      processInput(transcript);
    };
  }, [processInput]);

  // Speech status transitions
  useEffect(() => {
    if (isExamActiveRef.current || isExamActiveNow()) return;

    if (state === 'ACTIVATED' && speechStatus === 'Speech stopped') {
      handleStateChange('IDLE');
    } else if (state === 'SPEAKING' && speechStatus === 'Speech stopped') {
      handleStateChange('IDLE');
    } else if (state === 'CLOSING_SPEAKING' && speechStatus === 'Speech stopped') {
      handleStateChange('CLOSED');
    }
  }, [speechStatus, state, handleStateChange]);

  // Handle user submit from text input form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim()) return;
    const input = typedInput;
    setTypedInput('');
    processInput(input);
  };

  // Keyboard shortcut listener: Alt+S to toggle, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isExamRoute(pathnameRef.current) || isExamActiveNow()) return;

      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setState((prev) => (prev === 'CLOSED' ? 'ACTIVATED' : 'CLOSED'));
      } else if (e.key === 'Escape') {
        setState((prev) => (prev !== 'CLOSED' ? 'CLOSED' : prev));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Custom event listener to open Sarthi (e.g. from pressing 'S' navigation key)
  useEffect(() => {
    const handleOpenEvent = () => {
      if (isExamActiveRef.current || isExamActiveNow() || isExamRoute(pathnameRef.current)) return;
      handleStateChange('ACTIVATED');
    };
    window.addEventListener('examsarthi-open-sarthi', handleOpenEvent);
    return () => window.removeEventListener('examsarthi-open-sarthi', handleOpenEvent);
  }, [handleStateChange]);

  // STRICT REQUIREMENT: Only render Sarthi for keyboard navigation users!
  if (accessibilityMode !== 'keyboard') {
    return null;
  }

  // Also hide during active exams
  if (isExamActive) {
    return null;
  }

  if (state === 'CLOSED') {
    return (
      <button
        onClick={() => handleStateChange('ACTIVATED')}
        className="fixed bottom-6 right-6 bg-slate-900 hover:bg-slate-800 text-white rounded-full p-4 shadow-2xl z-50 border-2 border-amber-400 focus-visible:outline focus-visible:outline-[#ffed00] focus-visible:outline-4 focus-visible:outline-offset-2 flex items-center gap-2 group transition-all transform hover:scale-105"
        aria-label={isHindi ? "सारथी एआई सहायक खोलें। शॉर्टकट: S या Alt और S दबाएं।" : "Open Sarthi AI Assistant. Shortcut: Press S or Alt plus S."}
        title={isHindi ? "सारथी एआई सहायक (S या Alt+S)" : "Sarthi AI Assistant (Press S or Alt+S)"}
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 group-hover:rotate-12 transition-transform">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" x2="12" y1="19" y2="22"></line>
        </svg>
        <span className="text-xs font-bold text-amber-300 pr-1">Sarthi AI <span className="bg-amber-400/20 px-1.5 py-0.5 rounded text-[10px] text-amber-200">Alt+S</span></span>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Sarthi AI Accessibility Assistant"
      aria-modal="true"
      className="fixed bottom-6 right-6 w-84 sm:w-96 max-w-[calc(100vw-2rem)] bg-slate-900/95 dark:bg-slate-950/95 text-white rounded-2xl shadow-2xl p-4 flex flex-col gap-3 z-50 border-2 border-amber-400/80 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              state === 'LISTENING'
                ? 'bg-emerald-400 animate-pulse'
                : state === 'THINKING'
                ? 'bg-amber-400 animate-bounce'
                : state === 'SPEAKING'
                ? 'bg-blue-400 animate-pulse'
                : 'bg-amber-500'
            }`}
            aria-hidden="true"
          />
          <h3 className="text-base font-bold text-amber-300 flex items-center gap-1.5">
            Sarthi AI Co-Pilot
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200">
              {state === 'LISTENING' ? 'Listening' : state === 'THINKING' ? 'Thinking' : state === 'SPEAKING' ? 'Speaking' : 'Ready'}
            </span>
          </h3>
        </div>
        <button
          onClick={() => handleStateChange('CLOSED')}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 focus-visible:outline focus-visible:outline-amber-400 focus-visible:outline-2"
          aria-label={isHindi ? "सारथी बंद करें (Esc)" : "Close Sarthi (Esc)"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" x2="6" y1="6" y2="18"></line>
            <line x1="6" x2="18" y1="6" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Messages / Conversation Area */}
      <div 
        className="max-h-56 overflow-y-auto space-y-2.5 pr-1 text-sm scrollbar-thin scrollbar-thumb-slate-700"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {messages.length === 0 ? (
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 text-xs leading-relaxed">
            {isHindi
              ? "नमस्ते! मैं सारथी हूँ। आप 'परीक्षा', 'डैशबोर्ड', या 'प्रैक्टिस' टाइप कर सकते हैं, या वॉइस माइक दबाकर बोल सकते हैं।"
              : "Hello! I am Sarthi. Ask me anything, type commands like 'exam', 'dashboard', or click the mic to speak."}
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-amber-500/20 text-amber-100 border border-amber-400/30 ml-6 text-right'
                  : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 mr-4'
              }`}
            >
              <div className="font-semibold text-[10px] text-slate-400 mb-0.5">
                {m.sender === 'user' ? (isHindi ? 'आप:' : 'You:') : 'Sarthi AI:'}
              </div>
              {m.text}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Chips for Fast Keyboard Navigation */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => processInput('exam')}
          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-200 text-slate-300 text-[11px] font-medium border border-slate-700 focus-visible:outline focus-visible:outline-amber-400"
        >
          {isHindi ? 'परीक्षा (E)' : 'Exam Hub (E)'}
        </button>
        <button
          type="button"
          onClick={() => processInput('dashboard')}
          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-200 text-slate-300 text-[11px] font-medium border border-slate-700 focus-visible:outline focus-visible:outline-amber-400"
        >
          {isHindi ? 'डैशबोर्ड (D)' : 'Dashboard (D)'}
        </button>
        <button
          type="button"
          onClick={() => processInput('practice')}
          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-200 text-slate-300 text-[11px] font-medium border border-slate-700 focus-visible:outline focus-visible:outline-amber-400"
        >
          {isHindi ? 'अभ्यास (P)' : 'Practice (P)'}
        </button>
        <button
          type="button"
          onClick={() => processInput('contrast')}
          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-200 text-slate-300 text-[11px] font-medium border border-slate-700 focus-visible:outline focus-visible:outline-amber-400"
        >
          {isHindi ? 'कंट्रास्ट (C)' : 'Contrast (C)'}
        </button>
      </div>

      {/* Input Form with Text Box & Mic */}
      <form onSubmit={handleFormSubmit} className="flex items-center gap-1.5 pt-1">
        <input
          ref={inputRef}
          type="text"
          value={typedInput}
          onChange={(e) => setTypedInput(e.target.value)}
          placeholder={isHindi ? "सवाल लिखें या कमांड दें..." : "Type question or command..."}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          aria-label={isHindi ? "सारथी के लिए सवाल लिखें" : "Type a question for Sarthi"}
        />
        
        {/* Voice Toggle Button */}
        <button
          type="button"
          onClick={() => {
            if (state === 'LISTENING') {
              handleStateChange('IDLE');
            } else {
              handleStateChange('LISTENING');
            }
          }}
          className={`p-2 rounded-xl border transition-all ${
            state === 'LISTENING'
              ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
              : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border-slate-700'
          } focus-visible:outline focus-visible:outline-amber-400`}
          aria-label={state === 'LISTENING' ? (isHindi ? "माइक बंद करें" : "Stop listening") : (isHindi ? "बोलकर पूछें" : "Speak to Sarthi")}
          title={state === 'LISTENING' ? "Listening (click to stop)" : "Speak to Sarthi"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" x2="12" y1="19" y2="22"></line>
          </svg>
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!typedInput.trim()}
          className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-900 font-bold transition-all focus-visible:outline focus-visible:outline-white"
          aria-label={isHindi ? "भेजें" : "Send query"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>

      {/* Footer shortcut hints */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 px-1 border-t border-slate-800/80 pt-1.5">
        <span>Esc: {isHindi ? "बंद करें" : "Close"}</span>
        <span>Alt+S: {isHindi ? "टॉगल" : "Toggle"}</span>
        <span>Enter: {isHindi ? "भेजें" : "Submit"}</span>
      </div>
    </div>
  );
}
