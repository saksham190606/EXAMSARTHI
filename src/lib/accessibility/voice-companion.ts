/**
 * EXAMSARTHI Audio Companion & Voice Navigation System
 *
 * Implements:
 * 1. Robust Initial Tab Key Welcome & Tagline (sessionStorage 'examsarthi_welcomed', uninterrupted)
 * 2. Bulletproof Speech Recognition Engine (continuous listening, auto-restart, error recovery, Alt+V toggle)
 * 3. Talk-Back Engine (clean focusin label announcements with zero queue stutter)
 * 4. High-tolerance Voice Command Mapping & Auditory Confirmations
 */

import { useAccessibilityStore } from "@/store/useAccessibilityStore";
import { parseSpokenIntent, playVoiceFeedbackChime } from "@/lib/voice/intent-parser";
import { startListening as globalStartListening, stopListening as globalStopListening } from "@/lib/voice/useVoiceEngine";
import { hasActiveContext, routeVoiceCommand } from "@/lib/voice/commandRouter";
import { matchExamTokens, matchExamVoiceRoute } from "@/lib/voice/exam-router";
import { isExamSessionActive } from "@/lib/assistant/sarthiExamLock";

/**
 * Formats text for natural speech synthesis pronunciation.
 * Replaces all variations of 'EXAMSARTHI' with 'Exam Saarthi' so the TTS engine
 * pronounces it phonetically as words instead of spelling it out letter-by-letter (E-X-A-M-S-A-R-T-H-I).
 */
export function formatSpeechPronunciation(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\bEXAMSARTHI\b/gi, "Exam Saarthi")
    .replace(/examsarthi/gi, "Exam Saarthi");
}

export const WELCOME_TOUR_TEXT_EN =
  "Welcome to Exam Saarthi, India's accessible examination and practice platform for visually impaired candidates. Would you like to log in to your account? Please say 'Login'.";

export const WELCOME_TOUR_TEXT_HI =
  "एग्जामसारथी में आपका स्वागत है। दृष्टिबाधित अभ्यर्थियों के लिए भारत का सुलभ परीक्षा और अभ्यास मंच। क्या आप लॉगिन करना चाहते हैं? कृपया 'लॉगिन' बोलें।";

export const WELCOME_TOUR_TEXT = WELCOME_TOUR_TEXT_EN;

export interface SpeakOptions {
  rate?: number;
  cancelPrevious?: boolean;
  lang?: string;
  langOverride?: string;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

// Global flag to prevent focus talk-back from interrupting the initial welcome tour
let isAnnouncingWelcome = false;

// Global tracker of last focused interactive element for conversational yes/no commands
let lastFocusedElement: HTMLElement | null = null;

/**
 * Checks whether Web Speech Synthesis is available in the current browser environment.
 */
export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Checks whether Web Speech Recognition is available in the current browser environment.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

// Prevent Chromium garbage collection bug where utterances are collected prematurely
let activeUtteranceRef: SpeechSynthesisUtterance | null = null;

/**
 * Unlocks the browser Web Audio context during a user gesture (Tab, Space, click).
 * Required by Chromium to allow AudioContext and SpeechSynthesis to play without being blocked.
 */
export function unlockAudioContext(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = (window as any).__examsarthiAudioCtx || new AudioCtx();
      (window as any).__examsarthiAudioCtx = ctx;

      if (ctx.state === "suspended") {
        ctx.resume();
      }
      // Play a 1ms inaudible buffer to activate browser audio hardware
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }
  } catch (err) {
    console.warn("[VoiceCompanion] AudioContext unlock error:", err);
  }
}

// Blacklisted male voice identifiers across all platforms/browsers
const MALE_VOICE_KEYWORDS = [
  "david", "mark", "george", "ravi", "hemant", "guy", "christopher", 
  "eric", "steffan", "daniel", "oliver", "arthur", "rishi", " male", 
  "(male)", "- male", "_male", " male ", "desktop david", "google uk english male",
  "ryan", "thomas", "james", "andrew", "brian", "william", "charles", "matthew",
  "fred", "ralph", "albert", "zarvox", "junior"
];

// Whitelisted/preferred female names and keywords
const FEMALE_VOICE_KEYWORDS = [
  "female", "woman", "zira", "jenny", "aria", "samantha", "victoria", 
  "karen", "swara", "kalpana", "heera", "neerja", "veena", "lekha", 
  "google us english", "google uk english female", "google हिन्दी", "hazel", "susan", 
  "catherine", "linda", "sonia", "natasha", "fiona", "tessa", "moira", "siri"
];

export function isMaleVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  // Ensure voices with "female" or "woman" in name are never flagged as male
  if (name.includes("female") || name.includes("woman")) return false;
  return MALE_VOICE_KEYWORDS.some(kw => name.includes(kw));
}

export function isFemaleVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  return FEMALE_VOICE_KEYWORDS.some(kw => name.includes(kw));
}

let cachedFemaleVoiceEn: SpeechSynthesisVoice | null = null;
let cachedFemaleVoiceHi: SpeechSynthesisVoice | null = null;

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      cachedFemaleVoiceEn = null;
      cachedFemaleVoiceHi = null;
      getNaturalFemaleVoice("en");
      getNaturalFemaleVoice("hi");
    });
  } catch (_) {}
}

/**
 * Selects a high-quality natural female voice across all browser platforms.
 * When Hindi (hi-IN) is active, prioritizes standard natural Hindi voices:
 * Google हिन्दी, Microsoft Swara / Heera (Natural), or any available hi-IN female voice.
 * When English is active, prioritizes natural female voices (Google US English, Microsoft Jenny/Aria/Zira).
 * Strictly blacklists all male voices (David, Mark, Ravi, Hemant, etc.).
 */
export function getNaturalFemaleVoice(langPref?: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  if (!voices || voices.length === 0) return null;

  const currentStoreLang = useAccessibilityStore.getState().language;
  const isHindi = langPref === "hi" || langPref?.toLowerCase().startsWith("hi") || (!langPref && currentStoreLang === "hi");

  // 1. If Hindi requested, find natural Hindi female voice
  if (isHindi) {
    if (cachedFemaleVoiceHi && voices.includes(cachedFemaleVoiceHi)) {
      return cachedFemaleVoiceHi;
    }

    const hindiVoices = voices.filter(v => v.lang.toLowerCase().startsWith("hi") && !isMaleVoice(v));
    
    // Priority: Google हिन्दी, Microsoft Swara / Heera (Natural), or any available hi-IN female voice
    const preferredHindi = 
      hindiVoices.find(v => v.name.includes("Google") || v.name.toLowerCase().includes("swara") || v.name.toLowerCase().includes("heera")) ||
      hindiVoices.find(v => !v.localService) ||
      hindiVoices.find(v => isFemaleVoice(v)) ||
      hindiVoices[0];

    if (preferredHindi) {
      cachedFemaleVoiceHi = preferredHindi;
      return preferredHindi;
    }

    // Fallback: Indian English female voice if Hindi TTS voice is missing on host OS
    const inFemale = voices.find(v => 
      v.lang.toLowerCase().startsWith("en-in") && !isMaleVoice(v) && isFemaleVoice(v)
    );
    if (inFemale) return inFemale;
  }

  // English requested
  if (!isHindi && cachedFemaleVoiceEn && voices.includes(cachedFemaleVoiceEn)) {
    return cachedFemaleVoiceEn;
  }

  // Priority 1: Exact natural voice used by initial welcome greeting in Chromium ("Google US English" / non-local en-US)
  const googleUS = voices.find(v => 
    !isMaleVoice(v) && 
    (v.name === "Google US English" || (v.lang === "en-US" && !v.localService))
  );
  if (googleUS) {
    if (!isHindi) cachedFemaleVoiceEn = googleUS;
    return googleUS;
  }

  // Priority 2: High-quality natural/online or desktop female voices (Edge / Windows: Jenny, Aria, Zira, etc.)
  const naturalFemale = voices.find(v => 
    !isMaleVoice(v) && 
    isFemaleVoice(v) && 
    v.lang.toLowerCase().startsWith("en")
  );
  if (naturalFemale) {
    if (!isHindi) cachedFemaleVoiceEn = naturalFemale;
    return naturalFemale;
  }

  // Priority 3: Any non-local (cloud/neural) English voice that is not male
  const cloudFemale = voices.find(v => 
    v.lang.toLowerCase().startsWith("en") && 
    !v.localService && 
    !isMaleVoice(v)
  );
  if (cloudFemale) {
    if (!isHindi) cachedFemaleVoiceEn = cloudFemale;
    return cloudFemale;
  }

  // Priority 4: Any English voice that is NOT in the male blacklist
  const nonMaleEnglish = voices.find(v => 
    v.lang.toLowerCase().startsWith("en") && 
    !isMaleVoice(v)
  );
  if (nonMaleEnglish) {
    if (!isHindi) cachedFemaleVoiceEn = nonMaleEnglish;
    return nonMaleEnglish;
  }

  // Priority 5: Any non-male voice of any language
  const nonMaleAny = voices.find(v => !isMaleVoice(v));
  if (nonMaleAny) {
    if (!isHindi) cachedFemaleVoiceEn = nonMaleAny;
    return nonMaleAny;
  }

  return voices[0] || null;
}

/**
 * Bulletproof Speech Helper that prevents stalled queues and waits for asynchronous voice loading in Chromium browsers.
 */
