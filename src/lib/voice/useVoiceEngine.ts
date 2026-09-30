"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { getBestVoice, sanitizeExamTextForSpeech } from './speech-synthesis';
import { injectExamGrammar } from './speech-recognition';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { routeVoiceCommand, hasActiveContext } from './commandRouter';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

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
let recognitionRetryDelay = 100;
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
  console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'scheduleRecognitionRestart', delayMs, isListeningGlobal, globalRecognitionExists: !!globalRecognition });
  recognitionRetryTimer = setTimeout(() => {
    if (!isSpeakingGlobal && isListeningGlobal && globalRecognition && typeof globalRecognition.start === 'function') {
      try {
        console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'auto-restart-attempting', isListeningGlobal, isSpeakingGlobal });
        globalRecognition.start();
      } catch (e) {
        console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'auto-restart-failed', error: String(e) });
      }
    }
  }, delayMs);
}

function clearRetryTimer(): void {
  if (recognitionRetryTimer) {
    clearTimeout(recognitionRetryTimer);
    recognitionRetryTimer = null;
  }
  recognitionRetryDelay = 100;
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
  console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'stopListening-start', clearTranscriptHandler, isListeningGlobal, globalRecognitionExists: !!globalRecognition });
  clearRetryTimer();
  if (clearTranscriptHandler) {
    activeRecognitionHandler = null;
    resolveRecognitionAlternatives = true;
  }
  if (globalRecognition) {
    try {
      console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'recognition-cleanup-start' });
      globalRecognition.onend = null;
      globalRecognition.onerror = null;
      globalRecognition.onresult = null;
      globalRecognition.onnomatch = null;
      globalRecognition.abort();
      console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'recognition-abort-called' });
    } catch (e) {
      console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'recognition-cleanup-error', error: String(e) });
    }
    globalRecognition = null;
  }
  isListeningGlobal = false;
  console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'stopListening-end', isListeningGlobal });
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

function queueSpeechChunk(text: string, lang: string, opts: { priority?: VoicePriority; interrupt?: boolean; onStart?: () => void; onEnd?: () => void; onError?: (error: SpeechSynthesisErrorEvent | { error: 'not-supported' }) => void; rate?: number; pitch?: number; voiceURI?: string | null } = {}): number | null {
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
      setTimeout(finish, 150);
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
  console.log('[EXAMSARTHI VOICE DEBUG]', { 
    event: 'handleRecognitionError', 
    code, 
    isListeningGlobal, 
    isSpeakingGlobal, 
    globalRecognitionExists: !!globalRecognition 
  });

  if (code === 'aborted' || code === 'no-speech') {
    console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'error-ignored', code });
    return;
  }

  const fallbackText = 'Voice unavailable, use keyboard: Alt+N, Alt+P, 1-4';
  if (['network', 'not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'].includes(code)) {
    console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'fallback-message-triggered', code });
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
    console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'error-retry-scheduled', code, nextDelay: recognitionRetryDelay });
    scheduleRecognitionRestart(recognitionRetryDelay);
  }
}

