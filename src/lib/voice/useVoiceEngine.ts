"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { getBestVoice, sanitizeExamTextForSpeech } from './speech-synthesis';
import { injectExamGrammar, extractTranscriptsFromEvent, resolveMultiAlternativeCommand } from './speech-recognition';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { wholeWordMatch, routeVoiceCommand } from './commandRouter';

export type VoicePriority = 'critical' | 'response' | 'content' | 'talkback';

const PRIORITY_RANK: Record<VoicePriority, number> = {
  critical: 4,
  response: 3,
  content: 2,
  talkback: 1,
};

let globalRecognition: any = null;
let isListeningGlobal = false;
let isSpeakingGlobal = false;
let globalTranscript = '';
let globalLastError: string | null = null;
let currentUtteranceGlobal: SpeechSynthesisUtterance | null = null;
let activeRecognitionHandler: ((text: string) => void) | null = null;
let resolveRecognitionAlternatives = true;
let activeLang = 'en-IN';
let currentSpeechPriority: VoicePriority | null = null;
let recognitionRetryTimer: ReturnType<typeof setTimeout> | null = null;
let recognitionRetryDelay = 200;
let speechGeneration = 0;
let speechKeepaliveTimer: ReturnType<typeof setInterval> | null = null;

export const isSystemSpeakingRef: { current: boolean } = { current: false };

const transcriptSubscribers = new Set<(text: string) => void>();
const stateSubscribers = new Set<() => void>();
const subscribeToSupportChanges = () => () => {};

function notifyState(): void {
  stateSubscribers.forEach((callback) => {
    try { callback(); } catch (e) { console.warn('[VoiceEngine] state subscriber error:', e); }
  });
}

function normalizeLanguage(lang?: string): string {
  const v = (lang || 'en-IN').toLowerCase();
  return v.startsWith('hi') ? 'hi-IN' : 'en-IN';
}

function scheduleRecognitionRestart(delayMs: number): void {
  if (recognitionRetryTimer) {
    clearTimeout(recognitionRetryTimer);
  }
  recognitionRetryTimer = setTimeout(() => {
    if (!isSpeakingGlobal && isListeningGlobal && globalRecognition && typeof globalRecognition.start === 'function') {
      try {
        globalRecognition.start();
      } catch (_) {}
    }
  }, delayMs);
}

function clearRetryTimer(): void {
  if (recognitionRetryTimer) {
    clearTimeout(recognitionRetryTimer);
    recognitionRetryTimer = null;
  }
  recognitionRetryDelay = 200;
}

export function subscribe(handler: (text: string) => void): () => void {
  transcriptSubscribers.add(handler);
  if (transcriptSubscribers.size > 3) {
    console.warn('[VoiceEngine] More than 3 transcript subscribers; ensure cleanup is used.');
  }
  return () => transcriptSubscribers.delete(handler);
}

export function isSpeaking(): boolean {
  return Boolean(isSpeakingGlobal || isSystemSpeakingRef.current || (typeof window !== 'undefined' && (window as any).isSystemSpeaking));
}

export function isListening(): boolean {
  return isListeningGlobal;
}