export function forceSpeak(text: string, onEnd?: () => void, lang?: string, onError?: (err: any) => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  if (useAccessibilityStore.getState().accessibilityMode === 'keyboard') {
    if (onEnd) onEnd();
    return;
  }

  // 1. Prime hardware audio
  unlockAudioContext();

  const synth = window.speechSynthesis;

  // 2. Unpause synth if stalled in Chrome
  if (synth.paused) {
    try {
      synth.resume();
    } catch (_) {}
  }

  // 3. Clear stuck queues
  try {
    synth.cancel();
  } catch (_) {}

  try {
    synth.resume();
  } catch (_) {}

  const play = () => {
    try {
      isAnnouncingWelcome = true;
      const store = useAccessibilityStore.getState();
      const rawTargetLang = lang || (store.language === "hi" ? "hi-IN" : "en-US");
      const targetLang = (rawTargetLang === "hi" || rawTargetLang.toLowerCase().startsWith("hi")) ? "hi-IN" : rawTargetLang;
      const spokenText = formatSpeechPronunciation(text);
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = targetLang;

      // Lock in the natural female voice
      const femaleVoice = getNaturalFemaleVoice(targetLang);
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      // Strong reference prevents Chromium GC from dropping speech
      activeUtteranceRef = utterance;
      if (typeof window !== "undefined") {
        (window as any).__activeUtterance = utterance;
      }

      utterance.onend = () => {
        isAnnouncingWelcome = false;
        activeUtteranceRef = null;
        if (typeof window !== "undefined") {
          (window as any).__activeUtterance = null;
        }
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        isAnnouncingWelcome = false;
        console.warn("[VoiceCompanion] Utterance error:", e);
        activeUtteranceRef = null;
        if (typeof window !== "undefined") {
          (window as any).__activeUtterance = null;
        }
        if (onError) onError(e);
        else if (onEnd) onEnd();
      };

      // Safeguard timeout to ensure isAnnouncingWelcome doesn't stay stuck forever
      setTimeout(() => {
        isAnnouncingWelcome = false;
      }, 15000);

      setTimeout(() => {
        try {
          synth.resume();
          synth.speak(utterance);
        } catch (err) {
          isAnnouncingWelcome = false;
          console.warn("[VoiceCompanion] synth.speak error:", err);
          if (onError) onError(err);
          else if (onEnd) onEnd();
        }
      }, 50);
    } catch (err) {
      isAnnouncingWelcome = false;
      console.warn("[VoiceCompanion] forceSpeak play error:", err);
      if (onError) onError(err);
      else if (onEnd) onEnd();
    }
  };

  const voices = synth.getVoices();
  if (voices.length === 0) {
    let triggered = false;
    synth.onvoiceschanged = () => {
      if (!triggered) {
        triggered = true;
        synth.onvoiceschanged = null;
        play();
      }
    };
    // Fallback if onvoiceschanged doesn't fire in 150ms
    setTimeout(() => {
      if (!triggered) {
        triggered = true;
        synth.onvoiceschanged = null;
        play();
      }
    }, 150);
  } else {
    play();
  }
}

/**
 * Cancels any pending or active speech output cleanly.
 */
export function stopSpeech(): void {
  // If the welcome greeting is actively announcing, do not abruptly kill it
  if (isAnnouncingWelcome) return;

  if (isSpeechSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn("[VoiceCompanion] Error canceling speech:", e);
    }
  }
}

/**
 * Speaks text using the browser's SpeechSynthesis engine.
 * Respects the user's speech rate preference from useAccessibilityStore (default 1.0).
 * Strictly locks in the natural female voice and eliminates male fallback.
 */
export function speak(text: string, options?: SpeakOptions): void {
  if (!isSpeechSupported() || !text || !text.trim()) return;

  if (useAccessibilityStore.getState().accessibilityMode === 'keyboard') {
    if (options?.onEnd) options.onEnd();
    return;
  }

  const { cancelPrevious = true, lang, langOverride, onEnd, onError } = options || {};

  if (cancelPrevious) {
    stopSpeech();
  }

  try {
    const store = useAccessibilityStore.getState();
    const rate = options?.rate ?? (store.speechRate || 1.0);

    const spokenText = formatSpeechPronunciation(text.trim());
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = Math.max(0.6, Math.min(2.0, rate));

    const effectiveLang = langOverride || lang;
    const rawTargetLang = effectiveLang || (store.language === "hi" ? "hi-IN" : "en-US");
    const targetLang = (rawTargetLang === "hi" || rawTargetLang.toLowerCase().startsWith("hi")) ? "hi-IN" : rawTargetLang;
    utterance.lang = targetLang;

    // Lock in the exact same natural female voice across the platform
    const femaleVoice = getNaturalFemaleVoice(targetLang);
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    // Strong reference prevents Chromium GC
    activeUtteranceRef = utterance;
    if (typeof window !== "undefined") {
      (window as any).__activeUtterance = utterance;
    }

    utterance.onend = () => {
      activeUtteranceRef = null;
      if (typeof window !== "undefined") {
        (window as any).__activeUtterance = null;
      }
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      activeUtteranceRef = null;
      if (typeof window !== "undefined") {
        (window as any).__activeUtterance = null;
      }
      if (onError) onError(e);
    };

    if (window.speechSynthesis.paused) {
      try {
        window.speechSynthesis.resume();
      } catch (_) {}
    }

    // If voices are still loading asynchronously in Chromium, wait up to 100ms for voiceschanged
    if (!femaleVoice && window.speechSynthesis.getVoices().length === 0) {
      let triggered = false;
      const onVoices = () => {
        if (!triggered) {
          triggered = true;
          window.speechSynthesis.removeEventListener?.("voiceschanged", onVoices);
          const resolved = getNaturalFemaleVoice(targetLang);
          if (resolved) {
            utterance.voice = resolved;
          }
          window.speechSynthesis.speak(utterance);
        }
      };
      window.speechSynthesis.addEventListener?.("voiceschanged", onVoices);
      setTimeout(() => {
        if (!triggered) {
          triggered = true;
          window.speechSynthesis.removeEventListener?.("voiceschanged", onVoices);
          const resolved = getNaturalFemaleVoice(targetLang);
          if (resolved) {
            utterance.voice = resolved;
          }
          window.speechSynthesis.speak(utterance);
        }
      }, 100);
      return;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("[VoiceCompanion] Speech synthesis error:", err);
  }
}

/**
 * Cleans extracted text by stripping SVG titles, scripts, styles, multiple whitespace, and CSS artifacts.
 */
export function cleanAccessibleText(text: string | null | undefined): string {
  if (!text) return "";
  const cleaned = text
    .replace(/<[^>]*>/g, " ") // Strip any stray HTML tags
    .replace(/[\r\n\t]+/g, " ") // Normalize newlines/tabs
    .replace(/\s{2,}/g, " ") // Collapse duplicate spaces
    .replace(/[•→←↑↓]/g, "") // Strip cosmetic arrow characters
    .trim();
  return formatSpeechPronunciation(cleaned);
}

/**
 * Extracts visible descriptive text from an element while ignoring decorative or hidden icons.
 */
function getDirectTextContent(element: Element): string {
  let text = "";
  element.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += " " + (node.textContent || "");
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (
        el.tagName.toLowerCase() === "svg" ||
        el.tagName.toLowerCase() === "style" ||
        el.tagName.toLowerCase() === "script" ||
        el.getAttribute("aria-hidden") === "true"
      ) {
        return;
      }
      text += " " + getDirectTextContent(el);
    }
  });
  return cleanAccessibleText(text);
}

/**
 * Extracts associated label text for an input/control element.
 */
function getAssociatedLabel(element: HTMLElement): string {
  // 1. Explicit aria-label
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel && cleanAccessibleText(ariaLabel)) {
    return cleanAccessibleText(ariaLabel);
  }

  // 2. aria-labelledby
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const ids = labelledBy.split(/\s+/);
    const textParts = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .map((el) => cleanAccessibleText(el?.textContent));
    if (textParts.length > 0) {
      return textParts.join(" ");
    }
  }

  // 3. <label htmlFor="...">
  if (element.id) {
    const labelEl = document.querySelector(`label[for="${element.id}"]`);
    if (labelEl) {
      const labelText = getDirectTextContent(labelEl);
      if (labelText) return labelText;
    }
  }

  // 4. Wrapping <label>
  const parentLabel = element.closest("label");
  if (parentLabel) {
    const labelText = getDirectTextContent(parentLabel);
    if (labelText) return labelText;
  }

  // 5. Placeholder
  const placeholder = (element as HTMLInputElement).placeholder;
  if (placeholder) {
    return cleanAccessibleText(placeholder);
  }

  // 6. Title attribute
  const title = element.getAttribute("title");
  if (title) return cleanAccessibleText(title);

  return "";
}

/**
 * Dedicated, strict Hindi Talk-Back Computer for Tab Navigation.
 * Guarantees that when Hindi mode is active, all element talk-backs speak strictly in Hindi.
 */
