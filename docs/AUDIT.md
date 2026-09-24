# ExamSaarthi Audit Report

## 1. What Works (Current State)
- **Framework & UI Foundation:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, and next-themes are set up and functioning.
- **Routing:** Basic application routes exist (`/`, `/settings`, `/dashboard`, `/practice`, `/exam`, `/results`).
- **Client-Side State:** Zustand is working for local state management (currently using `localStorage` for persistence).
- **Base Accessibility:** The exam engine uses accessible semantic HTML (fieldset/legend), has timer milestone announcements, and keyboard navigation.
- **Voice Commands (v1):** Basic integration of the browser Web Speech API for commands (Option A-D, next/previous, read question, repeat, time left, submit).
- **Accessibility Preferences:** Users can adjust text size, theme, high contrast, reduced motion, and voice speed.
- **Analytics & Recommendations:** A basic rule-based weak-area recommender is implemented (identifying areas < 70%) along with foundational analytics.
- **Localization Foundation:** Initial structures for English (EN) and Hindi (HI) exist.

## 2. What's Broken / Missing
- **Backend & Database:** No active backend connection. All data persists entirely in the browser, preventing synchronization and data recovery.
- **Authentication & Authorization:** Missing entirely. No JWT, no user roles (Candidate vs. Setter/Admin).
- **AI Integration:** The promised AI accessibility layer (Vision AI for images, context-aware LLM assistant) is completely missing.
- **Voice UX (v2):** Current voice relies on an always-on mic that causes TTS echo. Missing push-to-talk, barge-in, and deterministic grammar with LLM fallback.
- **Complex Answer Types:** Missing Scribe-free subjective answers (dictation with punctuation, spell-out mode, editing). Missing accessible Math/Science speech (MathML/LaTeX parsing).
- **Audio Graphs:** Missing sonification for line/bar charts.
- **Screen-Reader Harmony:** No explicit mode to avoid double-speech when a system screen reader (NVDA/JAWS/VoiceOver/TalkBack) is active.
- **Time-Fairness Engine:** No compensatory time profile or listening-time credit logic.
- **Setter/Admin Portal:** Entirely missing.
- **Offline PWA:** Missing service worker, IndexedDB answer queue, and pre-cached audio.

## 3. What's Insecure
- **Exam Integrity (Critical):** The question bank and *correct answers* are sent to and live in the client browser bundle. This is unacceptable for a production exam.
- **Client-Side Authority:** The timer and state are authoritative on the client, making them trivial to manipulate.
- **Missing Audit Logs:** No tamper-evident logs for events like start, answer, pause, blur/focus, paste, or submit.
- **Missing Session Management:** No server-side session locks or rate-limiting to prevent concurrent logins or abuse.
- **No Identity Verification:** Lacks voice-liveness challenge or identity verification mechanisms.
- **Secrets Management:** The application lacks secure handling of environment variables for future integrations (AI, Auth, DB).