export function isVoiceRecognitionSupported(): boolean {
  return typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

function hasStoredMicPermission(): boolean {
  if (typeof window === 'undefined') return false;
  if ((window as any).__examsarthi_mic_granted) return true;
  try {
    return window.sessionStorage.getItem('examAudioUnlocked') === 'true';
  } catch {
    return false;
  }
}

export function useVoiceRecognitionSupport(): boolean {
  return useSyncExternalStore(
    subscribeToSupportChanges,
    isVoiceRecognitionSupported,
    () => false
  );
}

export function stopListening(clearTranscriptHandler = true): void {
  clearRetryTimer();
  if (clearTranscriptHandler) {
    activeRecognitionHandler = null;
    resolveRecognitionAlternatives = true;
  }
  if (globalRecognition) {
    try {
      globalRecognition.onend = null;
      globalRecognition.onerror = null;
      globalRecognition.onresult = null;
      globalRecognition.onnomatch = null;
      globalRecognition.abort();
    } catch (_) {}
    globalRecognition = null;
  }
  isListeningGlobal = false;
  notifyState();
}

export async function requestMicAccess(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    if (typeof window !== 'undefined') {
      (window as any).__examsarthi_mic_granted = true;
      try {
        sessionStorage.setItem('examAudioUnlocked', 'true');
      } catch (error) {
        console.warn('[VoiceEngine] Could not persist microphone permission:', error);
      }
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

export function cleanVoiceTranscript(transcript: string): string {
  if (!transcript) return '';
  return transcript.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
}

export function stopSpeaking(expectedGeneration?: number): void {
  if (expectedGeneration !== undefined && expectedGeneration !== speechGeneration) return;
  speechGeneration++;
  if (speechKeepaliveTimer) {
    clearInterval(speechKeepaliveTimer);
    speechKeepaliveTimer = null;
  }
  if (typeof window !== 'undefined') {
    try {
      window.speechSynthesis.cancel();
    } catch (error) {
      console.warn('[VoiceEngine] Unable to cancel speech:', error);
    }
    (window as any).isSystemSpeaking = false;
    (window as any).__currentUtterance = null;
  }
  isSystemSpeakingRef.current = false;
  isSpeakingGlobal = false;
  currentSpeechPriority = null;
  currentUtteranceGlobal = null;
  notifyState();
}

function queueSpeechChunk(text: string, lang: string, opts: { priority?: VoicePriority; interrupt?: boolean; onStart?: () => void; onEnd?: () => void; onError?: (error: SpeechSynthesisErrorEvent | { error: 'not-supported' }) => void; pitch?: number; voiceURI?: string | null; rate?: number } = {}): number | null {
  const priority = opts.priority ?? 'content';
  const wasListeningBefore = isListeningGlobal;
  const currentPriority = currentSpeechPriority ?? 'talkback';

  if (isSpeakingGlobal) {
    const incoming = PRIORITY_RANK[priority] ?? 0;
    const current = PRIORITY_RANK[currentPriority] ?? 0;
    if (!opts.interrupt && incoming < current) {
      if (opts.onEnd) setTimeout(opts.onEnd, 0);
      return null;
    }
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    if (opts.onEnd) opts.onEnd();
    return null;
  }

  const generation = ++speechGeneration;
  if (speechKeepaliveTimer) {
    clearInterval(speechKeepaliveTimer);
    speechKeepaliveTimer = null;
  }
  try {
    window.speechSynthesis.cancel();
  } catch (_) {}

  if (wasListeningBefore) {
    stopListening(false);
  }

  if (typeof window !== 'undefined') {
    (window as any).isSystemSpeaking = true;
  }
  isSystemSpeakingRef.current = true;
  isSpeakingGlobal = true;
  currentSpeechPriority = priority;
  notifyState();

  const chunks = (text || '')
    .split(/(?<=[.!?。！？])\s+|(?<=\n)\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<string[]>((acc, part) => {
      const buffer = acc[acc.length - 1] || '';
      const candidate = buffer ? `${buffer} ${part}` : part;
      if (candidate.length <= 160) {
        if (!buffer) acc.push(part); else acc[acc.length - 1] = candidate;
      } else {
        if (buffer) acc[acc.length - 1] = buffer;
        const words = part.split(/\s+/);
        let currentChunk = '';
        for (const word of words) {
          if ((currentChunk + ' ' + word).trim().length > 160) {
            if (currentChunk) acc.push(currentChunk.trim());
            currentChunk = word;
          } else {
            currentChunk = (currentChunk ? `${currentChunk} ${word}` : word).trim();
          }
        }
        if (currentChunk) acc.push(currentChunk.trim());
      }
      return acc;
    }, []);

  const safeChunks = chunks.length > 0 ? chunks : [text.trim()].filter(Boolean);
  let chunkIndex = 0;
  let finished = false;

  const finish = () => {
    if (generation !== speechGeneration || finished) return;
    finished = true;
    currentSpeechPriority = null;
    isSpeakingGlobal = false;
    isSystemSpeakingRef.current = false;
    (window as any).isSystemSpeaking = false;
    currentUtteranceGlobal = null;
    (window as any).__currentUtterance = null;
    notifyState();
    opts.onEnd?.();
  };

  const speakNextChunk = () => {
    if (generation !== speechGeneration) return;
    if (chunkIndex >= safeChunks.length) {
      setTimeout(finish, 350);
      return;
    }

    const chunk = safeChunks[chunkIndex++];
    const store = useAccessibilityStore.getState();
    const utterance = new SpeechSynthesisUtterance(sanitizeExamTextForSpeech(chunk, lang));
    utterance.lang = normalizeLanguage(lang);
    utterance.rate = Math.min(1.5, Math.max(0.7, opts.rate ?? store.speechRate ?? 1));
    utterance.pitch = Math.min(1.3, Math.max(0.8, opts.pitch ?? 1));
    utterance.onstart = () => {
      if (generation !== speechGeneration) return;
      currentUtteranceGlobal = utterance;
      if (typeof window !== 'undefined') {
        (window as any).__currentUtterance = utterance;
      }
      if (opts.onStart) opts.onStart();
      if (speechKeepaliveTimer) clearInterval(speechKeepaliveTimer);
      speechKeepaliveTimer = setInterval(() => {
        if (generation !== speechGeneration || currentUtteranceGlobal !== utterance) return;
        try {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            setTimeout(() => {
              if (generation === speechGeneration) window.speechSynthesis.resume();
            }, 60);
          }
        } catch (_) {}
      }, 10000);
    };
    utterance.onend = () => {
      if (generation !== speechGeneration) return;
      if (speechKeepaliveTimer) {
        clearInterval(speechKeepaliveTimer);
        speechKeepaliveTimer = null;
      }
      speakNextChunk();
    };
    utterance.onerror = (event) => {
      if (generation !== speechGeneration) return;
      if (speechKeepaliveTimer) {
        clearInterval(speechKeepaliveTimer);
        speechKeepaliveTimer = null;
      }
      opts.onError?.(event);
      finish();
    };

    const voice = getBestVoice(lang, opts.voiceURI ?? store.selectedVoiceURI);
    if (voice) utterance.voice = voice;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      finish();
    }
  };

  speakNextChunk();
  return generation;
}

export function speak(
  text: string,
  options: {
    lang?: string;
    rate?: number;
    priority?: VoicePriority;
    interrupt?: boolean;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: SpeechSynthesisErrorEvent | { error: 'not-supported' }) => void;
    pitch?: number;
    voiceURI?: string | null;
  } = {}
): number | null {
  if (!text || !text.trim()) {
    if (options.onEnd) options.onEnd();
    return null;
  }

  if (typeof window === 'undefined') {
    if (options.onEnd) options.onEnd();
    return null;
  }

  const lang = normalizeLanguage(options.lang);
  activeLang = lang;
  return queueSpeechChunk(text, lang, options);
}

export const speakText = (text: string, langOrCb?: string | (() => void), onComplete?: () => void): void => {
  if (typeof langOrCb === 'function') {
    speak(text, { priority: 'content', onEnd: langOrCb });
    return;
  }
  speak(text, { lang: langOrCb || 'en-IN', priority: 'content', onEnd: onComplete });
};

export const speakQuestion = (text: string, langOrCb?: string | (() => void), onComplete?: () => void): void => {
  if (typeof langOrCb === 'function') {
    speak(text, { priority: 'response', onEnd: langOrCb });
    return;
  }
  speak(text, { lang: langOrCb || 'en-IN', priority: 'response', onEnd: onComplete });
};

function handleRecognitionError(error: any): void {
  const code = error?.error || '';
  if (code === 'aborted' || code === 'no-speech') {
    return;
  }

  const fallbackText = 'Voice unavailable, use keyboard: Alt+N, Alt+P, 1-4';
  if (['network', 'not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'].includes(code)) {
    stopListening();
    globalLastError = code;
    notifyState();
    if (typeof window !== 'undefined') {
      (window as any).__examsarthi_voice_error = fallbackText;
    }
    speak(fallbackText, { lang: activeLang, priority: 'response', interrupt: true });
    return;
  }

  if (code) {
    globalLastError = code;
    notifyState();
  }

  if (isListeningGlobal) {
    recognitionRetryDelay = Math.min(recognitionRetryDelay * 2, 2000);
    scheduleRecognitionRestart(recognitionRetryDelay);
  }
}

export function startListening(
  lang = 'en-IN',
  onTranscript?: (text: string) => void,
  options: { resolveAlternatives?: boolean } = {}
): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeLanguage(lang);
  activeLang = normalized;
  if (isSpeakingGlobal) {
    activeRecognitionHandler = onTranscript ?? activeRecognitionHandler;
    return;
  }

  stopListening(false);
  activeRecognitionHandler = onTranscript ?? null;
  resolveRecognitionAlternatives = options.resolveAlternatives ?? true;

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    globalLastError = 'SpeechRecognition is not supported in this browser';
    stopListening();
    notifyState();
    return;
  }

  try {
    const recognition = new SpeechRecognition();
    (window as any).globalRecognitionInstance = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;
    recognition.lang = normalized;
    injectExamGrammar(recognition);

    recognition.onresult = async (event: any) => {
      if (isSpeakingGlobal || (typeof window !== 'undefined' && (window as any).isSystemSpeaking)) {
        return;
      }

      // 1. Safe Extraction
      const transcript = event.results[event.results.length - 1][0].transcript;
      if (!transcript || typeof transcript !== 'string') return;
      
      const lower = transcript.toLowerCase().trim();
      console.log("[VOICE ENGINE] Heard:", lower);

      // Preserve UI updates for the Sarthi transcript bubble
      globalTranscript = transcript;
      globalLastError = null;
      recognitionRetryDelay = 200;
      notifyState();
      activeRecognitionHandler?.(transcript);
      transcriptSubscribers.forEach((cb) => {
        try { cb(transcript); } catch (_) {}
      });

      // 2. Instant Navigation Interceptors (Bypass AI)
      if (lower.includes('stop') || lower.includes('exit')) {
        stopSpeaking();
        stopListening();
        if (typeof window !== 'undefined') window.speechSynthesis.cancel();
        window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'STOP' } }));
        return; 
      }
      if (lower.includes('previous') || lower.includes('back')) {
        window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'PREVIOUS' } }));
        return;
      }
      if (lower.includes('next')) {
        window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'NEXT' } }));
        return;
      }
      if (lower.includes('review') || lower.includes('start')) {
        window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'REVIEW' } }));
        return;
      }

      // 3. Default AI Flow (CRITICAL: Do not remove this)
      // If it's not a basic command, send it to the backend so the AI companion can respond normally.
      try {
        const res = await fetch('/api/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript })
        });
        
        if (!res.ok) {
          console.error("[VOICE ENGINE] AI API failed with status:", res.status);
          return;
        }
        
        const data = await res.json();
        // Broadcast the AI's determined intent to the platform
        window.dispatchEvent(new CustomEvent('ai_voice_command', { 
          detail: { intent: data.intent, target: data.target, message: data.message } 
        }));
        
      } catch (error) {
        console.error("[VOICE ENGINE] Fatal error reaching AI:", error);
      }
    };

    recognition.onerror = (event: any) => {
      handleRecognitionError(event);
    };

    recognition.onend = () => {
      if (isSpeakingGlobal || !isListeningGlobal) return;
      const delay = Math.min(recognitionRetryDelay, 2000);
      scheduleRecognitionRestart(delay);
    };

    recognition.onnomatch = () => {
      globalLastError = 'no-match';
      notifyState();
    };

    globalRecognition = recognition;
    isListeningGlobal = true;
    globalLastError = null;
    notifyState();
    recognition.start();
  } catch (err: any) {
    console.warn('[VoiceEngine] Recognition start error:', err);
    globalLastError = err?.message || 'Failed to start microphone';
    stopListening();
    notifyState();
  }
}