export function computeHindiTalkBack(target: HTMLElement): string | null {
  if (!target || typeof target.tagName !== "string") return null;

  const tagName = target.tagName.toUpperCase();
  const role = (target.getAttribute("role") || "").toLowerCase();
  const inputType = (target.getAttribute("type") || "").toLowerCase();
  const closestAnchor = target.tagName === "A" ? (target as HTMLAnchorElement) : target.closest("a");
  const hrefAttr = (closestAnchor?.getAttribute("href") || target.getAttribute("href") || "").trim();
  const anchorPathname = closestAnchor?.pathname || "";
  const ariaLabel = (target.getAttribute("aria-label") || closestAnchor?.getAttribute("aria-label") || "").trim();
  const text = cleanAccessibleText(target.textContent || "");

  // 0. Skip to main content link -> "मुख्य सामग्री पर जाएं, लिंक"
  if (
    hrefAttr === "#main-content" ||
    hrefAttr.includes("main-content") ||
    text.toLowerCase().includes("skip to main content")
  ) {
    return "मुख्य सामग्री पर जाएं, लिंक";
  }

  // 1. Logo / Home link -> "होम पेज, लिंक"
  const isHomeLink =
    Boolean(closestAnchor) &&
    (hrefAttr === "/" ||
      anchorPathname === "/" ||
      text.includes("EXAMSARTHI") ||
      ariaLabel.toLowerCase().includes("home") ||
      Boolean(target.closest('a[href="/"]')));

  if (isHomeLink) {
    return "होम पेज, लिंक";
  }

  // 2. Start Practice button -> "प्रैक्टिस शुरू करें, बटन"
  const isStartPractice =
    text.includes("प्रैक्टिस शुरू") ||
    text.toLowerCase().includes("start practice") ||
    ariaLabel.toLowerCase().includes("start practice") ||
    (hrefAttr === "/practice" && (text.toLowerCase().includes("start") || text.includes("शुरू") || text.includes("Alt+P")));

  if (isStartPractice) {
    return "प्रैक्टिस शुरू करें, बटन";
  }

  // 3. Take Mock Exam button -> "मॉक परीक्षा शुरू करें, बटन"
  const isTakeMock =
    text.includes("मॉक परीक्षा") ||
    text.includes("मॉक टेस्ट") ||
    text.toLowerCase().includes("take mock exam") ||
    text.toLowerCase().includes("mock exam") ||
    text.toLowerCase().includes("mock test") ||
    ariaLabel.toLowerCase().includes("take mock exam") ||
    ariaLabel.toLowerCase().includes("mock test");

  if (isTakeMock) {
    return "मॉक परीक्षा शुरू करें, बटन";
  }

  // 4. Main Nav Items (Dashboard, Practice, Exams, Results, Settings)
  // Dashboard -> "डैशबोर्ड, बटन"
  if (
    hrefAttr === "/dashboard" ||
    hrefAttr.endsWith("/dashboard") ||
    text.toLowerCase() === "dashboard" ||
    text === "डैशबोर्ड" ||
    ariaLabel.toLowerCase() === "dashboard" ||
    ariaLabel === "डैशबोर्ड"
  ) {
    return "डैशबोर्ड, बटन";
  }

  // Practice nav link -> "प्रैक्टिस, बटन"
  if (
    (hrefAttr === "/practice" ||
      hrefAttr.endsWith("/practice") ||
      text.toLowerCase() === "practice" ||
      text === "अभ्यास" ||
      text === "प्रैक्टिस" ||
      ariaLabel.toLowerCase() === "practice" ||
      ariaLabel === "अभ्यास" ||
      ariaLabel === "प्रैक्टिस") &&
    !isStartPractice
  ) {
    return "प्रैक्टिस, बटन";
  }

  // Exams nav link -> "परीक्षा, बटन"
  if (
    (hrefAttr === "/exam" ||
      hrefAttr.endsWith("/exam") ||
      hrefAttr.endsWith("/exams") ||
      text.toLowerCase() === "exams" ||
      text.toLowerCase() === "exam" ||
      text === "परीक्षा" ||
      ariaLabel.toLowerCase() === "exams" ||
      ariaLabel.toLowerCase() === "exam" ||
      ariaLabel === "परीक्षा") &&
    !isTakeMock
  ) {
    return "परीक्षा, बटन";
  }

  // Results nav link -> "परिणाम, बटन"
  if (
    hrefAttr === "/results" ||
    hrefAttr.endsWith("/results") ||
    text.toLowerCase() === "results" ||
    text.toLowerCase() === "result" ||
    text === "परिणाम" ||
    ariaLabel.toLowerCase() === "results" ||
    ariaLabel === "परिणाम"
  ) {
    return "परिणाम, बटन";
  }

  // Settings nav link -> "सेटिंग्स, बटन"
  if (
    hrefAttr === "/settings" ||
    hrefAttr.endsWith("/settings") ||
    text.toLowerCase() === "settings" ||
    text.toLowerCase() === "setting" ||
    text === "सेटिंग्स" ||
    ariaLabel.toLowerCase() === "settings" ||
    ariaLabel === "सेटिंग्स"
  ) {
    return "सेटिंग्स, बटन";
  }

  // 5. Describe Diagram -> "चित्र का विवरण सुनें, शॉर्टकट ऑल्ट डी"
  const isDescribeDiagram =
    ariaLabel.includes("चित्र का विवरण") ||
    ariaLabel.toLowerCase().includes("describe diagram") ||
    text.includes("चित्र का विवरण") ||
    text.toLowerCase().includes("describe diagram") ||
    Boolean(target.closest('[aria-label*="Describe diagram" i]')) ||
    Boolean(target.closest('[aria-label*="चित्र का विवरण" i]'));

  if (isDescribeDiagram) {
    return "चित्र का विवरण सुनें, शॉर्टकट ऑल्ट डी";
  }

  // 6. Stop Audio -> "ऑडियो रोकें, बटन"
  const isStopAudio =
    text.includes("ऑडियो रोकें") ||
    text.toLowerCase().includes("stop audio") ||
    ariaLabel.includes("ऑडियो रोकें") ||
    ariaLabel.toLowerCase().includes("stop audio") ||
    ariaLabel.toLowerCase().includes("stop reading");

  if (isStopAudio) {
    return "ऑडियो रोकें, बटन";
  }

  // 7. Close -> "बंद करें, बटन"
  const isClose =
    text === "Close" ||
    text === "बंद करें" ||
    text === "Cancel" ||
    text === "रद्द करें" ||
    ariaLabel.toLowerCase() === "close" ||
    ariaLabel.toLowerCase().includes("close modal") ||
    ariaLabel.toLowerCase().includes("close dialog") ||
    ariaLabel.includes("बंद करें") ||
    Boolean(target.querySelector("svg.lucide-x")) ||
    target.classList.contains("lucide-x") ||
    Boolean(target.closest('button[aria-label*="close" i]'));

  if (isClose) {
    return "बंद करें, बटन";
  }

  // 8. Next Question -> "अगला प्रश्न, बटन"
  const isNext =
    text === "Next" ||
    text === "अगला" ||
    text.includes("अगला प्रश्न") ||
    text.toLowerCase().includes("next question") ||
    ariaLabel.toLowerCase().includes("next question") ||
    ariaLabel.toLowerCase().includes("go to next question") ||
    target.getAttribute("data-action") === "next" ||
    Boolean(target.querySelector("svg.lucide-chevron-right"));

  if (isNext && (tagName === "BUTTON" || role === "button" || tagName === "A")) {
    return "अगला प्रश्न, बटन";
  }

  // 9. Previous Question -> "पिछला प्रश्न, बटन"
  const isPrev =
    text === "Previous" ||
    text === "पिछला" ||
    text.includes("पिछला प्रश्न") ||
    text.toLowerCase().includes("previous question") ||
    ariaLabel.toLowerCase().includes("previous question") ||
    ariaLabel.toLowerCase().includes("go to previous question") ||
    target.getAttribute("data-action") === "prev" ||
    Boolean(target.querySelector("svg.lucide-chevron-left"));

  if (isPrev && (tagName === "BUTTON" || role === "button" || tagName === "A")) {
    return "पिछला प्रश्न, बटन";
  }

  // 10. Submit Exam -> "परीक्षा जमा करें, बटन"
  const isSubmit =
    text.includes("Submit Exam") ||
    text.includes("Submit Final") ||
    text.includes("परीक्षा जमा") ||
    text.includes("सबमिट करें") ||
    text.includes("अंतिम परीक्षा सबमिट") ||
    text === "Submit" ||
    text === "सबमिट" ||
    ariaLabel.toLowerCase().includes("submit exam") ||
    ariaLabel.toLowerCase().includes("submit test") ||
    ariaLabel.toLowerCase().includes("submit final");

  if (isSubmit && (tagName === "BUTTON" || role === "button")) {
    return "परीक्षा जमा करें, बटन";
  }

  // 11. Clear Response -> "उत्तर हटाएं, बटन"
  const isClear =
    text.includes("उत्तर हटाएं") ||
    text.includes("उत्तर हटाओ") ||
    text.toLowerCase().includes("clear response") ||
    text.toLowerCase().includes("clear answer") ||
    ariaLabel.toLowerCase().includes("clear response") ||
    ariaLabel.toLowerCase().includes("clear answer");

  if (isClear && (tagName === "BUTTON" || role === "button")) {
    return "उत्तर हटाएं, बटन";
  }

  // 12. Review / Flag Question -> "समीक्षा के लिए चिह्नित करें, बटन"
  const isFlag =
    text.includes("चिह्नित") ||
    text.includes("समीक्षा") ||
    text.toLowerCase().includes("flag") ||
    text.toLowerCase().includes("review") ||
    ariaLabel.toLowerCase().includes("flag") ||
    ariaLabel.toLowerCase().includes("review") ||
    Boolean(target.querySelector("svg.lucide-flag"));

  if (isFlag && (tagName === "BUTTON" || role === "button")) {
    const isPressed = target.getAttribute("aria-pressed") === "true";
    return isPressed ? "समीक्षा के लिए चिह्नित, बटन" : "समीक्षा के लिए चिह्नित करें, बटन";
  }

  // 13. Question Number -> "प्रश्न संख्या [N]"
  const qNumMatch =
    ariaLabel.match(/(?:Question|Q|प्रश्न|सवाल)\s*(\d+)/i) ||
    text.match(/^(?:Question|Q|प्रश्न|सवाल)\s*(\d+)$/i) ||
    target.getAttribute("data-question-number")?.match(/(\d+)/);

  if (qNumMatch && qNumMatch[1]) {
    const isAnswered = ariaLabel.includes("answered") && !ariaLabel.includes("unanswered");
    const isFlagged = ariaLabel.includes("flagged");
    let stateSuffix = "";
    if (isAnswered && isFlagged) stateSuffix = ", उत्तर दिया गया व समीक्षा के लिए चिह्नित";
    else if (isAnswered) stateSuffix = ", उत्तर दिया गया";
    else if (isFlagged) stateSuffix = ", समीक्षा के लिए चिह्नित";
    else if (ariaLabel.includes("unanswered")) stateSuffix = ", उत्तर नहीं दिया गया";

    return `प्रश्न संख्या ${qNumMatch[1]}${stateSuffix}`;
  }

  // 14. Option A/B/C/D -> "विकल्प [A/B/C/D]: [विकल्प का पाठ]"
  const isRadio =
    (tagName === "INPUT" && inputType === "radio") ||
    role === "radio" ||
    Boolean(target.closest('[role="radiogroup"] [role="radio"]')) ||
    Boolean(target.closest('[role="radiogroup"] input[type="radio"]'));

  if (isRadio) {
    const isChecked =
      (target as HTMLInputElement).checked ||
      target.getAttribute("aria-checked") === "true" ||
      target.dataset.state === "checked";

    const optionContainer =
      target.closest('div[class*="flex items-center"], label, fieldset > div') ||
      target.parentElement;

    let optionLetter = "";
    let optionText = "";

    if (optionContainer) {
      const letterSpans = Array.from(optionContainer.querySelectorAll("span"));
      for (const span of letterSpans) {
        const spanText = span.textContent?.trim() || "";
        if (/^[A-D]$/i.test(spanText)) {
          optionLetter = spanText.toUpperCase();
          break;
        }
      }

      if (!optionLetter && optionContainer.parentElement) {
        const allRadios = Array.from(
          optionContainer.parentElement.querySelectorAll(
            'input[type="radio"], [role="radio"]'
          )
        );
        const idx = allRadios.indexOf(target);
        if (idx >= 0 && idx < 26) {
          optionLetter = String.fromCharCode(65 + idx);
        }
      }

      const textElement =
        optionContainer.querySelector(".text-foreground, label span:not([aria-hidden='true'])") ||
        optionContainer;
      optionText = cleanAccessibleText(textElement.textContent || "");

      if (optionLetter) {
        optionText = optionText.replace(new RegExp(`^${optionLetter}\\s*`, "i"), "");
      }
    }

    if (!optionLetter) optionLetter = "A";
    if (!optionText) optionText = getAssociatedLabel(target) || "विकल्प";

    const cleanText = localizeTalkBackText(optionText, true);
    const checkedSuffix = isChecked ? ", चुना गया" : "";
    return `विकल्प ${optionLetter}: ${cleanText}${checkedSuffix}`;
  }

  // 15. Language Toggle Button (Alt+L)
  if (
    (text.includes("EN") && text.includes("HI")) ||
    ariaLabel.includes("Switch language") ||
    ariaLabel.includes("वर्तमान भाषा")
  ) {
    return "भाषा बदलें, बटन";
  }

  // 16. Voice Command Mic Button (Alt+V)
  if (
    ariaLabel.includes("Voice commands") ||
    ariaLabel.includes("voice navigation") ||
    ariaLabel.includes("voice examination") ||
    text.includes("आवाज मोड") ||
    text.includes("वॉइस मोड") ||
    text.toLowerCase().includes("voice mode") ||
    Boolean(target.querySelector("svg.lucide-mic")) ||
    Boolean(target.querySelector("svg.lucide-mic-off"))
  ) {
    return "वॉइस कमांड, बटन";
  }

  // 17. Accessibility Settings Trigger
  if (
    ariaLabel.includes("Accessibility") ||
    text.includes("Accessibility") ||
    Boolean(target.querySelector("svg.lucide-settings-2")) ||
    Boolean(target.querySelector("svg.lucide-sliders"))
  ) {
    return "सुलभता सेटिंग्स, बटन";
  }

  // 18. User Menu / Sign Out / Log In
  if (ariaLabel.includes("User account") || ariaLabel.includes("उपयोगकर्ता")) {
    return "उपयोगकर्ता खाता, मेनू";
  }
  if (text === "Sign Out" || ariaLabel.includes("Sign out")) {
    return "लॉग आउट, बटन";
  }
  if (text === "Log In" || hrefAttr.endsWith("/login")) {
    return "लॉग इन, बटन";
  }

  // 19. Checkboxes
  const isCheckbox = (tagName === "INPUT" && inputType === "checkbox") || role === "checkbox";
  if (isCheckbox) {
    const isChecked =
      (target as HTMLInputElement).checked ||
      target.getAttribute("aria-checked") === "true" ||
      target.dataset.state === "checked";
    const label = getAssociatedLabel(target) || text || "चेकबॉक्स";
    return `${localizeTalkBackText(label, true)}, चेकबॉक्स, ${isChecked ? "चिह्नित" : "नहीं चिह्नित"}`;
  }

  // 20. Text Inputs & Textareas
  const isTextInput =
    (tagName === "INPUT" && !["button", "submit", "reset", "radio", "checkbox", "hidden"].includes(inputType)) ||
    tagName === "TEXTAREA";
  if (isTextInput) {
    const label = getAssociatedLabel(target) || ariaLabel || "टेक्स्ट इनपुट";
    const value = (target as HTMLInputElement).value?.trim();
    return `${localizeTalkBackText(label, true)}, टेक्स्ट इनपुट, वर्तमान मान: ${value || "खाली"}`;
  }

  // 21. Switches / Toggles
  if (role === "switch") {
    const isChecked = target.getAttribute("aria-checked") === "true" || target.dataset.state === "checked";
    const label = getAssociatedLabel(target) || text || ariaLabel || "स्विच";
    return `${localizeTalkBackText(label, true)}, स्विच, ${isChecked ? "चालू" : "बंद"}`;
  }

  // 22. Tabs
  if (role === "tab") {
    const isSelected = target.getAttribute("aria-selected") === "true" || target.dataset.state === "active";
    const label = getAssociatedLabel(target) || text || ariaLabel || "टैब";
    return `${localizeTalkBackText(label, true)}, टैब, ${isSelected ? "सक्रिय" : "निष्क्रिय"}`;
  }

  // 23. Generic Button / Link / Dropdown
  const isBtn = tagName === "BUTTON" || role === "button";
  if (isBtn) {
    const rawLabel = ariaLabel || text || getAssociatedLabel(target);
    if (!rawLabel) return null;
    return `${localizeTalkBackText(rawLabel, true)}, बटन`;
  }

  const isLnk = tagName === "A" || role === "link";
  if (isLnk) {
    const rawLabel = ariaLabel || text || target.getAttribute("title");
    if (!rawLabel) return null;
    return `${localizeTalkBackText(rawLabel, true)}, लिंक`;
  }

  if (tagName === "SELECT" || role === "combobox") {
    const rawLabel = getAssociatedLabel(target) || text || ariaLabel || "ड्रॉपडाउन मेनू";
    return `${localizeTalkBackText(rawLabel, true)}, ड्रॉपडाउन मेनू`;
  }

  if (ariaLabel) {
    return localizeTalkBackText(ariaLabel, true);
  }

  if (text) {
    return localizeTalkBackText(text, true);
  }

  return null;
}

