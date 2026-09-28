"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { getBestVoice, sanitizeExamTextForSpeech } from './speech-synthesis';
import { injectExamGrammar, extractTranscriptsFromEvent, resolveMultiAlternativeCommand } from './speech-recognition';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';

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
let activeLang = 'en-IN';
let currentSpeechPriority: VoicePriority | null = null;
let recognitionRetryTimer: ReturnType<typeof setTimeout> | null = null;
let recognitionRetryDelay = 200;

export const isSystemSpeakingRef: { current: boolean } = { current: false };
export const recognitionRef: { current: any } = {
  get current() { return globalRecognition; },
  set current(val: any) { globalRecognition = val; },
};

const transcriptSubscribers = new Set<(text: string) => void>();
const stateSubscribers = new Set<() => void>();

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

export function stopListening(): void {
  clearRetryTimer();
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
      try {
        sessionStorage.setItem('examAudioUnlocked', 'true');
        (window as any).__examsarthi_mic_granted = true;
      } catch (_) {}
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

export function stopSpeaking(): void {
  if (typeof window !== 'undefined') {
    try { window.speechSynthesis.cancel(); } catch (_) {}
    (window as any).isSystemSpeaking = false;
  }
  isSystemSpeakingRef.current = false;
  isSpeakingGlobal = false;
  currentSpeechPriority = null;
  currentUtteranceGlobal = null;
  notifyState();
}

function queueSpeechChunk(text: string, lang: string, opts: { priority?: VoicePriority; interrupt?: boolean; onStart?: () => void; onEnd?: () => void; rate?: number } = {}) {
  const priority = opts.priority ?? 'content';
  const wasListeningBefore = isListeningGlobal;
  const currentPriority = currentSpeechPriority ?? 'talkback';

  if (isSpeakingGlobal) {
    const incoming = PRIORITY_RANK[priority] ?? 0;
    const current = PRIORITY_RANK[currentPriority] ?? 0;
    if (incoming < current) {
      if (opts.onEnd) setTimeout(opts.onEnd, 0);
      return;
    }
  }

  if (typeof window === 'undefined') {
    if (opts.onEnd) opts.onEnd();
    return;
  }

  if (wasListeningBefore) {
    stopListening();
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

  const speakNextChunk = () => {
    if (chunkIndex >= safeChunks.length) {
      const finish = () => {
        currentSpeechPriority = null;
        isSpeakingGlobal = false;
        isSystemSpeakingRef.current = false;
        if (typeof window !== 'undefined') {
          (window as any).isSystemSpeaking = false;
        }
        currentUtteranceGlobal = null;
        notifyState();
        if (wasListeningBefore) {
          setTimeout(() => {
            if (!isSpeakingGlobal && typeof window !== 'undefined') {
              startListening(activeLang);
            }
          }, 350);
        }
        if (opts.onEnd) opts.onEnd();
      };
      setTimeout(finish, 350);
      return;
    }

    const chunk = safeChunks[chunkIndex++];
    const store = useAccessibilityStore.getState();
    const utterance = new SpeechSynthesisUtterance(sanitizeExamTextForSpeech(chunk, lang));
    utterance.lang = normalizeLanguage(lang);
    utterance.rate = Math.min(1.5, Math.max(0.7, opts.rate ?? store.speechRate ?? 1));
    utterance.onstart = () => {
      currentUtteranceGlobal = utterance;
      if (typeof window !== 'undefined') {
        (window as any).__currentUtterance = utterance;
      }
      if (opts.onStart) opts.onStart();
    };
    utterance.onend = () => {
      if (typeof window !== 'undefined') {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }
      speakNextChunk();
    };
    utterance.onerror = () => {
      speakNextChunk();
    };

    const keepalive = setInterval(() => {
      if (!isSpeakingGlobal || !currentUtteranceGlobal || currentUtteranceGlobal !== utterance) return;
      try {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          setTimeout(() => {
            try { window.speechSynthesis.resume(); } catch (_) {}
          }, 50);
        }
      } catch (_) {}
    }, 10000);

    const cleanupKeepalive = () => {
      clearInterval(keepalive);
    };
    utterance.onstart = () => {
      currentUtteranceGlobal = utterance;
      if (typeof window !== 'undefined') {
        (window as any).__currentUtterance = utterance;
      }
      if (opts.onStart) opts.onStart();
      if (typeof window !== 'undefined') {
        const keepaliveRef = setInterval(() => {
          if (!isSpeakingGlobal || !currentUtteranceGlobal || currentUtteranceGlobal !== utterance) return;
          try {
            if (window.speechSynthesis.speaking) {
              window.speechSynthesis.pause();
              setTimeout(() => {
                try { window.speechSynthesis.resume(); } catch (_) {}
              }, 60);
            }
          } catch (_) {}
        }, 10000);
        (utterance as any).__keepalive = keepaliveRef;
      }
    };
    utterance.onend = () => {
      cleanupKeepalive();
      if (typeof window !== 'undefined') {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }
      speakNextChunk();
    };
    utterance.onerror = () => {
      cleanupKeepalive();
      speakNextChunk();
    };

    const voice = getBestVoice(lang, store.selectedVoiceURI);
    if (voice) utterance.voice = voice;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      speakNextChunk();
    }
  };

  speakNextChunk();
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
  } = {}
): void {
  if (!text || !text.trim()) {
    if (options.onEnd) options.onEnd();
    return;
  }

  if (typeof window === 'undefined') {
    if (options.onEnd) options.onEnd();
    return;
  }

  const lang = normalizeLanguage(options.lang);
  activeLang = lang;
  queueSpeechChunk(text, lang, options);
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

export function startListening(lang = 'en-IN', onTranscript?: (text: string) => void): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeLanguage(lang);
  activeLang = normalized;
  if (onTranscript) {
    subscribe(onTranscript);
  }
  if (isSpeakingGlobal) {
    return;
  }

  stopListening();

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    globalLastError = 'SpeechRecognition is not supported in this browser';
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

    recognition.onresult = (event: any) => {
      if (isSpeakingGlobal || (typeof window !== 'undefined' && (window as any).isSystemSpeaking)) {
        return;
      }

      const result = event?.results?.[event.resultIndex];
      if (!result || result.isFinal === false) {
        return;
      }
      const transcript = (result[0]?.transcript || '').trim();
      if (!transcript) return;

      const candidates = extractTranscriptsFromEvent(event);
      let raw = candidates[0] || transcript;
      if (candidates.length > 0) {
        const resolved = resolveMultiAlternativeCommand(candidates);
        if (resolved) raw = resolved.matchedToken;
      }

      const finalTranscript = cleanVoiceTranscript(raw || transcript);
      if (!finalTranscript) return;
      globalTranscript = finalTranscript;
      globalLastError = null;
      notifyState();
      transcriptSubscribers.forEach((cb) => {
        try { cb(finalTranscript); } catch (_) {}
      });

      const lowerTranscript = transcript.toLowerCase().trim();
      
      // SLEDGEHAMMER BYPASS: If the user says "review", instantly trigger the panel and skip the AI.
      if (lowerTranscript.includes('review') || finalTranscript.toLowerCase().includes('review')) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ai_voice_command', { 
            detail: { intent: 'CONTROL', target: 'REVIEW' } 
          }));
        }
        return; // CRITICAL: Stop execution here so it does NOT go to Groq
      }

      // Broadcast recognized speech through AI Intent router
      fetchAIIntent(finalTranscript).catch(() => {});
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
    isListeningGlobal = false;
    notifyState();
  }
}