export interface UseVoiceEngineOptions {
  onTranscript?: (transcript: string) => void;
  lang?: string;
  autoStart?: boolean;
}

export function useVoiceEngine(options?: UseVoiceEngineOptions) {
  const isSupported = useVoiceRecognitionSupport();
  const [isListening, setIsListening] = useState<boolean>(isListeningGlobal);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(isSpeakingGlobal);
  const [transcript, setTranscript] = useState<string>(globalTranscript);
  const [lastError, setLastError] = useState<string | null>(globalLastError);
  const [hasMicPermission, setHasMicPermission] = useState<boolean>(() => {
    return hasStoredMicPermission();
  });

  const onTranscriptRef = useRef(options?.onTranscript);
  useEffect(() => { onTranscriptRef.current = options?.onTranscript; }, [options?.onTranscript]);

  const langRef = useRef(options?.lang || 'en-IN');
  useEffect(() => { langRef.current = options?.lang || 'en-IN'; }, [options?.lang]);

  useEffect(() => {
    const handleStateUpdate = () => {
      setIsListening(isListeningGlobal);
      setIsSpeaking(isSpeakingGlobal);
      setTranscript(globalTranscript);
      setLastError(globalLastError);
      if (typeof window !== 'undefined') {
        if (hasStoredMicPermission()) setHasMicPermission(true);
      }
    };

    stateSubscribers.add(handleStateUpdate);
    const handleTranscriptReceived = (t: string) => {
      setTranscript(t);
      if (onTranscriptRef.current) onTranscriptRef.current(t);
    };
    transcriptSubscribers.add(handleTranscriptReceived);

    handleStateUpdate();

    if (options?.autoStart && !isListeningGlobal && !isSpeakingGlobal) {
      startListening(langRef.current);
    }

    return () => {
      stateSubscribers.delete(handleStateUpdate);
      transcriptSubscribers.delete(handleTranscriptReceived);
    };
  }, [options?.autoStart]);

  const handleStart = useCallback((customLang?: string) => {
    startListening(customLang || langRef.current);
  }, []);

  const handleStop = useCallback(() => stopListening(), []);
  const handleRequestMic = useCallback(async () => {
    const granted = await requestMicAccess();
    if (granted) setHasMicPermission(true);
    return granted;
  }, []);

  return {
    isListening,
    isSpeaking,
    isSupported,
    transcript,
    lastError,
    hasMicPermission,
    isSystemSpeakingRef,
    startListening: handleStart,
    stopListening: handleStop,
    speakText,
    speakQuestion,
    cleanVoiceTranscript,
    fetchAIIntent,
    requestMicAccess: handleRequestMic,
  };
}