/**
 * Computes an accessible talk-back label for focused elements.
 */
export function computeAccessibleLabel(target: HTMLElement): string | null {
  if (!target || typeof target.tagName !== "string") return null;

  const isHi = useAccessibilityStore.getState().language === "hi";
  if (isHi) {
    const hindiResult = computeHindiTalkBack(target);
    if (hindiResult) return hindiResult;
  }

  const wrap = (val: string | null): string | null => (val && isHi ? localizeTalkBackText(val, true) : val);

  const tagName = target.tagName.toUpperCase();
  const role = (target.getAttribute("role") || "").toLowerCase();
  const inputType = (target.getAttribute("type") || "").toLowerCase();

  // 1. MULTIPLE-CHOICE RADIO OPTIONS (Exams / Practice Questions)
  const isRadio =
    (tagName === "INPUT" && inputType === "radio") ||
    role === "radio" ||
    Boolean(target.closest('[role="radiogroup"] [role="radio"]')) ||
    Boolean(target.closest('[role="radiogroup"] input[type="radio"]'));

  if (isRadio) {
    const isChecked =
      (target as HTMLInputElement).checked ||
      target.getAttribute("aria-checked") === "true" ||
      target.dataset.state === "checked";

    const optionContainer =
      target.closest('div[class*="flex items-center"], label, fieldset > div') ||
      target.parentElement;

    let optionLetter = "";
    let optionText = "";

    if (optionContainer) {
      const letterSpans = Array.from(optionContainer.querySelectorAll("span"));
      for (const span of letterSpans) {
        const text = span.textContent?.trim() || "";
        if (/^[A-D]$/i.test(text)) {
          optionLetter = text.toUpperCase();
          break;
        }
      }

      if (!optionLetter && optionContainer.parentElement) {
        const allRadios = Array.from(
          optionContainer.parentElement.querySelectorAll(
            'input[type="radio"], [role="radio"]'
          )
        );
        const idx = allRadios.indexOf(target);
        if (idx >= 0 && idx < 26) {
          optionLetter = String.fromCharCode(65 + idx);
        }
      }

      const textElement =
        optionContainer.querySelector(".text-foreground, label span:not([aria-hidden='true'])") ||
        optionContainer;
      optionText = cleanAccessibleText(textElement.textContent || "");

      if (optionLetter) {
        optionText = optionText.replace(new RegExp(`^${optionLetter}\\s*`, "i"), "");
      }
    }

    if (!optionLetter) optionLetter = "A";
    if (!optionText) optionText = getAssociatedLabel(target) || "Option choice";

    return wrap(`Option ${optionLetter}, ${optionText}, ${isChecked ? "selected" : "not selected"}`);
  }

  // 2. CHECKBOXES
  const isCheckbox =
    (tagName === "INPUT" && inputType === "checkbox") ||
    role === "checkbox";

  if (isCheckbox) {
    const isChecked =
      (target as HTMLInputElement).checked ||
      target.getAttribute("aria-checked") === "true" ||
      target.dataset.state === "checked";
    const label = getAssociatedLabel(target) || "Checkbox option";
    return wrap(`${label}, checkbox, ${isChecked ? "checked" : "not checked"}`);
  }

  // 3. TEXT INPUTS & TEXTAREAS
  const isTextInput =
    (tagName === "INPUT" &&
      !["button", "submit", "reset", "radio", "checkbox", "hidden"].includes(
        inputType
      )) ||
    tagName === "TEXTAREA";

  if (isTextInput) {
    const label = getAssociatedLabel(target) || "Text field";
    const value = (target as HTMLInputElement).value?.trim();
    return wrap(`${label}, text input, current value: ${value || "empty"}`);
  }

  // 4. BUTTONS & ACCESSIBLE TRIGGERS
  const isButton = tagName === "BUTTON" || role === "button";
  if (isButton) {
    if (role === "switch") {
      const isChecked =
        target.getAttribute("aria-checked") === "true" ||
        target.dataset.state === "checked";
      const label = getAssociatedLabel(target) || cleanAccessibleText(target.textContent);
      return wrap(`${label}, toggle switch, ${isChecked ? "on" : "off"}`);
    }

    if (role === "tab") {
      const isSelected =
        target.getAttribute("aria-selected") === "true" ||
        target.dataset.state === "active";
      const label = getAssociatedLabel(target) || cleanAccessibleText(target.textContent);
      return wrap(`${label}, tab, ${isSelected ? "selected" : "not selected"}`);
    }

    const label =
      target.getAttribute("aria-label") ||
      cleanAccessibleText(target.textContent) ||
      getAssociatedLabel(target);

    if (!label) return null;
    return wrap(`${label}, button`);
  }

  // 5. LINKS & NAVIGATION
  const isLink = tagName === "A" || role === "link";
  if (isLink) {
    const label =
      target.getAttribute("aria-label") ||
      cleanAccessibleText(target.textContent) ||
      target.getAttribute("title");

    if (!label) return null;
    return wrap(`${label}, navigation link`);
  }

  // 6. SELECT / COMBOBOX
  if (tagName === "SELECT" || role === "combobox") {
    const label = getAssociatedLabel(target) || cleanAccessibleText(target.textContent);
    return wrap(`${label}, dropdown selection`);
  }

  // 7. LANDMARKS & REGIONS with explicit labels
  const ariaLabel = target.getAttribute("aria-label");
  if (ariaLabel && cleanAccessibleText(ariaLabel)) {
    const clean = cleanAccessibleText(ariaLabel);
    if (role) {
      return wrap(`${clean}, ${role}`);
    }
    return wrap(clean);
  }

  return null;
}

