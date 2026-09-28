"use client";

import { useAccessibilityStore } from "@/store/useAccessibilityStore";

/**
 * EXAMSARTHI — High-Fidelity Neural Speech Synthesis & Phonetic Sanitizer
 * 
 * Provides:
 * 1. Asynchronous voice querying via onvoiceschanged with prioritized neural/natural voices.
 * 2. Exam Text-to-Phonetics Pre-Processor for math, grammar shorthand, acronyms, and breathing cadence.
 * 3. GC-safe SpeechSynthesisUtterance lifecycle management.
 */

// Voice Priority Tables
const ENGLISH_VOICE_SEARCH_ORDER = [
  "Google US English",
  "Microsoft Jenny Online (Natural)",
  "Microsoft Aria Online (Natural)",
  "en-US Natural",
  "en-US",
];

const HINDI_VOICE_SEARCH_ORDER = [
  "Google हिन्दी",
  "Microsoft Swara Online (Natural)",
  "Microsoft Neerja Online (Natural)",
  "hi-IN",
];

export interface CategorizedVoice {
  voice: SpeechSynthesisVoice;
  category: 'Natural Female' | 'Natural Male' | 'Studio Standard';
  displayName: string;
}

// In-memory cache of voices
let voicesCache: SpeechSynthesisVoice[] = [];
const voiceChangeListeners = new Set<() => void>();

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const updateVoices = () => {
    try {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        voicesCache = v;
        voiceChangeListeners.forEach((cb) => {
          try { cb(); } catch (e) {}
        });
      }
    } catch (e) {
      // Ignore
    }
  };

  updateVoices();
  window.speechSynthesis.onvoiceschanged = updateVoices;
}

/**
 * Subscribe to voice list updates (triggered onvoiceschanged).
 */
export function onVoicesLoaded(callback: () => void): () => void {
  voiceChangeListeners.add(callback);
  if (voicesCache.length > 0) {
    callback();
  }
  return () => {
    voiceChangeListeners.delete(callback);
  };
}

/**
 * Get all available browser voices.
 */
export function getAvailableVoices(filterLang?: string): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }
  if (voicesCache.length === 0) {
    voicesCache = window.speechSynthesis.getVoices() || [];
  }
  if (!filterLang) return voicesCache;

  const prefix = filterLang.toLowerCase().slice(0, 2);
  return voicesCache.filter((v) => v.lang.toLowerCase().startsWith(prefix));
}

/**
 * Categorize a voice into Natural Female, Natural Male, or Studio Standard.
 */
export function categorizeVoice(voice: SpeechSynthesisVoice): CategorizedVoice {
  const name = voice.name.toLowerCase();
  const uri = voice.voiceURI.toLowerCase();
  const isNatural = name.includes("natural") || name.includes("online") || name.includes("neural") || name.includes("google");

  const femaleMarkers = ["female", "woman", "jenny", "aria", "swara", "neerja", "zira", "samantha", "victoria", "karen", "kalpana", "heera", "veena", "google us english", "google हिन्दी"];
  const maleMarkers = ["male", "man", "guy", "christopher", "madhur", "hemant", "david", "mark", "ravi", "george"];

  let category: CategorizedVoice['category'] = 'Studio Standard';
  if (femaleMarkers.some((m) => name.includes(m) || uri.includes(m))) {
    category = isNatural ? 'Natural Female' : 'Studio Standard';
  } else if (maleMarkers.some((m) => name.includes(m) || uri.includes(m))) {
    category = isNatural ? 'Natural Male' : 'Studio Standard';
  } else if (isNatural) {
    category = 'Natural Female';
  }

  // Clean friendly display name
  const displayName = voice.name
    .replace(/^Microsoft\s+/i, '')
    .replace(/\s+Online\s+\(Natural\)/i, ' (Natural)')
    .replace(/Desktop/i, '')
    .trim();

  return {
    voice,
    category,
    displayName: `${displayName} (${category})`
  };
}

/**
 * Select a High-Fidelity Natural Voice for English or Hindi.
 */
export function getHighFidelityVoice(lang = 'en-US', preferredVoiceURI?: string | null): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  if (!voices || voices.length === 0) return null;

  if (preferredVoiceURI) {
    const match = voices.find((v) => v.voiceURI === preferredVoiceURI);
    if (match) return match;
  }

  const isHindi = lang.toLowerCase().startsWith('hi');
  const searchOrder = isHindi ? HINDI_VOICE_SEARCH_ORDER : ENGLISH_VOICE_SEARCH_ORDER;
  const langPrefix = isHindi ? 'hi' : 'en';

  const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  if (langVoices.length === 0) {
    return voices[0] || null;
  }

  for (const query of searchOrder) {
    const qLower = query.toLowerCase();
    const matched = langVoices.find((v) => 
      v.name.toLowerCase().includes(qLower) || 
      v.voiceURI.toLowerCase().includes(qLower)
    );
    if (matched) return matched;
  }

  const naturalFallback = langVoices.find((v) => {
    const n = v.name.toLowerCase();
    return n.includes("natural") || n.includes("online") || n.includes("google");
  });
  if (naturalFallback) return naturalFallback;

  return langVoices[0];
}

export function getBestVoice(lang = 'en-IN', preferredVoiceURI?: string | null): SpeechSynthesisVoice | null {
  const resolvedLang = (lang || 'en-IN').toLowerCase().startsWith('hi') ? 'hi-IN' : 'en-US';
  const voice = getHighFidelityVoice(resolvedLang, preferredVoiceURI);
  if (voice) return voice;
  return getAvailableVoices()[0] || null;
}

