"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * EXAMSARTHI — Centralized Global Audio & Voice Engine
 * 
 * Guarantees:
 * 1. STRICT SINGLETON SpeechRecognition: Exactly ONE active recognition instance
 *    across the entire application lifecycle, preventing mic collisions and abort errors.
 * 2. Speech Synthesis Safety: Prevents GC audio drops and pauses listening while speaking.
 * 3. Clean Fallback & Language Recovery: Gracefully falls back from hi-IN to en-US.
 * 4. User-Gesture Warmup: Reusable mic permission check that releases test stream immediately.
 */

// Module-level Singleton State
let globalRecognition: any = null;
let isListeningGlobal = false;
let isSpeakingGlobal = false;
let globalTranscript = '';
let globalLastError: string | null = null;
let currentUtteranceGlobal: SpeechSynthesisUtterance | null = null;
let activeLang = 'en-US';

// Listeners and subscribers
const transcriptSubscribers = new Set<(t: string) => void>();
const stateSubscribers = new Set<() => void>();

function notifyState(): void {
  stateSubscribers.forEach((callback) => {
    try {
      callback();
    } catch (e) {
      console.warn('[VoiceEngine] Error in state subscriber callback:', e);
    }
  });
}

/**
 * Clean up / destroy any existing SpeechRecognition listener.
 * Guarantees no lingering or duplicate audio capture sessions.
 */
export function stopListening(): void {
  if (globalRecognition) {
    try {
      globalRecognition.onend = null;
      globalRecognition.onerror = null;
      globalRecognition.onresult = null;
      globalRecognition.onaudiostart = null;
      globalRecognition.onspeechstart = null;
      globalRecognition.onspeechend = null;
      globalRecognition.onnomatch = null;
      globalRecognition.abort();
    } catch (e) {
      // Ignore benign abort errors
    }
    globalRecognition = null;
  }
  isListeningGlobal = false;
  notifyState();
}

/**
 * Explicit Permission & Hardware Warmup.
 * Requests mic permission, immediately releases stream tracks to free hardware.
 */
export async function requestMicAccess(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop()); // release test stream

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('examAudioUnlocked', 'true');
        (window as any).__examsarthi_mic_granted = true;
      } catch (e) {}
    }

    globalLastError = null;
    notifyState();
    return true;
  } catch (err: any) {
    console.warn('[VoiceEngine] Microphone access denied or unavailable:', err);
    globalLastError = err?.name || err?.message || 'Microphone access denied';
    notifyState();
    return false;
  }
}

/**
 * Speech Synthesis Safety Wrapper.
 * - Stops listening while speaking to avoid mic collision/abort.
 * - Anchors utterance to window scope to avoid Chromium garbage collection bug.
 * - Executes onComplete callback strictly upon speech completion or error.
 */
export function speakText(text: string, lang = 'en-US', onComplete?: () => void): void {
  if (typeof window === 'undefined') {
    if (onComplete) onComplete();
    return;
  }

  // Stop listening while speaking to avoid mic collision/abort
  stopListening();

  if (!('speechSynthesis' in window)) {
    if (onComplete) onComplete();
    return;
  }

  isSpeakingGlobal = true;
  notifyState();

  try {
    window.speechSynthesis.cancel();
  } catch (e) {}

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1.0;

  const handleFinish = () => {
    isSpeakingGlobal = false;
    currentUtteranceGlobal = null;
    (window as any).__currentUtterance = null;
    notifyState();
    if (onComplete) {
      onComplete();
    }
  };

  utterance.onend = handleFinish;
  utterance.onerror = (e) => {
    console.warn('[VoiceEngine] Utterance finished or errored:', e);
    handleFinish();
  };

  currentUtteranceGlobal = utterance;
  (window as any).__currentUtterance = utterance; // prevent GC bug

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('[VoiceEngine] speechSynthesis.speak failed:', e);
    handleFinish();
  }
}

/**
 * Start Listening with Singleton SpeechRecognition.
 * Destroys any prior listener to guarantee conflict-free capture.
 */
