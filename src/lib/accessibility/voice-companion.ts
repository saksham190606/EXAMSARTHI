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

export const WELCOME_TOUR_TEXT =
  "Welcome to Exam Saarthi — Empowering every aspirant with accessible examination and practice. " +
  "Voice companion is now active. Use Tab to navigate through options, " +
  "or press Alt plus V anytime to speak voice commands.";

export interface SpeakOptions {
  rate?: number;
  cancelPrevious?: boolean;
  lang?: string;
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
  "google us english", "google uk english female", "hazel", "susan", 
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

let cachedFemaleVoice: SpeechSynthesisVoice | null = null;

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      cachedFemaleVoice = null;
      getNaturalFemaleVoice();
    });
  } catch (_) {}
}

/**
 * Selects a high-quality natural female voice across all browser platforms.
 * Prioritizes natural/neural female voices (Google US English, Microsoft Jenny/Aria/Zira/Neerja/Swara, Samantha/Karen)
 * and strictly blacklists all male voices (David, Mark, Ravi, Hemant, etc.).
 */
export function getNaturalFemaleVoice(langPref?: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  if (!voices || voices.length === 0) return null;

  const isHindi = langPref === "hi" || langPref?.toLowerCase().startsWith("hi");

  // 1. If Hindi requested, find Hindi female voice
  if (isHindi) {
    const hindiVoices = voices.filter(v => v.lang.toLowerCase().startsWith("hi") && !isMaleVoice(v));
    const preferredHindi = hindiVoices.find(v => 
      isFemaleVoice(v) || !v.localService
    ) || hindiVoices[0];
    if (preferredHindi) return preferredHindi;
  }

  // If we already resolved and cached the English female voice, return it if still present
  if (!isHindi && cachedFemaleVoice && voices.includes(cachedFemaleVoice)) {
    return cachedFemaleVoice;
  }

  // 2. Priority 1: Exact natural voice used by initial welcome greeting in Chromium ("Google US English" / non-local en-US)
  const googleUS = voices.find(v => 
    !isMaleVoice(v) && 
    (v.name === "Google US English" || (v.lang === "en-US" && !v.localService))
  );
  if (googleUS) {
    if (!isHindi) cachedFemaleVoice = googleUS;
    return googleUS;
  }

  // 3. Priority 2: High-quality natural/online or desktop female voices (Edge / Windows: Jenny, Aria, Zira, etc.)
  const naturalFemale = voices.find(v => 
    !isMaleVoice(v) && 
    isFemaleVoice(v) && 
    v.lang.toLowerCase().startsWith("en")
  );
  if (naturalFemale) {
    if (!isHindi) cachedFemaleVoice = naturalFemale;
    return naturalFemale;
  }

  // 4. Priority 3: Any non-local (cloud/neural) English voice that is not male
  const cloudFemale = voices.find(v => 
    v.lang.toLowerCase().startsWith("en") && 
    !v.localService && 
    !isMaleVoice(v)
  );
  if (cloudFemale) {
    if (!isHindi) cachedFemaleVoice = cloudFemale;
    return cloudFemale;
  }

  // 5. Priority 4: Any English voice that is NOT in the male blacklist
  const nonMaleEnglish = voices.find(v => 
    v.lang.toLowerCase().startsWith("en") && 
    !isMaleVoice(v)
  );
  if (nonMaleEnglish) {
    if (!isHindi) cachedFemaleVoice = nonMaleEnglish;
    return nonMaleEnglish;
  }

  // 6. Priority 5: Any non-male voice of any language
  const nonMaleAny = voices.find(v => !isMaleVoice(v));
  if (nonMaleAny) {
    if (!isHindi) cachedFemaleVoice = nonMaleAny;
    return nonMaleAny;
  }

  return voices[0] || null;
}

/**
 * Bulletproof Speech Helper that prevents stalled queues and waits for asynchronous voice loading in Chromium browsers.
 */