export interface AIIntentResult {
  intent: 'NAVIGATE' | 'EXAM_LAUNCH' | 'CONTROL' | 'ANSWER' | 'UNKNOWN';
  target: string;
}

export async function fetchAIIntent(transcript: string): Promise<AIIntentResult> {
  if (!transcript || !transcript.trim()) {
    return { intent: 'UNKNOWN', target: '' };
  }

  const lowerTranscript = transcript.toLowerCase().trim();
  const isListenerActive = typeof window !== 'undefined' && (window.location.pathname.startsWith('/exam') || window.location.pathname.startsWith('/results'));
  
  if (isListenerActive) {
    if (wholeWordMatch(lowerTranscript, 'stop') || wholeWordMatch(lowerTranscript, 'exit')) {
      stopSpeaking();
      stopListening();
      if (typeof window !== 'undefined') window.speechSynthesis.cancel();
      window.dispatchEvent(new CustomEvent('ai_voice_command', { 
        detail: { intent: 'CONTROL', target: 'STOP' } 
      }));
      return { intent: 'CONTROL', target: 'STOP' };
    }
    if (wholeWordMatch(lowerTranscript, 'previous') || wholeWordMatch(lowerTranscript, 'back')) {
      window.dispatchEvent(new CustomEvent('ai_voice_command', { 
        detail: { intent: 'CONTROL', target: 'PREVIOUS' } 
      }));
      return { intent: 'CONTROL', target: 'PREVIOUS' };
    }
    if (wholeWordMatch(lowerTranscript, 'next')) {
      window.dispatchEvent(new CustomEvent('ai_voice_command', { 
        detail: { intent: 'CONTROL', target: 'NEXT' } 
      }));
      return { intent: 'CONTROL', target: 'NEXT' };
    }
    if (wholeWordMatch(lowerTranscript, 'review') || wholeWordMatch(lowerTranscript, 'start')) {
      window.dispatchEvent(new CustomEvent('ai_voice_command', { 
        detail: { intent: 'CONTROL', target: 'REVIEW' } 
      }));
      return { intent: 'CONTROL', target: 'REVIEW' };
    }
  }

  const routed = routeVoiceCommand(lowerTranscript, 'global-nav');
  if (routed.handled) {
    return { intent: 'UNKNOWN', target: '' };
  }

  const now = Date.now();
  const lastRemoteCall = (typeof window !== 'undefined' ? Number(sessionStorage.getItem('last_intent_call') || '0') : 0);
  if (now - lastRemoteCall < 2000) {
    console.warn('[VoiceEngine] Remote intent cooldown active');
    return { intent: 'UNKNOWN', target: '' };
  }
  if (typeof window !== 'undefined') sessionStorage.setItem('last_intent_call', now.toString());

  try {
    const res = await fetch('/api/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: transcript.substring(0, 300) }),
    });
    const data = await res.json();

    // Dispatches the exact intent and target globally
    if (isListenerActive && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ai_voice_command', { 
        detail: { intent: data.intent, target: data.target } 
      }));
    }

    return { intent: data.intent || 'UNKNOWN', target: data.target || '' };
  } catch (err) {
    console.error('[VoiceEngine] AI Intent Routing failed:', err);
    return { intent: 'UNKNOWN', target: '' };
  }
}