export function startListening(
  lang = 'en-IN',
  onTranscript?: (text: string) => void,
  options: { resolveAlternatives?: boolean } = {}
): void {
  console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'startListening', lang, isSpeakingGlobal, isListeningGlobal });
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
    console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'recognition-created' });
    (window as any).globalRecognitionInstance = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;
    recognition.lang = normalized;
    injectExamGrammar(recognition);

    let lastDeliveredTranscript = '';
    let lastDeliveredTime = 0;

    recognition.onresult = (event: any) => {
      // Only act on final results
      const lastResult = event.results[event.results.length - 1];
      if (!lastResult) return;

      if (!lastResult.isFinal) {
        // Expose interim text as lastHeard for UI only
        const interim = lastResult[0]?.transcript || '';
        if (interim) {
          globalTranscript = interim;
          notifyState();
        }
        return;
      }

      const transcript = lastResult[0]?.transcript;
      if (!transcript || typeof transcript !== 'string') return;

      const lower = transcript.toLowerCase().trim();
      if (!lower) return;

      console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'final-transcript-received', transcript: lower.substring(0, 50) });

      // Deduplicate identical transcripts within 800ms
      const now = Date.now();
      if (lower === lastDeliveredTranscript && now - lastDeliveredTime < 800) {
        return;
      }
      lastDeliveredTranscript = lower;
      lastDeliveredTime = now;

      const forwardTranscript = (text: string) => {
        if (activeRecognitionHandler) {
          try { activeRecognitionHandler(text); } catch (_) {}
        } else {
          transcriptSubscribers.forEach((cb) => {
            try { cb(text); } catch (_) {}
          });
        }
      };

      // Always allow critical navigation, flag & review commands to fire immediately and notify handlers!
      const isFlagCommand = 
        lower.includes('flag') || 
        lower.includes('mark for review') || 
        lower.includes('flag for review') || 
        lower.includes('flagfor review') || 
        lower.includes('flagfor') || 
        lower.includes('flag this') || 
        lower.includes('flag question') || 
        lower.includes('review later') || 
        lower.includes('bookmark') || 
        lower.includes('चिह्नित') || 
        lower.includes('फ्लैग');

      if (isFlagCommand) {
        console.log("🔥 [VOICE ENGINE] 'Flag for review' command caught! Dispatching event and forwarding...");
        window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'FLAG' } }));
        forwardTranscript(transcript);
        return;
      }

      if (lower.includes('next') || lower.includes('forward') || lower.includes('agla') || lower.includes('aage') || lower.includes('अगला')) {
        console.log("🔥 [VOICE ENGINE] 'Next' command caught! Dispatching global event & forwarding...");
        window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'NEXT' } }));
        forwardTranscript(transcript);
        return;
      }

      if (lower.includes('previous') || lower.includes('back') || lower.includes('prev') || lower.includes('pichhla') || lower.includes('pichla') || lower.includes('peeche') || lower.includes('पिछला')) {
        console.log("🔥 [VOICE ENGINE] 'Previous' command caught! Dispatching global event & forwarding...");
        window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'PREVIOUS' } }));
        forwardTranscript(transcript);
        return;
      }

      if (lower.includes('repeat') || lower.includes('again') || lower.includes('once more') || lower.includes('dohrao') || lower.includes('fir se') || lower.includes('phir se') || lower.includes('दोबारा')) {
        console.log("🔥 [VOICE ENGINE] 'Repeat' command caught! Dispatching global event & forwarding...");
        window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'REPEAT' } }));
        forwardTranscript(transcript);
        return;
      }

      if (lower.includes('stop') || lower.includes('exit') || lower.includes('quit') || lower.includes('close') || lower.includes('khatam') || lower.includes('ruko') || lower.includes('रुक')) {
        console.log("🔥 [VOICE ENGINE] 'Stop' command caught! Dispatching global event & forwarding...");
        window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'STOP' } }));
        forwardTranscript(transcript);
        return;
      }

      if (lower.includes('review') || lower.includes('रिव्यू')) {
        const inExam = typeof window !== 'undefined' && window.location.pathname.startsWith('/exam');
        if (inExam) {
          console.log("🔥 [VOICE ENGINE] 'Review' in exam context -> Handling as Flag for review!");
          window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'FLAG' } }));
          forwardTranscript(transcript);
          return;
        }
        console.log("🔥 [VOICE ENGINE] 'Review' command caught! Dispatching global event & forwarding...");
        window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'REVIEW' } }));
        forwardTranscript(transcript);
        return;
      }

      if (isSpeakingGlobal || (typeof window !== 'undefined' && (window as any).isSystemSpeaking)) {
        return;
      }

      if (typeof localStorage !== 'undefined' && localStorage.getItem('voiceDebug') === '1') {
        const confidence = lastResult[0]?.confidence ?? -1;
        console.debug('[VoiceEngine] final:', lower, 'conf:', confidence.toFixed(2));
      }

      // Ignore single short tokens with low confidence unless they exactly match a command
      const confidence = lastResult[0]?.confidence ?? 1;
      if (confidence < 0.4 && lower.split(/\s+/).length === 1 && lower.length < 4) {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('voiceDebug') === '1') {
          console.debug('[VoiceEngine] rejected: low confidence single short token');
        }
        return;
      }

      globalTranscript = transcript;
      globalLastError = null;
      recognitionRetryDelay = 100;
      notifyState();

      console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'transcript-handler-invoking', isListeningGlobal, isSpeakingGlobal });
      // Deliver ONCE: to activeRecognitionHandler if set, otherwise to subscribers
      if (activeRecognitionHandler) {
        console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'calling-activeRecognitionHandler' });
        activeRecognitionHandler(transcript);
      } else {
        console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'calling-transcriptSubscribers', subscriberCount: transcriptSubscribers.size });
        transcriptSubscribers.forEach((cb) => {
          try { cb(transcript); } catch (_) {}
        });
      }
      console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'transcript-handler-completed', isListeningGlobal });
    };

    recognition.onerror = (event: any) => {
      console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'recognition-onerror-fired', code: event?.error });
      handleRecognitionError(event);
    };

    recognition.onend = () => {
      console.log('[EXAMSARTHI VOICE DEBUG]', { 
        event: 'recognition-onend-fired', 
        isListeningGlobal, 
        isSpeakingGlobal, 
        willAutoRestart: isSpeakingGlobal === false && isListeningGlobal === true 
      });
      if (isSpeakingGlobal || !isListeningGlobal) {
        console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'onend-skipping-restart', isSpeakingGlobal, isListeningGlobal });
        return;
      }
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
    console.log('[EXAMSARTHI VOICE DEBUG]', { event: 'recognition-start-called' });
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
  const lower = lowerTranscript;

  // 0. Flag for review
  const isFlag = lower.includes('flag') || lower.includes('mark for review') || lower.includes('flag for review') || lower.includes('flagfor review') || lower.includes('flagfor') || lower.includes('bookmark');
  if (isFlag) {
    window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'FLAG' } }));
    return { intent: 'CONTROL', target: 'FLAG' };
  }

  // 1. Trigger the Panel
  if (lower.includes('review')) {
    const inExam = typeof window !== 'undefined' && window.location.pathname.startsWith('/exam');
    if (inExam) {
      window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'FLAG' } }));
      return { intent: 'CONTROL', target: 'FLAG' };
    }
    window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'REVIEW' } }));
    return { intent: 'CONTROL', target: 'REVIEW' };
  }
  // 2. Navigation Commands
  if (lower.includes('next')) {
    window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'NEXT' } }));
    return { intent: 'CONTROL', target: 'NEXT' };
  }
  if (lower.includes('previous') || lower.includes('back')) {
    window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'PREVIOUS' } }));
    return { intent: 'CONTROL', target: 'PREVIOUS' };
  }
  if (lower.includes('stop') || lower.includes('exit')) {
    window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'STOP' } }));
    return { intent: 'CONTROL', target: 'STOP' };
  }
  if (lower.includes('repeat')) {
    window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'REPEAT' } }));
    return { intent: 'CONTROL', target: 'REPEAT' };
  }
  if (lower.includes('pause')) {
    window.dispatchEvent(new CustomEvent('ai_voice_command', { detail: { intent: 'CONTROL', target: 'PAUSE' } }));
    return { intent: 'CONTROL', target: 'PAUSE' };
  }

  // NEVER call /api/intent in exam route or review context
  const isExamOrReview = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/exam') ||
    window.location.pathname.startsWith('/results')
  );
  if (isExamOrReview) {
    return { intent: 'UNKNOWN', target: '' };
  }

  // Also skip if any active voice context is registered (exam/review/hub/practice)
  if (hasActiveContext(['exam', 'review', 'hub', 'practice'])) {
    return { intent: 'UNKNOWN', target: '' };
  }

  // Check for specific exam launch locally before general navigation
  if (lowerTranscript.includes('ssc') || lowerTranscript.includes('cgl')) {
    if (/\b(start|take|open|launch|shuru|शुरू)\b/.test(lowerTranscript) || lowerTranscript.includes('mock')) {
      return { intent: 'EXAM_LAUNCH', target: 'ssc-cgl' };
    }
  }
  if (lowerTranscript.includes('upsc') || lowerTranscript.includes('csat')) {
    if (/\b(start|take|open|launch|shuru|शुरू)\b/.test(lowerTranscript) || lowerTranscript.includes('mock')) {
      return { intent: 'EXAM_LAUNCH', target: 'upsc-prelims' };
    }
  }
  if (lowerTranscript.includes('banking') || lowerTranscript.includes('ibps') || lowerTranscript.includes('po')) {
    if (/\b(start|take|open|launch|shuru|शुरू)\b/.test(lowerTranscript) || lowerTranscript.includes('mock')) {
      return { intent: 'EXAM_LAUNCH', target: 'banking-po' };
    }
  }

  // Try deterministic local routing first (zero-network)
  const routed = routeVoiceCommand(lowerTranscript, 'global-nav');
  if (routed.handled) {
    if (routed.type === 'route' && routed.path) {
      return { intent: 'NAVIGATE', target: routed.path };
    }
    if (routed.type === 'next') return { intent: 'CONTROL', target: 'NEXT' };
    if (routed.type === 'previous') return { intent: 'CONTROL', target: 'PREVIOUS' };
    if (routed.type === 'submit') return { intent: 'CONTROL', target: 'SUBMIT' };
    if (routed.type === 'repeat-question') return { intent: 'CONTROL', target: 'REPEAT' };
    if (routed.type === 'pause') return { intent: 'CONTROL', target: 'PAUSE' };
    if (routed.type === 'resume') return { intent: 'CONTROL', target: 'RESUME' };
    if (routed.type === 'stop') return { intent: 'CONTROL', target: 'STOP' };
    if (routed.type === 'flag-unflag') return { intent: 'CONTROL', target: 'FLAG' };
    if (routed.type === 'select-option' && routed.optionIndex !== undefined) {
      return { intent: 'ANSWER', target: String.fromCharCode(65 + routed.optionIndex) };
    }
    return { intent: 'UNKNOWN', target: '' };
  }

  // Only call /api/intent if transcript has >= 3 words
  const wordCount = lowerTranscript.split(/\s+/).length;
  if (wordCount < 3) {
    return { intent: 'UNKNOWN', target: '' };
  }

  // 1.5s cooldown
  const now = Date.now();
  const lastRemoteCall = (typeof window !== 'undefined' ? Number(sessionStorage.getItem('last_intent_call') || '0') : 0);
  if (now - lastRemoteCall < 1500) {
    return { intent: 'UNKNOWN', target: '' };
  }
  // Check client-side authentication before making remote AI call
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return { intent: 'UNKNOWN', target: '' };
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      // Unauthenticated client -> gracefully degrade without calling /api/intent
      return { intent: 'UNKNOWN', target: '' };
    }
  } catch {
    return { intent: 'UNKNOWN', target: '' };
  }

  try {
    const res = await fetch('/api/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: transcript.substring(0, 300) }),
    });
    if (!res.ok) {
      console.warn(`[VoiceEngine] /api/intent responded with HTTP ${res.status}`);
      return { intent: 'UNKNOWN', target: '' };
    }
    const data = await res.json();
    return { intent: data.intent || 'UNKNOWN', target: data.target || '' };
  } catch (err) {
    console.error('[VoiceEngine] AI Intent Routing failed:', err);
    return { intent: 'UNKNOWN', target: '' };
  }
}