export function startListening(lang = 'en-US', onTranscript?: (text: string) => void): void {
  if (typeof window === 'undefined') return;

  // Never capture while text-to-speech talkback is active
  if (isSpeakingGlobal) {
    console.log('[VoiceEngine] Speech synthesis is active. Delaying listening start.');
    return;
  }

  // Ensure there is ONLY ONE active instance across the entire lifecycle
  stopListening();

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    globalLastError = 'SpeechRecognition is not supported in this browser';
    notifyState();
    return;
  }

  activeLang = lang;
  if (onTranscript) {
    transcriptSubscribers.add(onTranscript);
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Discrete cycles prevent Chromium audio buffer lock
    recognition.interimResults = false;
    recognition.lang = lang;

    recognition.onaudiostart = () => console.log('[VoiceEngine] Audio capture started (mic is hot)');
    recognition.onsoundstart = () => console.log('[VoiceEngine] Sound detected in room');
    recognition.onspeechstart = () => console.log('[VoiceEngine] Speech identified');
    recognition.onspeechend = () => console.log('[VoiceEngine] Speech segment ended');
    recognition.onnomatch = () => console.log('[VoiceEngine] Audio heard but no word matched');

    recognition.onerror = (e: any) => {
      // Benign events: aborted (from normal restart/stop) or no-speech (silence in room)
      if (e.error === 'aborted' || e.error === 'no-speech') {
        return;
      }

      // Fallback: If regional voice pack fails on hi-IN, fallback to en-US
      if (e.error === 'language-not-supported' && recognition.lang !== 'en-US') {
        console.warn('[VoiceEngine] Falling back to en-US speech recognition');
        recognition.lang = 'en-US';
        setTimeout(() => {
          if (isListeningGlobal && !isSpeakingGlobal && globalRecognition === recognition) {
            try {
              recognition.start();
            } catch (err) {}
          }
        }, 150);
        return;
      }

      console.warn('[VoiceEngine Error]', e.error, e.message);
      globalLastError = e.error;
      notifyState();
    };

    recognition.onresult = (e: any) => {
      const raw = e?.results?.[0]?.[0]?.transcript || '';
      console.log('[VoiceEngine Result Captured]:', raw);
      if (raw) {
        globalTranscript = raw;
        notifyState();
        transcriptSubscribers.forEach((sub) => {
          try {
            sub(raw);
          } catch (err) {
            console.warn('[VoiceEngine] Error in transcript subscriber:', err);
          }
        });
      }
    };

    recognition.onend = () => {
      // Re-cycle recognition cleanly if listening is still intended and we are not speaking
      setTimeout(() => {
        if (isListeningGlobal && !isSpeakingGlobal && globalRecognition === recognition) {
          try {
            recognition.start();
          } catch (e) {
            // Safe ignore if busy
          }
        }
      }, 150);
    };

    globalRecognition = recognition;
    isListeningGlobal = true;
    globalLastError = null;
    notifyState();

    recognition.start();
  } catch (err: any) {
    console.warn('[VoiceEngine] Recognition start error:', err);
    globalLastError = err?.message || 'Failed to start microphone';
    isListeningGlobal = false;
    notifyState();
  }
}

export interface UseVoiceEngineOptions {
  onTranscript?: (transcript: string) => void;
  lang?: string;
  autoStart?: boolean;
}

/**
 * Centralized Global Voice Hook
 */
export function useVoiceEngine(options?: UseVoiceEngineOptions) {
  const [isListening, setIsListening] = useState<boolean>(isListeningGlobal);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(isSpeakingGlobal);
  const [transcript, setTranscript] = useState<string>(globalTranscript);
  const [lastError, setLastError] = useState<string | null>(globalLastError);
  const [hasMicPermission, setHasMicPermission] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        Boolean((window as any).__examsarthi_mic_granted) ||
        sessionStorage.getItem('examAudioUnlocked') === 'true'
      );
    }
    return false;
  });

  const onTranscriptRef = useRef(options?.onTranscript);
  useEffect(() => {
    onTranscriptRef.current = options?.onTranscript;
  }, [options?.onTranscript]);

  const langRef = useRef(options?.lang || 'en-US');
  useEffect(() => {
    langRef.current = options?.lang || 'en-US';
  }, [options?.lang]);

  useEffect(() => {
    const handleStateUpdate = () => {
      setIsListening(isListeningGlobal);
      setIsSpeaking(isSpeakingGlobal);
      setTranscript(globalTranscript);
      setLastError(globalLastError);

      if (typeof window !== 'undefined') {
        const granted =
          Boolean((window as any).__examsarthi_mic_granted) ||
          sessionStorage.getItem('examAudioUnlocked') === 'true';
        if (granted) setHasMicPermission(true);
      }
    };

    stateSubscribers.add(handleStateUpdate);

    const handleTranscriptReceived = (t: string) => {
      setTranscript(t);
      if (onTranscriptRef.current) {
        onTranscriptRef.current(t);
      }
    };
    transcriptSubscribers.add(handleTranscriptReceived);

    // Initial check
    handleStateUpdate();

    if (options?.autoStart && !isListeningGlobal && !isSpeakingGlobal) {
      startListening(langRef.current, handleTranscriptReceived);
    }

    return () => {
      stateSubscribers.delete(handleStateUpdate);
      transcriptSubscribers.delete(handleTranscriptReceived);
    };
  }, [options?.autoStart]);

  const handleStart = useCallback((customLang?: string) => {
    startListening(customLang || langRef.current);
  }, []);

  const handleStop = useCallback(() => {
    stopListening();
  }, []);

  const handleRequestMic = useCallback(async () => {
    const granted = await requestMicAccess();
    if (granted) {
      setHasMicPermission(true);
    }
    return granted;
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    lastError,
    hasMicPermission,
    startListening: handleStart,
    stopListening: handleStop,
    speakText,
    requestMicAccess: handleRequestMic,
  };
}
