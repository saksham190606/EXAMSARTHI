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

export function SarthiWidget() {
  const [state, setState] = useState<SarthiState>('CLOSED');
  const { speak, stop, status: speechStatus } = useSpeech();
  const accessibilityStore = useAccessibilityStore();
  const { language } = accessibilityStore;
  const router = useRouter();
  const pathname = usePathname();

  const isHindi = language === 'hi';
  const transcriptHandlerRef = useRef<TranscriptHandler>(() => {});

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
      { resolveAlternatives: false }
    );
  }, [isHindi]);

  const handleStateChange = useCallback((newState: SarthiState) => {
    if (isExamActiveRef.current || isExamActiveNow()) {
      // Force closed if exam is active
      newState = 'CLOSED';
    }

    setState(newState);
    stateRef.current = newState;

    if (newState === 'CLOSED') {
      stop();
      stopListening();
    } else if (newState === 'ACTIVATED') {
      stopListening(); // Make sure mic is off before speaking
      const greeting = isHindi ? 'नमस्ते, मैं सारथी हूँ। मैं आपकी कैसे मदद कर सकती हूँ?' : "Hi, I'm Sarthi. How can I help you?";
      speak(greeting, 'Voice feedback');
    } else if (newState === 'FOLLOW_UP') {
      stopListening();
      const prompt = isHindi ? 'क्या आपको कोई और मदद चाहिए?' : 'Do you need any other help?';
      speak(prompt, 'Voice feedback');
    } else if (newState === 'LISTENING') {
      startListening();
    }
  }, [isHindi, speak, stop, startListening, stopListening]);

  // Effect to handle SpeechStatus changes
  useEffect(() => {
    if (isExamActiveRef.current || isExamActiveNow()) return;

    if (state === 'ACTIVATED' && speechStatus === 'Speech stopped') {
      handleStateChange('LISTENING');
    } else if (state === 'SPEAKING' && speechStatus === 'Speech stopped') {
      handleStateChange('FOLLOW_UP');
    } else if (state === 'CLOSING_SPEAKING' && speechStatus === 'Speech stopped') {
      handleStateChange('CLOSED');
    } else if (state === 'FOLLOW_UP' && speechStatus === 'Speech stopped') {
      handleStateChange('LISTENING');
    }
  }, [speechStatus, state, handleStateChange]);

  // Handle sign-out or session loss: abort any pending AI requests and return to safe state
  useEffect(() => {
    if (!user) {
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
        activeAbortControllerRef.current = null;
      }
      if (stateRef.current === 'THINKING') {
        handleStateChange('IDLE');
      }
    }
  }, [user, handleStateChange]);

  // Keep Sarthi on the shared recognition engine used by the rest of the app.
  useEffect(() => {
    transcriptHandlerRef.current = async (rawTranscript) => {
      if (isExamActiveRef.current || isExamActiveNow() || stateRef.current !== 'LISTENING') return;
      stopListening();
      const transcript = rawTranscript.toLowerCase().trim();

      if (/^(no|thank you|thanks sarthi|close sarthi|नहीं|धन्यवाद|शुक्रिया|that's all|no, that's all)$/i.test(transcript)) {
        handleStateChange('CLOSING_SPEAKING');
        speak(isHindi ? 'धन्यवाद, सारथी बंद हो रहा है।' : 'Thank you, closing Sarthi.', 'Voice feedback');
        return;
      }

      // Check local deterministic commands first (zero-network, offline-resilient)
      if (
        transcript === 'exam' ||
        transcript === 'exams' ||
        transcript === 'open exam' ||
        transcript === 'go to exam' ||
        transcript === 'exam kholo' ||
        transcript === 'exam shuru karo' ||
        transcript === 'exam shuru' ||
        transcript === 'परीक्षा' ||
        transcript === 'मॉक टेस्ट'
      ) {
        handleStateChange('SPEAKING');
        const resp = isHindi ? 'परीक्षा केंद्र खोला जा रहा है।' : 'Opening the exams hub.';
        router.push('/exam');
        speak(resp, 'Voice feedback');
        return;
      }
      if (
        transcript === 'dashboard' ||
        transcript === 'home' ||
        transcript === 'go to dashboard' ||
        transcript === 'open dashboard' ||
        transcript === 'डैशबोर्ड' ||
        transcript === 'होम'
      ) {
        handleStateChange('SPEAKING');
        const resp = isHindi ? 'डैशबोर्ड खोला जा रहा है।' : 'Navigating to your dashboard.';
        router.push('/dashboard');
        speak(resp, 'Voice feedback');
        return;
      }
      if (
        transcript === 'practice' ||
        transcript === 'go to practice' ||
        transcript === 'open practice' ||
        transcript === 'अभ्यास' ||
        transcript === 'प्रैक्टिस'
      ) {
        handleStateChange('SPEAKING');
        const resp = isHindi ? 'अभ्यास अनुभाग खोला जा रहा है।' : 'Navigating to the practice section.';
        router.push('/practice');
        speak(resp, 'Voice feedback');
        return;
      }
      if (
        transcript === 'settings' ||
        transcript === 'go to settings' ||
        transcript === 'open settings' ||
        transcript === 'सेटिंग्स' ||
        transcript === 'सेटिंग'
      ) {
        handleStateChange('SPEAKING');
        const resp = isHindi ? 'सेटिंग्स खोली जा रही हैं।' : 'Navigating to settings.';
        router.push('/settings');
        speak(resp, 'Voice feedback');
        return;
      }

      // Session verification before making authenticated /api/ai/sarthi call
      let currentUser = userRef.current;
      if (authLoadingRef.current) {
        // Await session initialization to prevent race conditions (up to 1500ms)
        const start = Date.now();
        while (authLoadingRef.current && Date.now() - start < 1500) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        currentUser = userRef.current;
      }

      if (!currentUser) {
        handleStateChange('SPEAKING');
        const unauthMsg = isHindi
          ? 'सारथी के एआई सहायक का उपयोग करने के लिए कृपया लॉगिन करें। आप "परीक्षा" या "अभ्यास" बोलकर नेविगेट कर सकते हैं।'
          : 'Please log in to use Sarthi AI features. You can still use voice navigation like "exam" or "practice".';
        speak(unauthMsg, 'Voice feedback');
        return;
      }

      const controller = new AbortController();
      activeAbortControllerRef.current = controller;

      handleStateChange('THINKING');
      try {
        const res = await fetch('/api/ai/sarthi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript,
            language: isHindi ? 'hi' : 'en',
            currentUrl: pathnameRef.current || window.location.pathname || '/',
          }),
          signal: controller.signal,
        });

        if (isExamActiveRef.current || isExamActiveNow()) return;
        if (!res.ok) {
          handleStateChange('SPEAKING');
          speak(isHindi ? 'मुझे कुछ समझने में दिक्कत हुई।' : 'I had trouble understanding that.', 'Voice feedback');
          return;
        }

        const actionData = (await res.json()) as SarthiAction;
        if (isExamActiveRef.current || isExamActiveNow()) return;

        const ctx: SarthiActionContext = { router, accessibilityStore, isHindi };
        const spokenResponse = await executeSarthiAction(actionData, ctx);
        if (isExamActiveRef.current || isExamActiveNow()) return;

        handleStateChange(actionData.action === 'CLOSE_SARTHI' ? 'CLOSING_SPEAKING' : 'SPEAKING');
        speak(spokenResponse || (isHindi ? 'कार्रवाई पूरी हुई।' : 'Action completed.'), 'Voice feedback');
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('[Sarthi] Failed to process the request:', error);
        if (isExamActiveRef.current || isExamActiveNow()) return;
        handleStateChange('SPEAKING');
        speak(isHindi ? 'सर्वर से संपर्क नहीं हो पाया।' : 'Could not reach the server.', 'Voice feedback');
      } finally {
        if (activeAbortControllerRef.current === controller) {
          activeAbortControllerRef.current = null;
        }
      }
    };
  }, [accessibilityStore, handleStateChange, isHindi, router, speak, stopListening]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  // Alt + S shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 's') {
        if (isExamRoute(pathnameRef.current) || isExamActiveNow()) {
          e.preventDefault();
          return;
        }

        e.preventDefault();
        setState((prev) => {
          if (prev === 'CLOSED' || prev === 'IDLE') {
            return 'ACTIVATED';
          }
          return 'CLOSED';
        });
      } else if (e.key === 'Escape') {
        setState((prev) => prev !== 'CLOSED' ? 'CLOSED' : prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Open Sarthi AI on voice wake word ("Hi Sarthi"), strictly blocked on Exams tab
  useEffect(() => {
    const handleVoiceWakeWord = (e: any) => {
      // Strictly prevent opening on the Exams tab or during an active exam
      if (isExamActiveRef.current || isExamActiveNow() || isExamRoute(pathnameRef.current)) {
        console.log("🚫 [SarthiWidget] Voice wake word rejected: Sarthi AI is disabled on Exams tab");
        return;
      }

      const { target, intent } = e.detail || {};
      const isWakeMatch = (intent === 'SARTHI' && target === 'OPEN') || e.type === 'examsarthi-open-sarthi';
      if (isWakeMatch) {
        console.log("🔥 [SarthiWidget] 'Hi Sarthi' wake word activated: Opening Sarthi AI Assistant");
        handleStateChange('ACTIVATED');
      }
    };

    window.addEventListener('ai_voice_command', handleVoiceWakeWord);
    window.addEventListener('examsarthi-open-sarthi', handleVoiceWakeWord);

    return () => {
      window.removeEventListener('ai_voice_command', handleVoiceWakeWord);
      window.removeEventListener('examsarthi-open-sarthi', handleVoiceWakeWord);
    };
  }, [handleStateChange]);

  // Side effects for state transitions when triggered via keyboard
  useEffect(() => {
    if (isExamActive || isExamActiveNow()) {
      if (state !== 'CLOSED') {
        handleStateChange('CLOSED');
      } else {
        stop();
        stopListening();
      }
      return;
    }

    if (state === 'ACTIVATED') {
      handleStateChange('ACTIVATED');
    } else if (state === 'CLOSED') {
      handleStateChange('CLOSED');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isExamActive]);

  if (isExamActive) {
    return null;
  }

  if (state === 'CLOSED') {
    return (
      <button
        onClick={() => handleStateChange('ACTIVATED')}
        className="fixed bottom-6 right-6 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-full p-4 shadow-xl z-50 border border-slate-700 focus-visible:outline focus-visible:outline-[#ffed00] focus-visible:outline-2 focus-visible:outline-offset-2 flex items-center justify-center group"
        aria-label={isHindi ? "सारथी पहुंच सहायक। खोलने के लिए Alt और S दबाएं।" : "Sarthi accessibility assistant. Press Alt plus S to open."}
        aria-expanded="false"
      >
        <span className="sr-only">{isHindi ? "सारथी पहुंच सहायक। खोलने के लिए Alt और S दबाएं।" : "Sarthi accessibility assistant. Press Alt plus S to open."}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#ffed00] group-hover:scale-110 transition-transform">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" x2="12" y1="19" y2="22"></line>
        </svg>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Sarthi AI Assistant"
      aria-live="polite"
      className="fixed bottom-6 right-6 w-72 bg-slate-900 text-white rounded-lg shadow-xl p-4 flex flex-col gap-3 z-50 border border-slate-700"
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${state === 'LISTENING' ? 'bg-[#ffed00] animate-pulse' : 'bg-slate-500'}`}
            aria-hidden="true"
          />
          Sarthi AI
        </h3>
        <button
          onClick={() => handleStateChange('CLOSED')}
          className="text-slate-400 hover:text-white focus-visible:outline focus-visible:outline-[#ffed00] focus-visible:outline-2 rounded p-1"
          aria-label="Close Sarthi"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" x2="6" y1="6" y2="18"></line>
            <line x1="6" x2="18" y1="6" y2="18"></line>
          </svg>
        </button>
      </div>
      <div className="text-sm text-slate-300">
        {state === 'ACTIVATED' && (isHindi ? 'नमस्ते...' : "Hi, I'm Sarthi...")}
        {state === 'LISTENING' && (isHindi ? 'सुन रहा हूँ...' : 'Listening...')}
        {state === 'UNSUPPORTED' && (isHindi ? 'इस ब्राउज़र में वॉइस पहचान समर्थित नहीं है।' : 'Voice recognition is not supported in this browser.')}
        {state === 'THINKING' && (isHindi ? 'सोच रहा हूँ...' : 'Thinking...')}
        {(state === 'SPEAKING' || state === 'CLOSING_SPEAKING') && (isHindi ? 'बोल रहा हूँ...' : 'Speaking...')}
        {state === 'FOLLOW_UP' && (isHindi ? 'क्या आपको कोई और मदद चाहिए?' : 'Do you need any other help?')}
      </div>
    </div>
  );
}
