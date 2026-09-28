"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeech } from '@/hooks/useSpeech';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';

import { useRouter, usePathname } from 'next/navigation';
import { executeSarthiAction, SarthiActionContext, SarthiAction } from '@/lib/assistant/sarthiActions';
import { isExamRoute, isExamActiveNow } from '@/lib/assistant/sarthiExamLock';

type SarthiState = 'IDLE' | 'ACTIVATED' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'CLOSING_SPEAKING' | 'FOLLOW_UP' | 'CLOSED';

export function SarthiWidget() {
  const [state, setState] = useState<SarthiState>('CLOSED');
  const { speak, stop, status: speechStatus } = useSpeech();
  const accessibilityStore = useAccessibilityStore();
  const { language } = accessibilityStore;
  const router = useRouter();
  const pathname = usePathname();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isHindi = language === 'hi';

  const isExamActive = isExamRoute(pathname) || isExamActiveNow();
  const isExamActiveRef = useRef(isExamActive);
  isExamActiveRef.current = isExamActive;

  const stateRef = useRef(state);
  stateRef.current = state;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  if (process.env.NODE_ENV === 'development') {
    console.log('[Sarthi Exam Lock]', {
      pathname,
      isExamActive,
      sarthiRendering: !isExamActive,
    });
  }

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        console.log('[Sarthi] CALLING recognition.abort()');
        recognitionRef.current.abort();
        console.log('[Sarthi] recognition aborted manually');
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (isExamActiveRef.current || isExamActiveNow()) {
      console.warn('[Sarthi] startListening blocked: Exam active');
      return;
    }
    console.log('[Sarthi] starting recognition');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = isHindi ? 'hi-IN' : 'en-IN';
        console.log('[Sarthi] CALLING recognition.start()');
        recognitionRef.current.start();
        console.log('[Sarthi] recognition started');
      } catch (e) {
        console.error('[Sarthi] recognition start error:', e);
        speak(isHindi ? 'मैं माइक्रोफ़ोन तक नहीं पहुँच पा रही हूँ। कृपया अनुमति जांचें।' : 'I couldn\'t access the microphone. Please check your microphone permission and try again.', 'Voice feedback');
      }
    } else {
      console.error('[Sarthi] recognitionRef.current is null');
      speak(isHindi ? 'भाषण पहचान समर्थित नहीं है।' : 'Speech recognition is not supported.', 'Voice feedback');
    }
  }, [isHindi, speak]);

  const handleStateChange = useCallback((newState: SarthiState) => {
    if (isExamActiveRef.current || isExamActiveNow()) {
      // Force closed if exam is active
      newState = 'CLOSED';
    }

    console.log(`[Sarthi] state change: ${stateRef.current} -> ${newState}`);
    setState(newState);
    stateRef.current = newState;

    if (newState === 'CLOSED') {
      stop();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      stopListening();
    } else if (newState === 'ACTIVATED') {
      console.log('[Sarthi] activated');
      stopListening(); // Make sure mic is off before speaking
      const greeting = isHindi ? 'नमस्ते, मैं सारथी हूँ। मैं आपकी कैसे मदद कर सकती हूँ?' : "Hi, I'm Sarthi. How can I help you?";
      console.log('[Sarthi] speaking greeting');
      speak(greeting, 'Voice feedback');
    } else if (newState === 'FOLLOW_UP') {
      stopListening();
      const prompt = isHindi ? 'क्या आपको कोई और मदद चाहिए?' : 'Do you need any other help?';
      console.log('[Sarthi] speaking follow-up');
      speak(prompt, 'Voice feedback');
    } else if (newState === 'LISTENING') {
      console.log('[Sarthi] transitioning to LISTENING');
      startListening();
    }
  }, [isHindi, speak, stop, startListening, stopListening]);

  // Effect to handle SpeechStatus changes
  useEffect(() => {
    if (isExamActiveRef.current || isExamActiveNow()) return;

    if (state === 'ACTIVATED' && speechStatus === 'Speech stopped') {
      console.log('[Sarthi] greeting finished');
      handleStateChange('LISTENING');
    } else if (state === 'SPEAKING' && speechStatus === 'Speech stopped') {
      console.log('[Sarthi] response finished');
      handleStateChange('FOLLOW_UP');
    } else if (state === 'CLOSING_SPEAKING' && speechStatus === 'Speech stopped') {
      console.log('[Sarthi] closing speech finished');
      handleStateChange('CLOSED');
    } else if (state === 'FOLLOW_UP' && speechStatus === 'Speech stopped') {
      console.log('[Sarthi] follow-up finished');
      handleStateChange('LISTENING');
    }
  }, [speechStatus, state, handleStateChange]);

  // Setup Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        if (!recognitionRef.current) {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognitionRef.current = recognition;
        }

        const recognition = recognitionRef.current;

        recognition.onstart = () => {
          if (isExamActiveRef.current || isExamActiveNow()) {
            try { recognition.abort(); } catch (e) {}
            return;
          }
          console.log('[Sarthi] recognition onstart');
        };

        recognition.onspeechstart = () => {
          if (isExamActiveRef.current || isExamActiveNow()) {
            try { recognition.abort(); } catch (e) {}
            return;
          }
          console.log('[Sarthi] recognition onspeechstart');
        };

        recognition.onresult = async (event: any) => {
          if (typeof window !== 'undefined' && (window as any).isSystemSpeaking === true) {
            console.warn("BLOCKED ECHO: System is currently speaking.");
            return;
          }
          if (isExamActiveRef.current || isExamActiveNow()) return;

          const transcript = event.results[0][0].transcript.toLowerCase().trim();
          console.log('[Sarthi] speech result:', transcript);

          if (stateRef.current === 'LISTENING') {
            if (/^(no|thank you|thanks sarthi|close sarthi|नहीं|धन्यवाद|शुक्रिया|that's all|no, that's all)$/i.test(transcript)) {
              handleStateChange('CLOSING_SPEAKING');
              speak(isHindi ? 'धन्यवाद, सारथी बंद हो रहा है।' : 'Thank you, closing Sarthi.', 'Voice feedback');
            } else {
              handleStateChange('THINKING');
              try {
                const res = await fetch('/api/ai/sarthi', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    transcript,
                    language: isHindi ? 'hi' : 'en',
                    currentUrl: pathnameRef.current || window.location.pathname || '/',
                  })
                });

                if (isExamActiveRef.current || isExamActiveNow()) return;

                if (res.ok) {
                  const actionData = (await res.json()) as SarthiAction;

                  if (isExamActiveRef.current || isExamActiveNow()) return;

                  const ctx: SarthiActionContext = {
                    router,
                    accessibilityStore,
                    isHindi
                  };

                  const spokenResponse = await executeSarthiAction(actionData, ctx);

                  if (isExamActiveRef.current || isExamActiveNow()) return;

                  if (actionData.action === 'CLOSE_SARTHI') {
                    handleStateChange('CLOSING_SPEAKING');
                  } else {
                    handleStateChange('SPEAKING');
                  }
                  speak(spokenResponse || (isHindi ? 'कार्रवाई पूरी हुई।' : 'Action completed.'), 'Voice feedback');
                } else {
                  handleStateChange('SPEAKING');
                  speak(isHindi ? 'मुझे कुछ समझने में दिक्कत हुई।' : 'I had trouble understanding that.', 'Voice feedback');
                }
              } catch (e) {
                console.error(e);
                if (isExamActiveRef.current || isExamActiveNow()) return;
                handleStateChange('SPEAKING');
                speak(isHindi ? 'सर्वर से संपर्क नहीं हो पाया।' : 'Could not reach the server.', 'Voice feedback');
              }
            }
          }
        };

        recognition.onerror = (event: any) => {
          if (isExamActiveRef.current || isExamActiveNow()) return;
          if (event.error === 'no-speech' || event.error === 'aborted') {
            console.log(`[Sarthi] expected recognition event: ${event.error}`);
            return;
          }
          console.error('[Sarthi] recognition error:', event.error);
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            speak(isHindi ? 'मैं माइक्रोफ़ोन तक नहीं पहुँच पा रही हूँ। कृपया अनुमति जांचें।' : 'I couldn\'t access the microphone. Please check your microphone permission and try again.', 'Voice feedback');
            handleStateChange('CLOSED');
          }
        };

        recognition.onend = () => {
          if (isExamActiveRef.current || isExamActiveNow()) {
            return;
          }
          console.log('[Sarthi] recognition ended');
          if (stateRef.current === 'LISTENING') {
            console.log('[Sarthi] Restarting recognition to keep listening');
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error('[Sarthi] Failed to restart recognition:', e);
            }
          }
        };
      }
    }

    return () => {
      // Do not stop listening on dependency change, only on unmount
    };
  }, [isHindi, handleStateChange, speak, router, accessibilityStore]);

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

  // Side effects for state transitions when triggered via keyboard
  useEffect(() => {
    if (isExamActive || isExamActiveNow()) {
      if (state !== 'CLOSED') {
        handleStateChange('CLOSED');
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

  // Force Sarthi to close immediately whenever navigating into an active exam
  useEffect(() => {
    if (isExamActive || isExamActiveNow()) {
      if (state !== 'CLOSED') {
        setState('CLOSED');
      }
      stop();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      stopListening();
    }
  }, [isExamActive, state, stop, stopListening]);

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
      aria-expanded="true"
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
        {state === 'THINKING' && (isHindi ? 'सोच रहा हूँ...' : 'Thinking...')}
        {(state === 'SPEAKING' || state === 'CLOSING_SPEAKING') && (isHindi ? 'बोल रहा हूँ...' : 'Speaking...')}
        {state === 'FOLLOW_UP' && (isHindi ? 'क्या आपको कोई और मदद चाहिए?' : 'Do you need any other help?')}
      </div>
    </div>
  );
}