export function forceSpeak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

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
      const spokenText = formatSpeechPronunciation(text);
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = "en-US";

      // Lock in the natural female voice
      const femaleVoice = getNaturalFemaleVoice("en-US");
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      // Strong reference prevents Chromium GC from dropping speech
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
        console.warn("[VoiceCompanion] Utterance error:", e);
        activeUtteranceRef = null;
        if (typeof window !== "undefined") {
          (window as any).__activeUtterance = null;
        }
        if (onEnd) onEnd();
      };

      setTimeout(() => {
        try {
          synth.resume();
          synth.speak(utterance);
        } catch (err) {
          console.warn("[VoiceCompanion] synth.speak error:", err);
          if (onEnd) onEnd();
        }
      }, 50);
    } catch (err) {
      console.warn("[VoiceCompanion] forceSpeak play error:", err);
      if (onEnd) onEnd();
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

  const { cancelPrevious = true, lang, onEnd, onError } = options || {};

  if (cancelPrevious) {
    stopSpeech();
  }

  try {
    const store = useAccessibilityStore.getState();
    const rate = options?.rate ?? (store.speechRate || 1.0);

    const spokenText = formatSpeechPronunciation(text.trim());
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = Math.max(0.6, Math.min(2.0, rate));

    const targetLang = lang || (store.language === "hi" ? "hi-IN" : "en-US");
    utterance.lang = targetLang;

    // Lock in the exact same natural female voice across the platform
    let femaleVoice = getNaturalFemaleVoice(targetLang);
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
 * Computes an accessible talk-back label for focused elements.
 */
export function computeAccessibleLabel(target: HTMLElement): string | null {
  if (!target || typeof target.tagName !== "string") return null;

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

    return `Option ${optionLetter}, ${optionText}, ${isChecked ? "selected" : "not selected"}`;
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
    return `${label}, checkbox, ${isChecked ? "checked" : "not checked"}`;
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
    return `${label}, text input, current value: ${value || "empty"}`;
  }

  // 4. BUTTONS & ACCESSIBLE TRIGGERS
  const isButton = tagName === "BUTTON" || role === "button";
  if (isButton) {
    if (role === "switch") {
      const isChecked =
        target.getAttribute("aria-checked") === "true" ||
        target.dataset.state === "checked";
      const label = getAssociatedLabel(target) || cleanAccessibleText(target.textContent);
      return `${label}, toggle switch, ${isChecked ? "on" : "off"}`;
    }

    if (role === "tab") {
      const isSelected =
        target.getAttribute("aria-selected") === "true" ||
        target.dataset.state === "active";
      const label = getAssociatedLabel(target) || cleanAccessibleText(target.textContent);
      return `${label}, tab, ${isSelected ? "selected" : "not selected"}`;
    }

    const label =
      target.getAttribute("aria-label") ||
      cleanAccessibleText(target.textContent) ||
      getAssociatedLabel(target);

    if (!label) return null;
    return `${label}, button`;
  }

  // 5. LINKS & NAVIGATION
  const isLink = tagName === "A" || role === "link";
  if (isLink) {
    const label =
      target.getAttribute("aria-label") ||
      cleanAccessibleText(target.textContent) ||
      target.getAttribute("title");

    if (!label) return null;
    return `${label}, navigation link`;
  }

  // 6. SELECT / COMBOBOX
  if (tagName === "SELECT" || role === "combobox") {
    const label = getAssociatedLabel(target) || cleanAccessibleText(target.textContent);
    return `${label}, dropdown selection`;
  }

  // 7. LANDMARKS & REGIONS with explicit labels
  const ariaLabel = target.getAttribute("aria-label");
  if (ariaLabel && cleanAccessibleText(ariaLabel)) {
    const clean = cleanAccessibleText(ariaLabel);
    if (role) {
      return `${clean}, ${role}`;
    }
    return clean;
  }

  return null;
}

/**
 * Bulletproof Voice Command Router & Speech Recognition Engine
 */
class VoiceNavigationEngine {
  private recognition: any = null;
  private routerNavigate: ((path: string) => void) | null = null;
  private isListeningExplicitly = false;
  private restartTimeout: any = null;

  public setRouter(navigate: (path: string) => void) {
    this.routerNavigate = navigate;
  }

  public navigate(path: string, confirmationText: string) {
    speak(confirmationText, {
      onEnd: () => {
        if (this.routerNavigate) {
          this.routerNavigate(path);
        } else if (typeof window !== "undefined") {
          window.location.href = path;
        }
      },
    });
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
    if (!isSpeechRecognitionSupported()) return;

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        // Prevent speech feedback loop if synthesized speech is actively playing
        if (typeof window !== "undefined" && window.speechSynthesis?.speaking) {
          return;
        }

        const lastIndex = event.results.length - 1;
        const transcript = event.results[lastIndex][0]?.transcript?.trim();
        if (transcript) {
          this.processCommand(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          this.isListeningExplicitly = false;
          useAccessibilityStore.getState().setIsListeningCommands(false);
          speak("Microphone permission was denied. Please allow microphone access in your browser.");
        } else if (event.error !== "no-speech" && event.error !== "aborted") {
          console.warn("[VoiceEngine] Recognition error:", event.error);
        }
      };

      // Crucial auto-restart: Browsers stop continuous listening on brief silence
      recognition.onend = () => {
        if (this.isListeningExplicitly) {
          clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.isListeningExplicitly && this.recognition) {
              try {
                this.recognition.start();
              } catch (_) {
                // Ignore InvalidStateError if already started
              }
            }
          }, 200);
        }
      };

      this.recognition = recognition;
    } catch (e) {
      console.warn("[VoiceEngine] Failed to initialize SpeechRecognition:", e);
    }
  }

  public toggle(forceState?: boolean): boolean {
    if (!isSpeechRecognitionSupported()) {
      speak("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return false;
    }

    if (!this.recognition) {
      this.init();
    }

    const shouldListen = forceState ?? !this.isListeningExplicitly;

    if (shouldListen) {
      try {
        this.recognition.start();
        this.isListeningExplicitly = true;
        useAccessibilityStore.getState().setIsListeningCommands(true);
        speak("Listening for voice commands. Press Alt plus V to stop.");
        return true;
      } catch (err) {
        // If already started, ensure state matches
        this.isListeningExplicitly = true;
        useAccessibilityStore.getState().setIsListeningCommands(true);
        return true;
      }
    } else {
      this.isListeningExplicitly = false;
      useAccessibilityStore.getState().setIsListeningCommands(false);
      clearTimeout(this.restartTimeout);
      try {
        this.recognition.stop();
        speak("Voice command recognition paused.");
      } catch (err) {
        console.warn("[VoiceEngine] Stop error:", err);
      }
      return false;
    }
  }

  public processCommand(rawInput: string) {
    const input = rawInput.toLowerCase().trim();

    // 1. ROUTING COMMANDS
    if (/(?:go\s+to\s+dashboard|open\s+dashboard|show\s+dashboard|^dashboard$)/i.test(input)) {
      this.navigate("/dashboard", "Navigating to Dashboard");
      return;
    }

    if (/(?:go\s+to\s+practice|open\s+practice|start\s+practice|^practice$)/i.test(input)) {
      this.navigate("/practice", "Navigating to Practice");
      return;
    }

    if (/(?:go\s+to\s+exams?|open\s+exams?|start\s+exams?|^exams?$)/i.test(input)) {
      this.navigate("/exam", "Navigating to Exams");
      return;
    }

    if (/(?:open\s+results|go\s+to\s+results|show\s+results|^results?$)/i.test(input)) {
      this.navigate("/results", "Navigating to Results");
      return;
    }

    if (/(?:open\s+settings|go\s+to\s+settings|show\s+settings|^settings?$)/i.test(input)) {
      this.navigate("/settings", "Navigating to Settings");
      return;
    }

    // 2. CONVERSATIONAL YES / CONFIRM / SELECT / SURE / HAAN
    if (/(?:^|\b)(?:yes|yeah|yup|sure|confirm|select|proceed|haan|sahi|thik\s*hai)(?:\b|$)/i.test(input)) {
      const activeEl = (document.activeElement && document.activeElement !== document.body
        ? document.activeElement
        : lastFocusedElement) as HTMLElement | null;

      if (activeEl) {
        const confirmMsg =
          activeEl.getAttribute("data-voice-confirm") ||
          activeEl.closest("[data-voice-confirm]")?.getAttribute("data-voice-confirm") ||
          "Confirmed.";
        speak(confirmMsg);

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

    // 3. CONVERSATIONAL NO / SKIP / NEXT (in Practice section or on voice prompt element)
    const isPracticeSection = typeof window !== "undefined" && window.location.pathname.includes("/practice");
    const activeEl = (document.activeElement && document.activeElement !== document.body
      ? document.activeElement
      : lastFocusedElement) as HTMLElement | null;
    const hasPrompt = Boolean(activeEl?.getAttribute("data-voice-prompt") || activeEl?.closest("[data-voice-prompt]"));

    const isNoCommand = /(?:^|\b)(?:no|nope|skip|nahi|nahin|chhodo)(?:\b|$)/i.test(input);
    const isNextInPractice = isPracticeSection && /(?:^|\b)(?:next)(?:\b|$)/i.test(input);

    if (isNoCommand || (isNextInPractice && hasPrompt)) {
      speak("Skipping.");
      this.advanceFocusToNextElement();
      return;
    }

    // 4. ACTIVE EXAM / PRACTICE ACTIONS

    // Next Question
    if (/(?:next\s+question|go\s+next|next|forward|agla\s+sawal|agla\s+prashna|agla)/i.test(input)) {
      this.dispatchExamAction("next");
      const nextBtn = document.querySelector<HTMLElement>(
        'button[aria-label*="next" i], button[aria-label*="Next question" i], button:has(svg.lucide-chevron-right)'
      );
      if (nextBtn && !nextBtn.hasAttribute("disabled")) {
        nextBtn.click();
      }
      speak("Moving to next question");
      return;
    }

    // Previous Question
    if (/(?:previous\s+question|go\s+previous|go\s+back|previous|back|pichhla\s+sawal|pichla\s+sawal|pichhla|pichla)/i.test(input)) {
      this.dispatchExamAction("prev");
      const prevBtn = document.querySelector<HTMLElement>(
        'button[aria-label*="previous" i], button[aria-label*="Previous question" i], button:has(svg.lucide-chevron-left)'
      );
      if (prevBtn && !prevBtn.hasAttribute("disabled")) {
        prevBtn.click();
      }
      speak("Moving to previous question");
      return;
    }

    // Select Option A (or 1)
    if (/(?:select|choose|pick|option)\s+(?:a|1|one)\b|^(?:option\s+)?(?:a|1|one)$/i.test(input)) {
      this.selectExamOption("A");
      return;
    }

    // Select Option B (or 2)
    if (/(?:select|choose|pick|option)\s+(?:b|2|two)\b|^(?:option\s+)?(?:b|2|two)$/i.test(input)) {
      this.selectExamOption("B");
      return;
    }

    // Select Option C (or 3)
    if (/(?:select|choose|pick|option)\s+(?:c|3|three)\b|^(?:option\s+)?(?:c|3|three)$/i.test(input)) {
      this.selectExamOption("C");
      return;
    }

    // Select Option D (or 4)
    if (/(?:select|choose|pick|option)\s+(?:d|4|four)\b|^(?:option\s+)?(?:d|4|four)$/i.test(input)) {
      this.selectExamOption("D");
      return;
    }

    // Clear Response
    if (/(?:clear\s+response|clear\s+answer|clear\s+selection|clear|deselect|reset\s+answer|reset)/i.test(input)) {
      this.dispatchExamAction("clear");
      const clearBtn = document.querySelector<HTMLElement>(
        'button[aria-label*="clear" i], button:has-text("Clear")'
      );
      if (clearBtn) clearBtn.click();
      speak("Response cleared");
      return;
    }

    // Mark for Review / Flag
    if (/(?:mark\s+for\s+review|review\s+later|review|flag\s+for\s+review|flag\s+question|flag|unflag)/i.test(input)) {
      this.dispatchExamAction("flag");
      const flagBtn = document.querySelector<HTMLElement>(
        'button[aria-label*="flag" i], button[aria-label*="review" i], button:has(svg.lucide-flag)'
      );
      if (flagBtn) flagBtn.click();
      speak("Marked for review");
      return;
    }

    // Read Question
    if (/(?:read\s+question|read\s+again|read|repeat\s+question|repeat|speak\s+question|padho)/i.test(input)) {
      this.readCurrentQuestionAloud();
      return;
    }

    // How Much Time Is Left?
    if (/(?:how\s+much\s+time\s+is\s+left|how\s+much\s+time|time\s+left|time\s+remaining|what\s+is\s+the\s+time|remaining\s+time|kitna\s+samay)/i.test(input)) {
      this.announceTimeRemaining();
      return;
    }

    // Help Command
    if (/(?:help|commands|what\s+can\s+i\s+say|madad)/i.test(input)) {
      speak(
        "Available voice commands: Go to dashboard, Go to practice, Go to exams, " +
        "Open results, Open settings, Next question, Previous question, " +
        "Select option A, B, C, or D, Clear response, Mark for review, " +
        "Read question, and How much time is left."
      );
      return;
    }

    // Fallback: Unrecognized
    speak("Command not recognized. Say Help for a list of commands.");
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

    const radios = Array.from(
      document.querySelectorAll<HTMLElement>(
        'fieldset [role="radiogroup"] input[type="radio"], fieldset [role="radiogroup"] [role="radio"]'
      )
    );

    if (radios.length > idx && radios[idx]) {
      radios[idx].click();
      speak(`Option ${letter} selected`);
      return;
    }

    const optionLabels = Array.from(
      document.querySelectorAll<HTMLElement>("fieldset label, [role='radiogroup'] label")
    );
    if (optionLabels.length > idx && optionLabels[idx]) {
      optionLabels[idx].click();
      speak(`Option ${letter} selected`);
      return;
    }

    speak(`Option ${letter} selected`);
  }

  private readCurrentQuestionAloud() {
    const legend = document.querySelector(
      "fieldset legend, main h2, [data-testid='question-text']"
    );
    const questionText = cleanAccessibleText(legend?.textContent || "");

    const options = Array.from(
      document.querySelectorAll(
        "fieldset [role='radiogroup'] > div, fieldset .space-y-3\\.5 > div, [role='radiogroup'] label"
      )
    );

    let textToRead = questionText ? `Question: ${questionText}. ` : "";

    if (options.length > 0) {
      options.forEach((opt, index) => {
        const letter = String.fromCharCode(65 + index);
        const optText = cleanAccessibleText(
          opt.querySelector(".text-foreground")?.textContent || opt.textContent || ""
        ).replace(/^[A-D]\s*/i, "");
        textToRead += `Option ${letter}: ${optText}. `;
      });
    }

    if (!textToRead.trim()) {
      speak("No active question found to read on this page.");
      return;
    }

    speak(textToRead);
  }

  private announceTimeRemaining() {
    const timerEl = document.querySelector(
      '[role="region"][aria-label*="Timer"] span[aria-label], [aria-label*="remaining"], span.tabular-nums'
    );

    if (timerEl) {
      const ariaLabel = timerEl.getAttribute("aria-label");
      if (ariaLabel && /remaining/i.test(ariaLabel)) {
        speak(`You have ${ariaLabel}`);
        return;
      }

      const text = timerEl.textContent?.trim() || "";
      const match = text.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        speak(`You have ${mins} minutes and ${secs} seconds remaining.`);
        return;
      }

      if (text) {
        speak(`Time remaining: ${text}`);
        return;
      }
    }

    speak("No active exam timer found on this page.");
  }
}

export const voiceEngine = new VoiceNavigationEngine();

let hasAnnouncedInSession = false;

/**
 * Initializes the automated Gesture Trigger on first Tab or Space keypress per session.
 * - Listens for keydown where e.key === 'Tab' or 'Space'.
 * - Unlocks hardware audio context synchronously within the user gesture.
 * - Speaks the welcome tour clearly without preventing natural keyboard focus.
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

    // Speak the welcome tagline clearly using bulletproof forceSpeak
    forceSpeak(WELCOME_TOUR_TEXT, () => {
      isAnnouncingWelcome = false;
    });

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

  const handleFocusIn = (event: FocusEvent) => {
    const store = useAccessibilityStore.getState();
    if (!store.voiceModeEnabled) return;

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
      const promptText = promptElement.dataset.voicePrompt.trim();
      const message = /say yes/i.test(promptText)
        ? promptText
        : `${promptText} Say Yes to proceed, or say No to skip.`;
      speak(message, { cancelPrevious: true });
      return;
    }

    const label = computeAccessibleLabel(target);
    if (label) {
      speak(label, { cancelPrevious: true });
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