export function localizeTalkBackText(text: string | null | undefined, isHi: boolean): string {
  if (!text) return "";
  if (!isHi) return text;
  return text
    .replace(/\bStaff Selection Commission\b/gi, "कर्मचारी चयन आयोग")
    .replace(/\bUnion Public Service Commission\b/gi, "संघ लोक सेवा आयोग")
    .replace(/\bRailway Recruitment Board\b/gi, "रेलवे भर्ती बोर्ड")
    .replace(/\bInstitute of Banking Personnel Selection\b/gi, "बैंकिंग कार्मिक चयन संस्थान")
    .replace(/\bBanking Personnel Selection\b/gi, "बैंकिंग कार्मिक चयन")
    .replace(/\bSSC CGL\b/gi, "एसएससी सीजीएल")
    .replace(/\bUPSC Civil Services\b/gi, "संघ लोक सेवा आयोग सिविल सेवा")
    .replace(/\bIBPS Banking\b/gi, "आईबीपीएस बैंकिंग")
    .replace(/\bRRB NTPC\b/gi, "आरआरबी एनटीपीसी")
    .replace(/\bQuantitative Aptitude\b/gi, "मात्रात्मक योग्यता")
    .replace(/\bGeneral Intelligence\b/gi, "सामान्य बुद्धि")
    .replace(/\bGeneral Awareness\b/gi, "सामान्य जागरूकता")
    .replace(/\bReasoning\b/gi, "तर्कशक्ति")
    .replace(/\bMathematics\b/gi, "गणित")
    .replace(/\bPolity\b/gi, "राजव्यवस्था")
    .replace(/\bHistory\b/gi, "इतिहास")
    .replace(/\bEconomy\b/gi, "अर्थव्यवस्था")
    .replace(/\bScience\b/gi, "विज्ञान")
    .replace(/\bGeometry\b/gi, "ज्यामिति")
    .replace(/\bCircuits\b/gi, "परिपथ")
    .replace(/\bBar Charts\b/gi, "बार चार्ट")
    .replace(/\bFlowcharts\b/gi, "फ्लोचार्ट")
    .replace(/\bSectional Timers\b/gi, "अनुभागीय टाइमर")
    .replace(/\bVision AI Enabled\b/gi, "विजन एआई सक्षम")
    .replace(/\bVision AI Scribe Enabled\b/gi, "विजन एआई स्क्राइब सक्षम")
    .replace(/\bFull Mock\b/gi, "संपूर्ण मॉक")
    .replace(/\bSpeed Mock\b/gi, "स्पीड मॉक")
    .replace(/\bPrelims\b/gi, "प्रारंभिक परीक्षा")
    .replace(/\bStart Practice\b/gi, "प्रैक्टिस शुरू करें")
    .replace(/\bTake Mock Exam\b/gi, "मॉक परीक्षा शुरू करें")
    .replace(/\bSelect Examination Mock\b/gi, "मॉक परीक्षा चुनें")
    .replace(/\bDashboard\b/gi, "डैशबोर्ड")
    .replace(/\bPractice\b/gi, "प्रैक्टिस")
    .replace(/\bExams\b/gi, "परीक्षा")
    .replace(/\bResults\b/gi, "परिणाम")
    .replace(/\bSettings\b/gi, "सेटिंग्स")
    .replace(/\bNext Question\b/gi, "अगला प्रश्न")
    .replace(/\bPrevious Question\b/gi, "पिछला प्रश्न")
    .replace(/\bClear Response\b/gi, "उत्तर हटाएं")
    .replace(/\bClear Answer\b/gi, "उत्तर हटाएं")
    .replace(/\bSubmit Final Examination\b/gi, "अंतिम परीक्षा सबमिट करें")
    .replace(/\bSubmit Exam\b/gi, "परीक्षा जमा करें")
    .replace(/\bDescribe Diagram\b/gi, "चित्र का विवरण")
    .replace(/\bStop Audio\b/gi, "ऑडियो रोकें")
    .replace(/\bStop reading\b/gi, "पढ़ना रोकें")
    .replace(/\bSign Out\b/gi, "लॉग आउट")
    .replace(/\bLog In\b/gi, "लॉग इन")
    .replace(/\bClose\b/gi, "बंद करें")
    .replace(/\bNext\b/gi, "अगला")
    .replace(/\bPrevious\b/gi, "पिछला")
    .replace(/\bSubmit\b/gi, "जमा करें")
    .replace(/\bClear\b/gi, "हटाएं")
    .replace(/\bOption\b/gi, "विकल्प")
    .replace(/\bQuestion\b/gi, "प्रश्न")
    .replace(/\bselected\b/gi, "चुना गया")
    .replace(/\bnot selected\b/gi, "नहीं चुना गया")
    .replace(/\bchecked\b/gi, "चिह्नित")
    .replace(/\bnot checked\b/gi, "नहीं चिह्नित")
    .replace(/\bbutton\b/gi, "बटन")
    .replace(/\blink\b/gi, "लिंक")
    .replace(/\bnavigation link\b/gi, "लिंक")
    .replace(/\bcheckbox\b/gi, "चेकबॉक्स")
    .replace(/\btext input\b/gi, "टेक्स्ट इनपुट")
    .replace(/\bdropdown selection\b/gi, "ड्रॉपडाउन")
    .replace(/\bdropdown\b/gi, "ड्रॉपडाउन")
    .replace(/\btoggle switch\b/gi, "स्विच")
    .replace(/\bswitch\b/gi, "स्विच")
    .replace(/\btab\b/gi, "टैब")
    .replace(/\bactive\b/gi, "सक्रिय")
    .replace(/\binactive\b/gi, "निष्क्रिय")
    .replace(/\bempty\b/gi, "खाली")
    .replace(/\bcurrent value\b/gi, "वर्तमान मान")
    .replace(/\bSingle Choice\b/gi, "एकल विकल्प")
    .replace(/\bMultiple Choice\b/gi, "बहुविकल्प")
    .replace(/\bTrue \/ False\b/gi, "सत्य या असत्य")
    .replace(/\bShort Answer\b/gi, "संक्षिप्त उत्तर")
    .replace(/\bFill in the Blank\b/gi, "रिक्त स्थान भरें")
    .replace(/\bunanswered\b/gi, "उत्तर नहीं दिया गया")
    .replace(/\banswered\b/gi, "उत्तर दिया गया")
    .replace(/\bflagged for review\b/gi, "समीक्षा के लिए चिह्नित")
    .replace(/\bmarked for review\b/gi, "समीक्षा के लिए चिह्नित")
    .replace(/\bflagged\b/gi, "चिह्नित")
    .replace(/\bReview flag removed\b/gi, "समीक्षा चिह्न हटाया गया")
    .replace(/\bQuestion flagged for review\b/gi, "प्रश्न समीक्षा के लिए चिह्नित")
    .replace(/\bExamination Selection Hub\b/gi, "परीक्षा चयन केंद्र")
    .replace(/\bSearch practice topics by keyword\? Say Yes to focus search, or say No to skip\./gi, "कीवर्ड द्वारा प्रैक्टिस विषय खोजें? फोकस करने के लिए हाँ कहें, या छोड़ने के लिए नहीं कहें।")
    .replace(/\bSearch practice topics by keyword\b/gi, "कीवर्ड द्वारा प्रैक्टिस विषय खोजें")
    .replace(/\bSearch field focused\b/gi, "खोज फ़ील्ड केंद्रित")
    .replace(/\bSay Yes to proceed, or say No to skip\b/gi, "आगे बढ़ने के लिए हाँ कहें, या छोड़ने के लिए नहीं कहें")
    .replace(/\bVoice commands\b/gi, "वॉइस कमांड")
    .replace(/\bAccessibility settings\b/gi, "सुलभता सेटिंग्स")
    .replace(/\bSwitch language\b/gi, "भाषा बदलें")
    .replace(/\bmins limit\b/gi, "मिनट सीमा")
    .replace(/\bmin limit\b/gi, "मिनट सीमा")
    .replace(/\bmins\b/gi, "मिनट")
    .replace(/\bmin\b/gi, "मिनट")
    .replace(/\bseconds\b/gi, "सेकंड")
    .replace(/\bsecs\b/gi, "सेकंड");
}

/**
 * Bulletproof Voice Command Router & Speech Recognition Engine
 */
class VoiceNavigationEngine {
  private routerNavigate: ((path: string) => void) | null = null;
  private isListeningExplicitly = false;
  private isSpeakingFeedback = false;

  public setRouter(navigate: (path: string) => void) {
    this.routerNavigate = navigate;
  }

  public navigate(path: string, confirmationText: string) {
    playVoiceFeedbackChime();
    this.isSpeakingFeedback = true;

    let hasNavigated = false;
    const doNavigate = () => {
      if (hasNavigated) return;
      hasNavigated = true;
      if (this.routerNavigate) {
        this.routerNavigate(path);
      } else if (typeof window !== "undefined") {
        window.location.href = path;
      }
      setTimeout(() => {
        this.isSpeakingFeedback = false;
        if (this.isListeningExplicitly) {
          const store = useAccessibilityStore.getState();
          const lang = store.language === "hi" ? "hi-IN" : "en-US";
          globalStartListening(lang, (t) => this.processCommand(t));
        }
      }, 300);
    };

    speak(confirmationText, {
      onEnd: doNavigate,
      onError: doNavigate,
    });

    // Guaranteed fallback: navigate after 1000ms even if TTS is muted/delayed
    setTimeout(doNavigate, 1000);
  }

  public advanceFocusToNextElement() {
    if (typeof document === "undefined") return;

    const focusableElements = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => {
      return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
    });

    const current = (document.activeElement && document.activeElement !== document.body
      ? document.activeElement
      : lastFocusedElement) as HTMLElement | null;

    const currentIndex = current
      ? focusableElements.findIndex((el) => el === current || el.contains(current) || current.contains(el))
      : -1;

