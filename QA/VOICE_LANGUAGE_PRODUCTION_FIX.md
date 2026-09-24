# QA Report: Voice Mode & Language Switch Production Fix

**Document:** `QA/VOICE_LANGUAGE_PRODUCTION_FIX.md`  
**Date:** September 2026  
**Environment:** Next.js 16.3.5 / Turbopack / Vercel Production Environment  
**Status:** PASSED & VERIFIED  

---

## 1. Executive Summary

During production testing on Vercel, two critical issues were identified:
1. **Voice Examination Mode Loop:** Voice mode repeatedly announced *"I didn't catch that"* in an uncontrolled loop without successfully processing candidate commands.
2. **Language Switch Disconnect:** The English/Hindi language toggle in the navigation header updated the underlying accessibility store, but interface components did not re-render localized strings.

Both issues have been resolved cleanly with minimal, production-safe fixes:
- The infinite loop and microphone collision were eliminated in `useVoiceMode.ts`.
- The Web Speech recognition engine now dynamically responds to candidate language preference (`en-IN` vs `hi-IN`).
- A lightweight, reactive translation system (`src/lib/i18n.ts`) was implemented and bound directly to `useAccessibilityStore.language`.
- Full build validation passed with zero TypeScript and zero compilation errors.
- End-to-end browser verification verified seamless real-time switching between English and Hindi across the Dashboard and Exam pages.

---

## 2. Root Cause Analysis

### A. Voice Mode Repeated "I didn't catch that" Bug

1. **Silence/No-Speech Error Misclassification:**
   - In `SpeechRecognition.onerror`, the `'no-speech'` event (which fires automatically when a candidate is quietly thinking or reading a question) was treated as an unrecognized command or generic failure.
   - This erroneously invoked `speak("I didn't catch that.", () => startListening())` every 5–8 seconds during quiet contemplation.

2. **Microphone Acoustic Feedback & Speech Synthesis Collision:**
   - While `speechSynthesis.speak()` was active (reading question prompts or giving audio feedback), the microphone was still open and recording.
   - The microphone picked up the computer's own speaker output, transcribed partial audio fragments, passed them to the parser as non-command text, and triggered another *"I didn't catch that"* utterance.
   - This created an acoustic and state feedback loop that perpetually blocked the candidate from issuing actual commands.

3. **Hardcoded Recognition Language:**
   - `SpeechRecognition.lang` was statically set to `'en-US'` regardless of the user's selected examination language, causing Indian English accents and Hindi phrases to be transcribed with high error rates.

4. **Rigid Parsing:**
   - The parser required exact string equality and did not account for natural speech prefixes (e.g., *"Select option B"*, *"विकल्प 2"*, *"अगला प्रश्न"*, or numeric answers like *"1"*, *"2"*).

---

### B. Interface Language Switch Bug

1. **State Isolation without Consumer Components:**
   - `useAccessibilityStore` tracked `language: 'en' | 'hi'` and persisted it to `localStorage`, but application pages and components (Header, Dashboard, Practice, Exam, Settings, Results) contained hardcoded English string literals.
   - No reactive translation dictionary or consumer hook existed to translate UI labels when `language` changed.

---

## 3. Files Changed

| File | Changes Made |
| :--- | :--- |
| `src/lib/i18n.ts` | **Created** lightweight reactive translation module with complete English & Hindi dictionaries for all platform labels. Provides `useTranslation()` hook and `getTranslation()` utility. |
| `src/lib/voice/voiceParser.ts` | **Updated** command parser with regex-based normalization, supporting command synonyms, prefixes (`select`, `choose`), numerical options (`1` to `4`), and bilingual Indian English / Hindi phrases (`विकल्प`, `अगला`, `पिछला`, `समय`, `सबमिट`). |
| `src/hooks/useVoiceMode.ts` | **Fixed** infinite loop: silent recovery on `'no-speech'`, acoustic collision prevention (stops recognition before speech and flushes audio buffer with 250ms delay before resuming), dynamic language binding (`en-IN` / `hi-IN`), Indian/Hindi TTS voice selection fallback. |
| `src/components/layout/Header.tsx` | **Connected** navigation items, language selector, and skip links to `useTranslation()`. |
| `src/components/layout/MobileNav.tsx` | **Connected** mobile navigation drawer links to `useTranslation()`. |
| `src/components/voice/VoiceExamPanel.tsx` | **Connected** voice panel headers, state badges (`सुन रहा है...`, `बोल रहा है...`, `Listening...`), and command cheat sheet labels to `useTranslation()`. |
| `src/components/exam/ExamTimer.tsx` | **Connected** time remaining labels, milestone screen-reader announcements, and low-time warnings to `useTranslation()`. |
| `src/components/exam/SubmitDialog.tsx` | **Connected** submission confirmation modal, count metrics, and warnings to `useTranslation()`. |
| `src/app/exam/page.tsx` | **Connected** exam toolbar, question counters, navigation buttons, review flags, and palette triggers to `useTranslation()`. |
| `src/app/dashboard/page.tsx` | **Connected** dashboard welcome header, action buttons, metrics snapshot cards, and recommendations to `useTranslation()`. |
| `src/app/practice/page.tsx` | **Connected** practice header, search placeholders, filter dropdowns, and set action buttons to `useTranslation()`. |
| `src/app/settings/page.tsx` | **Connected** accessibility settings headings, option descriptions, and language selector to `useTranslation()`. |
| `src/app/results/page.tsx` | **Connected** examination score overview, outcome breakdowns, subject performance headers, and action buttons to `useTranslation()`. |

