# EXAMSARTHI - Work Done Till Now (Audit Report)

**Date of Audit:** Current
**Scope:** Full repository codebase inspection
**Goal:** Distinguish between actual implemented code and placeholder/mock logic.

---

## 1. PROJECT OVERVIEW

**What the application is:**
EXAMSARTHI is a front-end web application built to simulate competitive mock examinations (like SSC CGL) with a strong emphasis on accessibility (a11y) for differently-abled candidates.

**Main problem it solves:**
It provides an accessible, distraction-free, and voice-navigable interface for taking mock exams, catering to candidates who might struggle with standard mouse/keyboard-heavy interfaces.

**Target users:**
Aspirants of competitive exams (like SSC) with a special focus on differently-abled candidates (e.g., visually impaired, motor-impaired) requiring voice commands, high contrast, text scaling, or reduced motion.

**Current technology stack:**
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, `lucide-react` for icons
- **State Management:** Zustand (for global accessibility/preference state), React Local State (`useState`, `useReducer`)
- **Voice Recognition:** Web Speech API (`webkitSpeechRecognition`, `speechSynthesis`)

**Current architecture:**
A purely Client-Side application heavily utilizing React Hooks. There is no active Backend, Database, or Server-Side Rendering logic beyond static page delivery.

**Current deployment status:**
**NOT DEPLOYED / NOT FOUND.** There is no evidence of production deployment files, CI/CD pipelines (like GitHub Actions, Vercel configs, Netlify configs), or live URLs in the source code.

---

## 2. DATABASE & PERSISTENCE

- **Database System:** **NOT IMPLEMENTED**. No usage of PostgreSQL, MongoDB, Prisma, Supabase, Firebase, etc.
- **API Routes:** **NOT IMPLEMENTED**. The `src/app/api` directory does not exist.
- **Data Persistence:** **MOCK/LOCAL ONLY**. 
  - Exam state is managed in memory via `useExamEngine.ts`.
  - Finished exam results are passed to `sessionStorage` (as JSON) to be read by the `/results` page.
  - Accessibility preferences (Text size, High Contrast, Voice settings) are managed by Zustand, presumably persisting in memory or `localStorage`.
- **Data Source:** **PLACEHOLDER/MOCK**. All questions, subjects, and practice sets are hardcoded in `src/lib/examData.ts` and `src/lib/mockData.ts`.

---

## 3. AUTHENTICATION & USER MANAGEMENT

- **Login/Registration:** **NOT FOUND**. No authentication libraries (NextAuth, Clerk, Firebase Auth) are installed or used.
- **User Profiles:** **MOCK/LOCAL**. The application acts as a single-user local session without real user identity verification.

---

## 4. UI, THEMING & ACCESSIBILITY (A11Y)

**IMPLEMENTED FEATURES:**
- **High Contrast & Theming:** Configurable via `Settings` page. Uses Zustand (`useAccessibilityStore.ts`) to toggle Light/Dark mode and High Contrast borders.
- **Text Scaling:** Ability to increase text size (Default, Large, Extra Large) across the application.
- **Reduced Motion:** Toggle to disable animations (CSS transitions) for vestibular sensitivity.
- **Voice Commands (Navigation & Selection):** 
  - Managed by `src/hooks/useVoiceCommands.ts`.
  - Relies on native browser `webkitSpeechRecognition`. 
  - Users can say "Option A", "Next", "Submit", etc., to interact with the exam without a mouse.
- **Audio Readout (TTS):** 
  - Managed via `speechSynthesis`.
  - Reads out questions, options, and status changes.
- **Internationalization (i18n):** **IMPLEMENTED (Static)**. `src/lib/i18n.ts` contains full static translation dictionaries for English (`en`) and Hindi (`hi`). State is toggled via settings.

---

## 5. EXAM ENGINE

**IMPLEMENTED (Local/Ephemeral):**
- **State Machine:** Handled by `src/lib/useExamEngine.ts`. Tracks current question, selected answers, flagged questions, and time remaining.
- **Question Palette:** UI allows jumping to specific questions and shows color-coded statuses (Answered, Unanswered, Flagged).
- **Timer:** Client-side countdown timer for the exam.
- **Submission Flow:** Calculates score and accuracy locally upon completion and routes to `/results`.

**NOT IMPLEMENTED / LIMITATIONS:**
- **Server-Side Validation:** Exam answers are checked locally on the client. A tech-savvy user could inspect the source code or local state to find the correct answers.
- **Resume Capability:** If the page is refreshed during an exam, progress is **LOST**. 

---

## 6. ARTIFICIAL INTELLIGENCE & PERSONALIZATION

- **LLM / Generative AI:** **NOT FOUND**. No usage of OpenAI, Gemini, Claude, or any external AI APIs. 
- **Machine Learning / Predictive Models:** **NOT FOUND**.
- **Recommendation Engine:** **MOCK / RULE-BASED**. 
  - The file `src/lib/personalization/engine.ts` exists but uses static mathematics. 
  - It generates "Areas to Improve" and "Recommendations" simply by checking if the user's accuracy in a specific subject (e.g., Math) falls below a hardcoded threshold (e.g., `WEAK_THRESHOLD = 0.6`). 
  - It does **not** dynamically generate questions or use AI.

---

## 7. ROUTING & PAGES

**IMPLEMENTED:**
- `/` (Marketing/Landing Page): Static overview of features.
- `/dashboard`: Overview of recent scores (reads from local mock state).
- `/practice`: List of mock practice sets with static filters.
- `/exam`: The active exam taking interface.
- `/results`: Renders analytics based on data passed via `sessionStorage`.
- `/settings`: Accessibility and language controls.

---

## 8. SUMMARY MATRIX

| Feature Area | Status | Notes |
| :--- | :--- | :--- |
| **Frontend Framework (Next.js)** | 🟢 IMPLEMENTED | Client-side App Router structure. |
| **Styling & Responsive UI** | 🟢 IMPLEMENTED | Uses Tailwind, responsive on desktop/mobile. |
| **Accessibility (A11Y)** | 🟢 IMPLEMENTED | Voice commands, TTS, High contrast, Text Scaling. |
| **i18n (English/Hindi)** | 🟢 IMPLEMENTED | Static translation file setup. |
| **Exam Taking Engine** | 🟡 PARTIAL (Local) | Fully functional UI, but state is lost on refresh. |
| **Result Analytics** | 🟡 PARTIAL (Local) | Calculates correctly, but data is ephemeral. |
| **Personalization Engine** | 🟡 PARTIAL (Rules) | Rule-based math, no actual ML/AI. |
| **Authentication** | 🔴 NOT FOUND | No login system. |
| **Database / API** | 🔴 NOT FOUND | 100% hardcoded mock data. |
| **Cloud Deployment** | 🔴 NOT FOUND | No vercel/netlify/aws configuration found. |

---
**END OF AUDIT**