    if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
      focusableElements[currentIndex + 1].focus();
    } else if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  public init() {
    // Managed centrally by singleton useVoiceEngine
  }

  public setLanguage(lang: 'en' | 'hi') {
    if (this.isListeningExplicitly) {
      const newLang = lang === "hi" ? "hi-IN" : "en-US";
      globalStartListening(newLang, (t) => this.processCommand(t));
    }
  }

  public switchLanguage(lang: 'en' | 'hi') {
    const store = useAccessibilityStore.getState();
    store.setLanguage(lang);
    this.setLanguage(lang);

    if (lang === "hi") {
      speak("भाषा हिंदी में बदल दी गई है। अब आप हिंदी में नेविगेट कर सकते हैं।", { langOverride: "hi-IN" });
    } else {
      speak("Language switched to English.", { langOverride: "en-US" });
    }
  }

  public toggle(forceState?: boolean): boolean {
    if (useAccessibilityStore.getState().accessibilityMode === 'keyboard') {
      return false;
    }
    const isHi = useAccessibilityStore.getState().language === "hi";

    if (!isSpeechRecognitionSupported()) {
      speak(
        isHi
          ? "इस ब्राउज़र में आवाज पहचान समर्थित नहीं है। कृपया Chrome या Edge का उपयोग करें।"
          : "Speech recognition is not supported in this browser. Please use Chrome or Edge."
      );
      return false;
    }

    const shouldListen = forceState ?? !this.isListeningExplicitly;

    if (shouldListen) {
      this.isListeningExplicitly = true;
      useAccessibilityStore.getState().setIsListeningCommands(true);
      const store = useAccessibilityStore.getState();
      const lang = store.language === "hi" ? "hi-IN" : "en-US";
      globalStartListening(lang, (t) => this.processCommand(t));
      return true;
    } else {
      this.isListeningExplicitly = false;
      useAccessibilityStore.getState().setIsListeningCommands(false);
      globalStopListening();
      speak(
        isHi
          ? "वॉइस कमांड पहचान रोक दी गई है।"
          : "Voice command recognition paused."
      );
      return false;
    }
  }

  public startAlwaysOnListening(): void {
    if (!isSpeechRecognitionSupported()) return;
    if (useAccessibilityStore.getState().accessibilityMode === 'keyboard') {
      this.isListeningExplicitly = false;
      return;
    }
    this.isListeningExplicitly = true;
    useAccessibilityStore.getState().setIsListeningCommands(true);
    const store = useAccessibilityStore.getState();
    const lang = store.language === "hi" ? "hi-IN" : "en-US";
    globalStartListening(lang, (t) => this.processCommand(t));
  }

  public stopListening(): void {
    this.isListeningExplicitly = false;
    useAccessibilityStore.getState().setIsListeningCommands(false);
    globalStopListening();
  }

  public stop(): void {
    this.stopListening();
  }

  public async processCommand(rawInput: string) {
    if (!rawInput || !rawInput.trim()) return;

    // Isolate login page: login page has its own dedicated voice state machine.
    // Never run global companion commands or speak the "You can say Dashboard..." fallback on login page.
    if (typeof window !== "undefined" && window.location.pathname.startsWith('/login')) {
      return;
    }

    const input = rawInput.trim();
    const isHi = useAccessibilityStore.getState().language === "hi";

    // Isolate landing page: On the landing page, the voice assistant expects the user to say "Login".
    // If the candidate says "Login", navigate to /login.
    // If anything else is heard (noise/words), ask them back to say "Login" — NEVER speak dashboard commands!
    const isLanding = typeof window !== "undefined" && (window.location.pathname === '/' || window.location.pathname === '');
    if (isLanding) {
      const lower = input.toLowerCase();
      const isLogin =
        lower.includes('login') ||
        lower.includes('log in') ||
        lower.includes('sign in') ||
        lower.includes('लॉगिन') ||
        lower.includes('साइन इन') ||
        lower.includes('signin');

      if (isLogin) {
        const announcement = isHi ? "लॉगिन पृष्ठ खोला जा रहा है" : "Opening login page";
        this.navigate('/login', announcement);
        return;
      }

      // If candidate said something different from login on landing page, prompt back to say 'Login'
      const promptAgain = isHi
        ? "कृपया लॉगिन करने के लिए 'लॉगिन' बोलें।"
        : "Please say 'Login' to sign in to your account.";

      this.stopListening();
      speak(promptAgain, {
        lang: isHi ? 'hi-IN' : 'en-US',
        onEnd: () => {
          unlockAudioContext();
          this.startAlwaysOnListening();
        }
      });
      return;
    }

    // Isolate Results page: If candidate is on /results, and speaks an exam name or ordinal
    // without an explicit launch/nav command, dispatch analysis selection to the Results page
    const isResultsPage = typeof window !== "undefined" && window.location.pathname.startsWith('/results');
    if (isResultsPage) {
      const lower = input.toLowerCase();
      const isExplicitLaunch =
        lower.startsWith('start') ||
        lower.startsWith('take') ||
        lower.startsWith('launch') ||
        lower.startsWith('begin') ||
        lower.includes('शुरू') ||
        lower.includes('start exam') ||
        lower.includes('start practice');

      const isNavIntent =
        lower.includes('dashboard') ||
        lower.includes('डैशबोर्ड') ||
        lower.includes('practice') ||
        lower.includes('अभ्यास') ||
        lower.includes('setting') ||
        lower.includes('logout') ||
        lower.includes('sign out');

      if (!isExplicitLaunch && !isNavIntent) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent('examsarthi_select_result_by_name', {
              detail: { query: input, isHi }
            })
          );
        }
        return;
      }
    }

    // 1. Process through AI-powered Natural Speech Intent Engine (local rule + fuzzy + Gemini fallback)
    const recognized = await parseSpokenIntent(rawInput, isHi ? "hi" : "en");
    const lowerInput = input.toLowerCase();

    // 0. Active Exam Security Lockdown
    // Strictly prevent navigating away from an ongoing examination or practice session before submission.
    if (isExamSessionActive()) {
      const isSwitchLanguage = recognized.intent === "SWITCH_TO_HINDI" || recognized.intent === "SWITCH_TO_ENGLISH";
      if (!isSwitchLanguage) {
        const examMatchEarly = matchExamTokens(input) || (matchExamVoiceRoute(input) ? { route: matchExamVoiceRoute(input)!, examName: matchExamVoiceRoute(input)!.title } : null);
        const wantsToLeave =
          Boolean(examMatchEarly) ||
          Boolean(recognized.targetPath) ||
          ["NAVIGATE_DASHBOARD", "NAVIGATE_PRACTICE", "NAVIGATE_PRACTICE_GK", "NAVIGATE_EXAMS", "NAVIGATE_RESULTS", "NAVIGATE_SETTINGS", "NAVIGATE_LOGIN"].includes(recognized.intent) ||
          lowerInput.includes('practice') ||
          lowerInput.includes('dashboard') ||
          lowerInput.includes('डैशबोर्ड') ||
          lowerInput.includes('अभ्यास');

        if (wantsToLeave) {
          const lockMsgEn = "Navigation is locked during an active examination. Please submit your exam before leaving.";
          const lockMsgHi = "सक्रिय परीक्षा के दौरान नेविगेशन लॉक है। कृपया बाहर निकलने से पहले अपनी परीक्षा सबमिट करें।";
          speak(isHi ? lockMsgHi : lockMsgEn, { lang: isHi ? 'hi-IN' : 'en-US' });
          return;
        }
      }
    }

    // Specific exam portal & practice set launch commands (e.g. UPSC, SSC, Banking, Railway, Quant, Reasoning, English, GK, Vision AI)
    const examMatch = matchExamTokens(input) || (matchExamVoiceRoute(input) ? { route: matchExamVoiceRoute(input)!, examName: matchExamVoiceRoute(input)!.title } : null);
    if (examMatch) {
      playVoiceFeedbackChime();
      const targetUrl = `/exam?set=${examMatch.route.param}`;
      const isPractice = examMatch.route.param.startsWith('p') && examMatch.route.param !== 'p6';
      const announcement = isHi 
        ? (isPractice ? `${examMatch.examName} अभ्यास सत्र खोला जा रहा है` : `${examMatch.examName} परीक्षा पोर्टल खोला जा रहा है`)
        : (isPractice ? `Opening ${examMatch.examName} practice session` : `Opening ${examMatch.examName} examination portal`);
      this.navigate(targetUrl, announcement);
      return;
    }

    // Direct practice exam phrase disambiguation (ensures "practice exam" always goes to practice, not generic mock exams)
    if (
      lowerInput.includes('practice exam') ||
      lowerInput.includes('practice test') ||
      lowerInput.includes('start practice') ||
      lowerInput.includes('begin practice') ||
      lowerInput.includes('take practice') ||
      lowerInput.includes('अभ्यास परीक्षा') ||
      lowerInput.includes('प्रैक्टिस टेस्ट')
    ) {
      playVoiceFeedbackChime();
      this.navigate('/practice', isHi ? 'प्रैक्टिस सत्र खोला जा रहा है' : 'Opening Practice section');
      return;
    }

    if (recognized.targetPath && recognized.targetPath.startsWith('/exam?set=')) {
      playVoiceFeedbackChime();
      this.navigate(recognized.targetPath, isHi ? recognized.announcementHi : recognized.announcementEn);
      return;
    }

    // Primary Section Switching Commands MUST ALWAYS WORK from anywhere in the application
    const isGlobalNavIntent = [
      "NAVIGATE_DASHBOARD",
      "NAVIGATE_PRACTICE",
      "NAVIGATE_PRACTICE_GK",
      "NAVIGATE_EXAMS",
      "NAVIGATE_RESULTS",
      "NAVIGATE_SETTINGS",
      "NAVIGATE_LOGIN",
      "SWITCH_TO_HINDI",
      "SWITCH_TO_ENGLISH"
    ].includes(recognized.intent);

    if (!isGlobalNavIntent && hasActiveContext(['exam', 'review', 'hub', 'practice', 'results'])) {
      return;
    }

    // 2. Immediate Auditory Feedback Chime for recognized commands
    if (recognized.intent !== "UNKNOWN") {
      playVoiceFeedbackChime();
    }

    switch (recognized.intent) {
      case "NAVIGATE_DASHBOARD":
        this.navigate("/dashboard", isHi ? recognized.announcementHi : recognized.announcementEn);
        return;

      case "NAVIGATE_PRACTICE":
        this.navigate("/practice", isHi ? recognized.announcementHi : recognized.announcementEn);
        return;

      case "NAVIGATE_PRACTICE_GK":
        this.navigate("/practice?subject=gk", isHi ? recognized.announcementHi : recognized.announcementEn);
        return;

      case "NAVIGATE_EXAMS":
        this.navigate("/exam", isHi ? recognized.announcementHi : recognized.announcementEn);
        return;

      case "NAVIGATE_RESULTS":
        this.navigate("/results", isHi ? recognized.announcementHi : recognized.announcementEn);
        return;

      case "NAVIGATE_SETTINGS":
        this.navigate("/settings", isHi ? recognized.announcementHi : recognized.announcementEn);
        return;

      case "NAVIGATE_LOGIN":
        this.navigate("/login", isHi ? recognized.announcementHi : recognized.announcementEn);
        return;

      case "NAVIGATE_BACK": {
        const inExam = typeof window !== "undefined" && window.location.pathname.startsWith("/exam");
        const prevBtn = document.querySelector<HTMLElement>(
          'button[aria-label*="previous" i], button[aria-label*="Previous question" i], button:has(svg.lucide-chevron-left)'
        );

        if (inExam && prevBtn && !prevBtn.hasAttribute("disabled")) {
          this.dispatchExamAction("prev");
          prevBtn.click();
          speak(isHi ? "पिछला प्रश्न" : "Moving to previous question", { langOverride: isHi ? "hi-IN" : "en-US" });
        } else {
          this.isSpeakingFeedback = true;
          globalStopListening();
          speak(isHi ? "वापस जा रहे हैं" : "Going back", {
            langOverride: isHi ? "hi-IN" : "en-US",
            onEnd: () => {
              if (typeof window !== "undefined") {
                window.history.back();
              }
              setTimeout(() => {
                this.isSpeakingFeedback = false;
                if (this.isListeningExplicitly) {
                  const store = useAccessibilityStore.getState();
                  const lang = store.language === "hi" ? "hi-IN" : "en-US";
                  globalStartListening(lang, (t) => this.processCommand(t));
                }
              }, 300);
            },
          });
        }
        return;
      }

      case "START_EXAM": {
        const mockBtn = document.querySelector<HTMLElement>(
          'button[aria-haspopup="dialog"], button:has-text("Take Mock Exam"), button:has-text("मॉक टेस्ट दें")'
        );
        if (mockBtn) {
          mockBtn.click();
          speak(isHi ? "मॉक परीक्षा चयन खोला जा रहा है" : "Opening mock exam selector", { langOverride: isHi ? "hi-IN" : "en-US" });
        } else {
          this.navigate("/exam", isHi ? "मॉक परीक्षा केंद्र पर जा रहे हैं" : "Navigating to Mock Examination Hub");
        }
        return;
      }

      case "START_PRACTICE": {
        const practiceLink = document.querySelector<HTMLElement>('a[href="/practice"]');
        if (practiceLink && window.location.pathname !== "/practice") {
          practiceLink.click();
        } else {
          this.navigate("/practice", isHi ? "प्रैक्टिस सत्र शुरू किया जा रहा है" : "Starting practice session");
        }
        return;
      }

      case "DESCRIBE_DIAGRAM": {
        const describeBtn = document.querySelector<HTMLElement>(
          'button[aria-label*="Describe diagram" i], button[aria-label*="चित्र का विवरण" i], button:has(svg.lucide-sparkles)'
        );
        if (describeBtn) {
          describeBtn.click();
        } else {
          window.dispatchEvent(new CustomEvent('examsarthi-voice-action', {
            detail: { action: 'describe-diagram' }
          }));
        }
        speak(isHi ? "चित्र का विवरण दिया जा रहा है" : "Describing diagram", { langOverride: isHi ? "hi-IN" : "en-US" });
        return;
      }

      case "NEXT_QUESTION": {
        this.dispatchExamAction("next");
        const nextBtn = document.querySelector<HTMLElement>(
          'button[aria-label*="next" i], button[aria-label*="Next question" i], button:has(svg.lucide-chevron-right)'
        );
        if (nextBtn && !nextBtn.hasAttribute("disabled")) {
          nextBtn.click();
        }
        speak(isHi ? "अगला प्रश्न" : "Moving to next question", { langOverride: isHi ? "hi-IN" : "en-US" });
        return;
      }

      case "PREVIOUS_QUESTION": {
        this.dispatchExamAction("prev");
        const prevBtn = document.querySelector<HTMLElement>(
          'button[aria-label*="previous" i], button[aria-label*="Previous question" i], button:has(svg.lucide-chevron-left)'
        );
        if (prevBtn && !prevBtn.hasAttribute("disabled")) {
          prevBtn.click();
        }
        speak(isHi ? "पिछला प्रश्न" : "Moving to previous question", { langOverride: isHi ? "hi-IN" : "en-US" });
        return;
      }

      case "CLEAR_RESPONSE": {
        this.dispatchExamAction("clear");
        const clearBtn = document.querySelector<HTMLElement>(
          'button[aria-label*="clear" i], button:has-text("Clear"), button:has-text("उत्तर हटाएं")'
        );
        if (clearBtn) clearBtn.click();
        speak(isHi ? "उत्तर हटाया गया" : "Response cleared", { langOverride: isHi ? "hi-IN" : "en-US" });
        return;
      }

      case "SELECT_OPTION": {
        if (recognized.optionLetter) {
          this.selectExamOption(recognized.optionLetter);
        }
        return;
      }

      case "SUBMIT_EXAM": {
        this.dispatchExamAction("submit");
        const submitBtn = document.querySelector<HTMLElement>(
          'button[aria-label*="Submit" i], button:has-text("Submit"), button:has-text("सबमिट करें"), button:has-text("परीक्षा जमा करें")'
        );
        if (submitBtn) submitBtn.click();
        speak(isHi ? "परीक्षा जमा की जा रही है" : "Submitting examination", { langOverride: isHi ? "hi-IN" : "en-US" });
        return;
      }

      case "SWITCH_TO_HINDI": {
        this.switchLanguage("hi");
        return;
      }

      case "SWITCH_TO_ENGLISH": {
        this.switchLanguage("en");
        return;
      }

      default:
        break;
    }

    // 3. CONVERSATIONAL YES / CONFIRM / SELECT / SURE / HAAN
    if (/(?:^|\b)(?:yes|yeah|yup|sure|confirm|select|proceed|haan|sahi|thik\s*hai|हाँ|हा|पुष्टि|सही)(?:\b|$)/i.test(input)) {
      const activeEl = (document.activeElement && document.activeElement !== document.body
        ? document.activeElement
        : lastFocusedElement) as HTMLElement | null;

      if (activeEl) {
        const confirmMsg =
          activeEl.getAttribute("data-voice-confirm") ||
          activeEl.closest("[data-voice-confirm]")?.getAttribute("data-voice-confirm") ||
          (isHi ? "पुष्टि की गई।" : "Confirmed.");
        speak(confirmMsg, { langOverride: isHi ? "hi-IN" : "en-US" });

        // Check if element or ancestor/child is a link
        const link = (activeEl.tagName === "A"
          ? activeEl
          : activeEl.closest("a") || activeEl.querySelector("a")) as HTMLAnchorElement | null;

        if (link && link.href) {
          try {
            link.click();
          } catch (_) {}
          try {
            const url = new URL(link.href, window.location.href);
            if (url.origin === window.location.origin) {
              const path = url.pathname + url.search + url.hash;
              if (this.routerNavigate) {
                this.routerNavigate(path);
              }
            }
          } catch (_) {}
          return;
        }

        try {
          activeEl.click();
          if (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") {
            activeEl.focus();
          }
        } catch (_) {}
        return;
      }
    }

    // 4. CONVERSATIONAL NO / SKIP / NEXT
    const isPracticeSection = typeof window !== "undefined" && window.location.pathname.includes("/practice");
    const activeEl = (document.activeElement && document.activeElement !== document.body
      ? document.activeElement
      : lastFocusedElement) as HTMLElement | null;
    const hasPrompt = Boolean(activeEl?.getAttribute("data-voice-prompt") || activeEl?.closest("[data-voice-prompt]"));

    const isNoCommand = /(?:^|\b)(?:no|nope|skip|nahi|nahin|chhodo|नहीं|ना|छोड़ो)(?:\b|$)/i.test(input);
    const isNextInPractice = isPracticeSection && /(?:^|\b)(?:next|अगला)(?:\b|$)/i.test(input);

    if (isNoCommand || (isNextInPractice && hasPrompt)) {
      speak(isHi ? "छोड़ा जा रहा है।" : "Skipping.", { langOverride: isHi ? "hi-IN" : "en-US" });
      this.advanceFocusToNextElement();
      return;
    }

    // 5. Mark for Review / Flag
    if (/(?:mark\s+for\s+review|review\s+later|review|flag\s+for\s+review|flag\s+question|flag|unflag|चिह्नित\s+करो|समीक्षा)/i.test(input)) {
      this.dispatchExamAction("flag");
      const flagBtn = document.querySelector<HTMLElement>(
        'button[aria-label*="flag" i], button[aria-label*="review" i], button:has(svg.lucide-flag)'
      );
      if (flagBtn) flagBtn.click();
      speak(isHi ? "समीक्षा के लिए चिह्नित किया गया" : "Marked for review", { langOverride: isHi ? "hi-IN" : "en-US" });
      return;
    }

    // Describe Diagram (Vision AI)
    if (/(?:describe\s+diagram|diagram\s+description|describe\s+image|चित्र\s+का\s+विवरण|चित्र\s+का\s+विवरण\s+दें|चित्र\s+बताओ|diagram\s+padho|chitra\s+ka\s+vivaran)/i.test(input)) {
      const describeBtn = document.querySelector<HTMLElement>(
        'button[aria-label*="Describe diagram" i], button:has(svg.lucide-sparkles)'
      );
      if (describeBtn) {
        describeBtn.click();
      } else {
        speak(isHi ? "चित्र का विवरण: इस प्रश्न में कोई आरेख नहीं है।" : "Describe diagram: No diagram found on this question.");
      }
      return;
    }

    // Read Question
    if (/(?:read\s+question|read\s+again|read|repeat\s+question|repeat|speak\s+question|padho|सवाल\s+पढ़ो|प्रश्न\s+पढ़ो|सवाल\s+क्या\s+है)/i.test(input)) {
      this.readCurrentQuestionAloud();
      return;
    }

    // How Much Time Is Left?
    if (/(?:how\s+much\s+time\s+is\s+left|how\s+much\s+time|time\s+left|time\s+remaining|what\s+is\s+the\s+time|remaining\s+time|kitna\s+samay|कितना\s+समय\s+बचा\s+है|समय\s+कितना\s+है)/i.test(input)) {
      this.announceTimeRemaining();
      return;
    }

    // Help Command (Explicit bilingual guidance required by prompt)
    if (/(?:help|commands|what\s+can\s+i\s+say|madad|sahayata|sahayta|मदद|सहायता|क्या\s+बोल\s+सकते\s+हैं)/i.test(input)) {
      if (isHi) {
        speak(
          "आप 'प्रैक्टिस शुरू करें', 'मॉक टेस्ट दें', 'चित्र का विवरण दें', या अंग्रेजी में जाने के लिए 'switch to English' कह सकते हैं।",
          { lang: "hi-IN" }
        );
      } else {
        speak(
          "You can say 'start practice', 'take mock exam', 'describe diagram', or say 'switch to Hindi' to navigate completely in Hindi.",
          { lang: "en-US" }
        );
      }
      return;
    }

    // Check commandRouter route table as a fallback before declaring unrecognized
    const routedFallback = routeVoiceCommand(input, 'global-nav');
    if (routedFallback.handled && routedFallback.type === 'route' && routedFallback.path) {
      const confirmationText = isHi
        ? (routedFallback.path.includes('gk') ? 'सामान्य ज्ञान और भूगोल खोला जा रहा है' :
           routedFallback.path === '/dashboard' ? 'डैशबोर्ड खोला जा रहा है' :
           routedFallback.path === '/practice' ? 'प्रैक्टिस सत्र खोला जा रहा है' :
           routedFallback.path === '/exam' ? 'परीक्षा केंद्र खोला जा रहा है' :
           routedFallback.path === '/results' ? 'परिणाम देखे जा रहे हैं' :
           routedFallback.path === '/settings' ? 'सेटिंग्स खोली जा रही हैं' :
           `जा रहे हैं ${routedFallback.path}`)
        : (routedFallback.readback || `Navigating to ${routedFallback.path}`);
      this.navigate(routedFallback.path, confirmationText);
      return;
    }

    // Fallback: Unrecognized
    speak(
      isHi
        ? `मैंने सुना "${input}", लेकिन कमांड समझ नहीं आया। 'डैशबोर्ड', 'प्रैक्टिस', 'परीक्षा', 'परिणाम', या 'सेटिंग्स' बोलें।`
        : `I heard ${input}, but I didn't catch that command. You can say 'Dashboard', 'Practice', 'Exams', 'Results', or 'Settings'.`
    );
  }

  private dispatchExamAction(action: string, detail?: any) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("examsarthi-voice-action", {
          detail: { action, ...detail },
        })
      );
    }
  }

  private selectExamOption(letter: string) {
    const idx = letter.charCodeAt(0) - 65; // A -> 0, B -> 1, C -> 2, D -> 3
    this.dispatchExamAction("select-option", { letter, index: idx });
    const isHi = useAccessibilityStore.getState().language === "hi";

    const radios = Array.from(
      document.querySelectorAll<HTMLElement>(
        'fieldset [role="radiogroup"] input[type="radio"], fieldset [role="radiogroup"] [role="radio"]'
      )
    );

    if (radios.length > idx && radios[idx]) {
      radios[idx].click();
      speak(isHi ? `विकल्प ${letter} चुना गया` : `Option ${letter} selected`);
      return;
    }

    const optionLabels = Array.from(
      document.querySelectorAll<HTMLElement>("fieldset label, [role='radiogroup'] label")
    );
    if (optionLabels.length > idx && optionLabels[idx]) {
      optionLabels[idx].click();
      speak(isHi ? `विकल्प ${letter} चुना गया` : `Option ${letter} selected`);
      return;
    }

    speak(isHi ? `विकल्प ${letter} चुना गया` : `Option ${letter} selected`);
  }

  private readCurrentQuestionAloud() {
    const isHi = useAccessibilityStore.getState().language === "hi";
    const legend = document.querySelector(
      "fieldset legend, main h2, [data-testid='question-text']"
    );
    const questionText = cleanAccessibleText(legend?.textContent || "");

    const options = Array.from(
      document.querySelectorAll(
        "fieldset [role='radiogroup'] > div, fieldset .space-y-3\\.5 > div, [role='radiogroup'] label"
      )
    );

    let textToRead = questionText ? (isHi ? `प्रश्न: ${questionText}। ` : `Question: ${questionText}. `) : "";

    if (options.length > 0) {
      options.forEach((opt, index) => {
        const letter = String.fromCharCode(65 + index);
        const optText = cleanAccessibleText(
          opt.querySelector(".text-foreground")?.textContent || opt.textContent || ""
        ).replace(/^[A-D]\s*/i, "");
        textToRead += isHi ? `विकल्प ${letter}: ${optText}। ` : `Option ${letter}: ${optText}. `;
      });
    }

    if (!textToRead.trim()) {
      speak(isHi ? "इस पृष्ठ पर पढ़ने के लिए कोई सक्रिय प्रश्न नहीं मिला।" : "No active question found to read on this page.");
      return;
    }

    speak(textToRead);
  }

  private announceTimeRemaining() {
    const isHi = useAccessibilityStore.getState().language === "hi";
    const timerEl = document.querySelector(
      '[role="region"][aria-label*="Timer"] span[aria-label], [aria-label*="remaining"], span.tabular-nums'
    );

    if (timerEl) {
      const ariaLabel = timerEl.getAttribute("aria-label");
      if (ariaLabel && /remaining/i.test(ariaLabel)) {
        speak(isHi ? `आपके पास ${ariaLabel}` : `You have ${ariaLabel}`);
        return;
      }

      const text = timerEl.textContent?.trim() || "";
      const match = text.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        speak(
          isHi
            ? `आपके पास ${mins} मिनट और ${secs} सेकंड का समय शेष है।`
            : `You have ${mins} minutes and ${secs} seconds remaining.`
        );
        return;
      }

      if (text) {
        speak(isHi ? `शेष समय: ${text}` : `Time remaining: ${text}`);
        return;
      }
    }

    speak(isHi ? "इस पृष्ठ पर कोई सक्रिय टाइमर नहीं मिला।" : "No active exam timer found on this page.");
  }
}