---

## 4. Exact Behavior Fixed

1. **Loop Prevention on Silence:**
   - Candidate quiet periods produce normal `'no-speech'` events; the hook now transitions silently back to `'Listening'` without triggering any spoken audio or error prompts.
2. **Acoustic Separation:**
   - When the system speaks (e.g., question text or confirmation), `stopListening()` is called synchronously, `isSpeakingRef` is set, and a 250ms silence buffer is enforced before re-enabling the microphone.
3. **Single Concise Error on Unknown Input:**
   - If an unrecognized speech command is registered, the system announces one concise reminder (*"Command not recognized. Please say Option A, B, C, D, Next, or Repeat."* / *"कमांड समझ नहीं आया। कृपया विकल्प ए, बी, सी, डी या अगला कहें।"*) and returns to `'Listening'`. No cascading repeat loop is possible.
4. **Reactive Hindi/English Toggling:**
   - Clicking the language dropdown in the header or changing the setting in `/settings` instantaneously switches all visible text across the entire interface without page reload.
5. **Dynamic Speech Engine Adaptation:**
   - When set to English, recognition uses `en-IN` and synthesis selects an Indian English voice.
   - When set to Hindi, recognition switches to `hi-IN` and synthesis selects a Hindi voice where provided by the browser.

---

## 5. Browser Compatibility & Environmental Considerations

- **Native Web Speech API:**
  - Employs native `window.SpeechRecognition || window.webkitSpeechRecognition` and `window.speechSynthesis`.
  - Zero external third-party speech libraries or cloud speech API keys were added.
- **Unsupported Browser Behavior:**
  - If Web Speech API is absent (e.g., in some Firefox or headless browser configurations), the status displays `Unsupported` with an accessible fallback notice: *"Voice mode unavailable. You can use full keyboard navigation."*
  - The exam interface and full keyboard navigation remain 100% operational.
- **Microphone Permissions Denied:**
  - If a candidate denies microphone access, `onerror` catches `'not-allowed'`, sets the panel to `Error`, speaks one clear fallback message, and safely disengages voice mode.

---

## 6. Verification Results

### Build Verification
```
> examsarthi@0.1.0 build
> next build

▲ Next.js 16.3.5 (Turbopack)
✓ Compiled successfully
  Running TypeScript ...
  Finished TypeScript in 4.3s ...
✓ Generating static pages (9/9) in 1455ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /dashboard
├ ○ /exam
├ ○ /practice
├ ○ /results
└ ○ /settings
○  (Static)  prerendered as static content
```
*Result: 0 errors, 0 warnings.*

### Browser End-to-End Test Suite

| Test Case | Expected Behavior | Observed Result | Status |
| :--- | :--- | :--- | :--- |
| **Language Switch: English $\rightarrow$ Hindi** | Navigation and Dashboard text switch to Hindi | Header updated to `डैशबोर्ड`, `अभ्यास`, `परीक्षा`. Heading changed to `वापसी पर स्वागत है`. | **PASS** |
| **Exam Page in Hindi** | Controls and voice panel display Hindi labels | Buttons show `पिछला`, `अगला`, `परीक्षा सबमिट करें`. Voice panel shows `आवाज परीक्षा मोड`, `सुन रहा है...`. | **PASS** |
| **Language Switch: Hindi $\rightarrow$ English** | Immediate dynamic revert to English | Header and Exam controls switched back to `Previous`, `Next`, `Submit Exam`. | **PASS** |
| **Silence Timeout ('no-speech')** | Silent recovery without loop | System remained quietly in `Listening` state; no repeated audio announcements. | **PASS** |
| **Voice Command Parsing: Options** | Supports letters, numbers, synonyms | Both `"Option B"` and `"2"` / `"विकल्प बी"` resolve to letter index 1. | **PASS** |
| **Voice Command Parsing: Navigation** | Handles `"Next"`, `"Previous"`, `"अगला"`, `"पिछला"` | Correctly executes exam engine navigation. | **PASS** |
| **Voice Command Parsing: Submission Safeguard** | Two-step confirmation for submit | Prompts candidate for confirmation (*"Say yes or no"* / *"हाँ या नहीं कहें"*); does not prematurely end exam. | **PASS** |
| **Keyboard Navigation Preserved** | Full Tab, Enter, Space, and Arrow key control | Exam and controls remain completely accessible without voice. | **PASS** |

---

## 7. Remaining Browser-Specific Limitations

- **Speech Recognition Engine Availability:**
  - The Web Speech API is primarily supported in Chromium-based browsers (Chrome, Edge, Brave, Opera) and Safari on iOS/macOS. In browsers without SpeechRecognition (such as standard Firefox desktop), Voice Mode gracefully displays an "Unavailable" badge while maintaining full keyboard and screen-reader accessibility.
- **Synthesizer Voice Packaging:**
  - Availability of native Hindi speech synthesis voices (`hi-IN`) depends on the operating system voice packs installed on the candidate's machine (e.g., Google Hindi on Android/Chrome, Microsoft Swara/Madhur on Windows 11). If a Hindi voice is unavailable, synthesis gracefully falls back to the default available system voice without crashing.