export const hindiVoiceMissing = false;

/**
 * Exam Text-to-Phonetics Pre-Processor
 * Converts math & grammar shorthand, acronyms, and formats punctuation pauses for natural breathing cadence.
 */
export function sanitizeExamTextForSpeech(text: string, lang = 'en'): string {
  if (!text) return '';

  let sanitized = text;

  // 1. Remove Markdown syntax
  sanitized = sanitized
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/`([^`]+)`/g, '$1');

  // 2. Math & Exponent Shorthand
  // ^2 -> "squared", ^3 -> "cubed", ^N -> "to the power N"
  sanitized = sanitized
    .replace(/\^2\b/g, ' squared ')
    .replace(/\^3\b/g, ' cubed ')
    .replace(/\^([0-9]+)/g, ' to the power $1 ');

  // 3. Grammar Shorthand
  // V3 -> "V-3 (past participle)"
  sanitized = sanitized.replace(/\bV3\b/g, 'V-3, past participle,');

  // 4. Exam Acronyms & Identifiers
  // Q1, Q2, etc. -> "Question 1" / "प्रश्न 1"
  if (lang.toLowerCase().startsWith('hi')) {
    sanitized = sanitized
      .replace(/\bQ([0-9]+)\b/gi, 'प्रश्न $1, ')
      .replace(/\bMCQ\b/gi, 'बहुविकल्पीय प्रश्न')
      .replace(/\bPwD\b/gi, 'दिव्यांगजन')
      .replace(/\bCBT\b/gi, 'कंप्यूटर आधारित परीक्षा');
  } else {
    sanitized = sanitized
      .replace(/\bQ([0-9]+)\b/gi, 'Question $1, ')
      .replace(/\bMCQ\b/gi, 'Multiple Choice Question')
      .replace(/\bPwD\b/gi, 'Persons with Disabilities')
      .replace(/\bCBT\b/gi, 'Computer Based Test');
  }

  // 5. Clean punctuation pauses: insert subtle commas after options and question headers for natural human breathing cadence
  sanitized = sanitized
    .replace(/\bOption\s+([A-D]):/gi, 'Option $1, ')
    .replace(/\bविकल्प\s+([A-Dए-डी]):/gi, 'विकल्प $1, ')
    .replace(/\bQuestion\s+([0-9]+):/gi, 'Question $1, ')
    .replace(/\bप्रश्न\s+([0-9]+):/gi, 'प्रश्न $1, ');

  // 6. Common abbreviations
  sanitized = sanitized
    .replace(/\be\.g\./gi, 'for example, ')
    .replace(/\bi\.e\./gi, 'that is, ')
    .replace(/\betc\./gi, 'etcetera. ')
    .replace(/\bapprox\./gi, 'approximately ')
    .replace(/\bvs\./gi, 'versus ')
    .replace(/\bEXAMSARTHI\b/gi, 'Exam Saarthi')
    .replace(/examsarthi/gi, 'Exam Saarthi');

  // Collapse excess whitespace
  return sanitized.replace(/\s+/g, ' ').trim();
}

export interface SpeakHighFidelityOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  voiceURI?: string | null;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Speaks text using the High-Fidelity Neural Voice Engine with phonetic pre-processing.
 */
export function speakHighFidelity(text: string, options: SpeakHighFidelityOptions = {}): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    if (options.onEnd) options.onEnd();
    return;
  }

  const store = useAccessibilityStore.getState();
  const lang = options.lang || (store.language === 'hi' ? 'hi-IN' : 'en-US');
  const preferredVoiceURI = options.voiceURI !== undefined ? options.voiceURI : store.selectedVoiceURI;
  const rate = options.rate !== undefined ? options.rate : (store.speechRate || 1.0);
  const pitch = options.pitch || 1.0;

  // 1. Cancel previous speech
  try {
    window.speechSynthesis.cancel();
  } catch (e) {}

  // 2. Pre-process text to natural phonetics
  const phoneticText = sanitizeExamTextForSpeech(text, lang);
  if (!phoneticText) {
    if (options.onEnd) options.onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(phoneticText);
  utterance.lang = lang;
  utterance.rate = Math.min(1.5, Math.max(0.7, rate));
  utterance.pitch = Math.min(1.3, Math.max(0.8, pitch));

  // 3. Assign prioritized neural voice
  const voice = getHighFidelityVoice(lang, preferredVoiceURI);
  if (voice) {
    utterance.voice = voice;
  }

  // 4. Global window anchor to eliminate Chromium garbage collection bug
  activeUtterance = utterance;
  (window as any).__highFidelityUtterance = utterance;

  const finish = () => {
    activeUtterance = null;
    (window as any).__highFidelityUtterance = null;
    if (options.onEnd) {
      options.onEnd();
    }
  };

  utterance.onstart = () => {
    if (options.onStart) options.onStart();
  };

  utterance.onend = finish;
  utterance.onerror = (e) => {
    console.warn('[SpeechSynthesis] Utterance error or interrupt:', e);
    if (options.onError) options.onError(e);
    finish();
  };

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('[SpeechSynthesis] speak error:', err);
    finish();
  }
}

/**
 * Cancel any ongoing speech synthesis immediately.
 */
export function stopHighFidelitySpeech(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch (e) {}
  activeUtterance = null;
  (window as any).__highFidelityUtterance = null;
}