export const voiceEngine = new VoiceNavigationEngine();

// Auto-sync voiceEngine recognition language with store changes
if (typeof window !== "undefined") {
  useAccessibilityStore.subscribe((state, prevState) => {
    if (state.language !== prevState.language) {
      voiceEngine.setLanguage(state.language);
    }
  });
}

let hasAnnouncedInSession = false;

/**
 * Initializes the automated Gesture Trigger on first Tab or Space keypress per session.
 * - Listens for keydown where e.key === 'Tab' or 'Space'.
 * - Unlocks hardware audio context synchronously within the user gesture.
 * - Speaks the welcome tour clearly in candidate's selected language.
 */
export function initGestureTrigger(): () => void {
  if (typeof window === "undefined") return () => {};

  const handleFirstGesture = (event: KeyboardEvent) => {
    // Respond to Tab key or Space key
    const isTab = event.key === "Tab";
    const isSpace = event.key === " " || event.key === "Spacebar" || event.code === "Space";

    if (!isTab && !isSpace) {
      return;
    }

    if (hasAnnouncedInSession) {
      window.removeEventListener("keydown", handleFirstGesture, true);
      return;
    }

    if (typeof window !== "undefined" && window.location.pathname.startsWith('/login')) {
      return;
    }

    hasAnnouncedInSession = true;

    // Immediately unlock browser audio context within the user gesture event
    unlockAudioContext();

    const store = useAccessibilityStore.getState();
    store.setHasAnnouncedWelcome(true);
    store.setVoiceModeEnabled(true);

    // Cancel any stuck prior speech
    if (isSpeechSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }

    // Mark welcome announcement in-progress to prevent focus talk-back from interrupting it
    isAnnouncingWelcome = true;

    const isHi = store.language === "hi";
    const welcomeText = isHi ? WELCOME_TOUR_TEXT_HI : WELCOME_TOUR_TEXT_EN;
    const targetLang = isHi ? "hi-IN" : "en-US";

    // Speak the welcome tagline clearly using bulletproof forceSpeak
    forceSpeak(welcomeText, () => {
      isAnnouncingWelcome = false;
    }, targetLang);

    // Fallback timer to release welcome lock in case speech synthesis ends abruptly
    setTimeout(() => {
      isAnnouncingWelcome = false;
    }, 12000);

    // Remove listener once triggered
    window.removeEventListener("keydown", handleFirstGesture, true);

    // Do NOT call event.preventDefault() — the first interactive element must receive focus!
  };

  // Passive pointerdown listener to prime Web Audio on any initial click
  const handlePointerDown = () => {
    unlockAudioContext();
  };
  window.addEventListener("pointerdown", handlePointerDown, { once: true, passive: true });

  if (!hasAnnouncedInSession) {
    window.addEventListener("keydown", handleFirstGesture, true);
  }

  return () => {
    window.removeEventListener("keydown", handleFirstGesture, true);
    window.removeEventListener("pointerdown", handlePointerDown);
  };
}