export interface UseVoiceEngineOptions {
  onTranscript?: (transcript: string) => void;
  lang?: string;
  autoStart?: boolean;
}

export function useVoiceEngine(options?: UseVoiceEngineOptions) {
  const [isListening, setIsListening] = useState<boolean>(isListeningGlobal);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(isSpeakingGlobal);
  const [transcript, setTranscript] = useState<string>(globalTranscript);
  const [lastError, setLastError] = useState<string | null>(globalLastError);
  const [hasMicPermission, setHasMicPermission] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return Boolean((window as any).__examsarthi_mic_granted) || sessionStorage.getItem('examAudioUnlocked') === 'true';
    }
    return false;
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
        const granted = Boolean((window as any).__examsarthi_mic_granted) || sessionStorage.getItem('examAudioUnlocked') === 'true';
        if (granted) setHasMicPermission(true);
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

  const handleStop = useCallback(() => stopListening(), []);
  const handleRequestMic = useCallback(async () => {
    const granted = await requestMicAccess();
    if (granted) setHasMicPermission(true);
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
  
  // SLEDGEHAMMER BYPASS: If the user says "review", instantly trigger the panel and skip the AI.
  if (lowerTranscript.includes('review')) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ai_voice_command', { 
        detail: { intent: 'CONTROL', target: 'REVIEW' } 
      }));
    }
    return { intent: 'CONTROL', target: 'REVIEW' }; // CRITICAL: Stop execution here so it does NOT go to Groq
  }

  try {
    const res = await fetch('/api/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    });
    const data = await res.json();

    // Dispatches the exact intent and target globally
    if (typeof window !== 'undefined') {
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
