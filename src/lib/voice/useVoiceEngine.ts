"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { getHighFidelityVoice, sanitizeExamTextForSpeech } from './speech-synthesis';
import { injectExamGrammar, extractTranscriptsFromEvent, resolveMultiAlternativeCommand } from './speech-recognition';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';

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

// Global Speaking Guard (Strict Audio Mutex Ref)
// Synchronous mutable ref pattern ensures zero React closure staleness inside event listeners
export const isSystemSpeakingRef: { current: boolean } = { current: false };
export const recognitionRef: { current: any } = {
  get current() {
    return globalRecognition;
  },
  set current(val: any) {
    globalRecognition = val;
  },
};

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
 * Fuzzy Matcher Utility: Before checking commands, ALWAYS clean the transcript.
 */
export function cleanVoiceTranscript(transcript: string): string {
  if (!transcript) return '';
  return transcript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
}

/**
 * Speech Synthesis Safety Wrapper with Strict Half-Duplex (Walkie-Talkie) Audio Mutex.
 * 1. Hard-stops the microphone and detaches restart loops (onend = null).
 * 2. Anchors utterance to window scope to avoid Chromium garbage collection bug.
 * 3. Restarts microphone only after speaking completes + 400ms room echo buffer.
 */
export const speakText = (
  text: string,
  arg2?: string | (() => void),
  arg3?: () => void
): void => {
  if (typeof window === 'undefined') {
    if (typeof arg2 === 'function') arg2();
    if (typeof arg3 === 'function') arg3();
    return;
  }

  let lang = 'en-US';
  let onComplete: (() => void) | undefined;
  if (typeof arg2 === 'function') {
    onComplete = arg2;
  } else if (typeof arg2 === 'string') {
    lang = arg2;
    onComplete = arg3;
  } else if (typeof arg3 === 'function') {
    onComplete = arg3;
  }

  // 1. ENGAGE GLOBAL LOCK
  (window as any).isSystemSpeaking = true;
  isSystemSpeakingRef.current = true;
  isSpeakingGlobal = true;
  notifyState();

  // 2. HARD KILL MIC
  if ((window as any).globalRecognitionInstance) {
    try {
      (window as any).globalRecognitionInstance.onend = null;
      (window as any).globalRecognitionInstance.abort();
    } catch (e) {}
  }
  if (recognitionRef.current) {
    try {
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
    } catch (e) {}
    recognitionRef.current = null;
  }
  isListeningGlobal = false;
  notifyState();

  window.speechSynthesis.cancel();
  const store = useAccessibilityStore.getState();
  const sanitizedText = sanitizeExamTextForSpeech(text, lang);
  const utterance = new SpeechSynthesisUtterance(sanitizedText);
  utterance.lang = lang;
  utterance.rate = Math.min(1.5, Math.max(0.7, store.speechRate || 1.0));
  const voice = getHighFidelityVoice(lang, store.selectedVoiceURI);
  if (voice) {
    utterance.voice = voice;
  }

  const handleRecognitionEnd = () => {
    if ((window as any).isSystemSpeaking === true) return;
    if (isListeningGlobal && !isSpeakingGlobal) {
      setTimeout(() => {
        if ((window as any).isSystemSpeaking === true) return;
        try {
          (window as any).globalRecognitionInstance?.start();
        } catch (e) {}
      }, 150);
    }
  };

  utterance.onend = () => {
    // 3. WAIT 500MS FOR ROOM ECHO TO FADE, THEN UNLOCK
    setTimeout(() => {
      (window as any).isSystemSpeaking = false;
      isSystemSpeakingRef.current = false;
      isSpeakingGlobal = false;
      currentUtteranceGlobal = null;
      (window as any).__currentUtterance = null;
      notifyState();

      if ((window as any).globalRecognitionInstance) {
        // Reattach auto-restart and boot mic
        (window as any).globalRecognitionInstance.onend = handleRecognitionEnd;
        try {
          (window as any).globalRecognitionInstance.start();
        } catch (e) {}
      }

      if (onComplete) onComplete();
    }, 500);
  };

  utterance.onerror = utterance.onend;
  currentUtteranceGlobal = utterance;
  (window as any).__currentUtterance = utterance; // GC fix

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    (window as any).isSystemSpeaking = false;
    isSystemSpeakingRef.current = false;
    isSpeakingGlobal = false;
    notifyState();
    if (onComplete) onComplete();
  }
};

export const speakQuestion = (
  text: string,
  arg2?: string | (() => void),
  arg3?: () => void
): void => {
  speakText(text, arg2, arg3);
};

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
    // Store the instance globally so speakText can reach it
    (window as any).globalRecognitionInstance = recognition;
    recognition.continuous = false; // Discrete cycles prevent Chromium audio buffer lock
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;
    recognition.lang = lang;

    // Inject JSGF grammar
    injectExamGrammar(recognition);

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
      // IF SYSTEM IS SPEAKING, DROP EVERYTHING IMMEDIATELY
      if ((window as any).isSystemSpeaking === true) {
        console.warn("BLOCKED ECHO: System is currently speaking.");
        return;
      }
      if (isSystemSpeakingRef.current || isSpeakingGlobal) {
        console.warn("BLOCKED ECHO: System is currently speaking.");
        return;
      }

      const candidates = extractTranscriptsFromEvent(e);
      let raw = candidates[0] || e?.results?.[0]?.[0]?.transcript || '';

      // Check multi-alternatives and phonetic error correction
      if (candidates.length > 0) {
        const resolved = resolveMultiAlternativeCommand(candidates);
        if (resolved) {
          raw = resolved.matchedToken;
          console.log('[VoiceEngine Phonetic Resolved]:', resolved.action, 'from', candidates);
        }
      }

      const transcript = (raw || '').toLowerCase().trim();
      console.log('[VoiceEngine Result Captured]:', transcript);
      if (transcript) {
        globalTranscript = transcript;
        notifyState();
        transcriptSubscribers.forEach((sub) => {
          try {
            sub(transcript);
          } catch (err) {
            console.warn('[VoiceEngine] Error in transcript subscriber:', err);
          }
        });
      }
    };

    const handleRecognitionEnd = () => {
      if ((window as any).isSystemSpeaking === true) return;
      if (!isSystemSpeakingRef.current && isListeningGlobal && !isSpeakingGlobal) {
        setTimeout(() => {
          if ((window as any).isSystemSpeaking === true) return;
          if (!isSystemSpeakingRef.current && isListeningGlobal && !isSpeakingGlobal && globalRecognition === recognition) {
            try {
              recognition.start();
            } catch (e) {
              // Safe ignore if busy
            }
          }
        }, 150);
      }
    };

    recognition.onend = handleRecognitionEnd;

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
    isSystemSpeakingRef,
    recognitionRef,
    startListening: handleStart,
    stopListening: handleStop,
    speakText,
    speakQuestion,
    cleanVoiceTranscript,
    requestMicAccess: handleRequestMic,
  };
}