/**
 * Initializes the Global Tab Talk-Back Engine.
 * Listens to document focusin events and speaks accessible labels with zero queue stutter.
 * Safeguarded so it does not cancel or collide with the initial welcome tour.
 */
export function initFocusTalkBack(): () => void {
  if (typeof window === "undefined") return () => {};
  if (useAccessibilityStore.getState().accessibilityMode === 'keyboard') return () => {};

  const handleFocusIn = (event: FocusEvent) => {
    const store = useAccessibilityStore.getState();
    if (!store.voiceModeEnabled || store.accessibilityMode === 'keyboard') return;

    // If initial welcome is still being spoken, do not interrupt it
    if (isAnnouncingWelcome) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    // Avoid announcing raw body or main content wrapper focus
    if (target === document.body || target.id === "main-content") {
      return;
    }

    // Track last focused interactive element for conversational yes/no commands
    lastFocusedElement = target;

    // Conversational Yes/No Voice Guidance (data-voice-prompt)
    const promptElement = target.dataset.voicePrompt
      ? target
      : target.closest<HTMLElement>("[data-voice-prompt]");

    if (promptElement && promptElement.dataset.voicePrompt) {
      const isHi = store.language === "hi";
      const rawPrompt = promptElement.dataset.voicePrompt.trim();
      const promptText = isHi ? localizeTalkBackText(rawPrompt, true) : rawPrompt;
      const message = /say yes|हाँ कहें/i.test(promptText)
        ? promptText
        : isHi
          ? `${promptText} आगे बढ़ने के लिए हाँ कहें, या छोड़ने के लिए नहीं कहें।`
          : `${promptText} Say Yes to proceed, or say No to skip.`;
      speak(message, { cancelPrevious: true, langOverride: isHi ? "hi-IN" : "en-US" });
      return;
    }

    const label = computeAccessibleLabel(target);
    if (label) {
      const isHi = store.language === "hi";
      speak(label, { cancelPrevious: true, langOverride: isHi ? "hi-IN" : "en-US" });
    }
  };

  document.addEventListener("focusin", handleFocusIn, true);

  return () => {
    document.removeEventListener("focusin", handleFocusIn, true);
  };
}

/**
 * Initializes the Alt + V hotkey listener for toggling voice command recognition.
 */
export function initVoiceCommandHotkey(): () => void {
  if (typeof window === "undefined") return () => {};
  if (useAccessibilityStore.getState().accessibilityMode === 'keyboard') return () => {};

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.altKey && (event.key === "v" || event.key === "V" || event.code === "KeyV")) {
      event.preventDefault();
      voiceEngine.toggle();
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}

/**
 * Initializes the Alt + L hotkey listener for toggling platform language (English / Hindi).
 */
export function initLanguageHotkey(): () => void {
  if (typeof window === "undefined") return () => {};

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.altKey && (event.key === "l" || event.key === "L" || event.code === "KeyL")) {
      event.preventDefault();
      const current = useAccessibilityStore.getState().language;
      const nextLang = current === "hi" ? "en" : "hi";
      voiceEngine.switchLanguage(nextLang);
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}
