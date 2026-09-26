# EXAMSARTHI — Accessible Online Examination Platform

An accessibility-first, server-evaluated online examination and practice platform designed to empower visually impaired and neurodiverse candidates to independently prepare for and participate in competitive examinations with total dignity, security, and fairness.

---

## 🎯 Problem Statement

Most national and state competitive examination portals and test-prep applications are built without genuine accessibility considerations:
- Screen readers encounter inaccessible custom widgets, broken reading orders, missing ARIA live regions, and unannounced countdown timers.
- Keyboard-only navigation is frequently trapped, lacks visible focus rings, or requires pointer/mouse interaction.
- Fast-paced timed exams induce high cognitive load when candidate accommodations (text scaling, high-contrast borders, audio assistance, sectional timing) are missing or fragmented.
- Client-only grading and question storage expose answer keys to browser inspection, compromising examination integrity.

---

## 💡 Solution: The EXAMSARTHI Architecture

EXAMSARTHI provides a standardized, tamper-resistant examination environment built for complete candidate independence and institutional integrity:

1. **Full WCAG 2.1 AA Accessibility End-to-End**:
   - 100% keyboard-navigable (`Tab`, `Shift+Tab`, `Arrow` keys, `Enter`, `Space`, `Escape`) with distinct visible focus rings.
   - Semantic HTML5 landmarks (`<header>`, `<nav>`, `<main id="main-content">`, `<section>`, `<aside>`).
   - Screen-reader dynamic state announcements via ARIA live regions (`polite` and `assertive`).
   - Text scaling (16px, 18px, 20px), theme switching (Light, Dark, System), and High-Contrast mode.

2. **Hands-Free Voice Examination Mode**:
   - Native Web Speech API integration supporting voice command recognition and audio question readout.
   - Dual language support (English & Hindi) for voice commands and feedback.
   - Automatic keyboard and visual fallback with zero disruption if microphone permissions are denied or unavailable.

3. **Secure Server-Evaluated Grading & Sectional Timing**:
   - **Candidate-Safe Question Delivery**: Raw answer keys (`correct_answer`, `acceptable_answers`) are strictly protected on the server; zero answer keys exist in the client bundle.
   - **Official Database Grading**: Official scores, accuracy percentages, and subject breakdowns are calculated and persisted server-side via Supabase PostgreSQL.
   - **Sectional Timing Enforcement**: Per-section time limits with auto-advancing countdowns and server-side anti-tamper checks that reject answer modifications for closed or expired sections.
   - **Offline Resilience**: Automatic fallback to local evaluation if network connectivity is interrupted during practice.

4. **Live Candidate Performance Analytics**:
   - Real-time dashboard synchronized with Supabase database attempts.
   - Multi-subject diagnostic breakdown, historical score trends, and weak-area identification (<70% accuracy) driving personalized practice recommendations.

---

## ✨ Core Features Matrix

| Feature | Capabilities |
|---|---|
| **Accessible Exam Engine** | Semantic `<fieldset>` / `<legend>` options, multi-modal status indicators, non-spamming timer milestone announcements, and double-confirmation dialogs. |
| **Sectional Timing Support** | Real-time section switching, section-specific time limits, auto-advance on expiration, and server anti-tamper enforcement. |
| **5 Question Formats** | Single-choice, multiple-choice, true/false, short answer, and fill-in-the-blank with server-side normalization. |
| **Voice Examination Mode** | Dual-language (EN/HI) voice command recognition, auditory question/option playback, and instant keyboard fallback. |
| **Candidate Dashboard** | Real-time analytics backed by live Supabase attempts, subject performance radar, and weak-topic practice shortcuts. |
| **Accessibility Settings** | Real-time controls for Text Size (16px/18px/20px), Contrast Themes, Audio Assistance, Reduced Motion, and Voice Speed. |
| **Candidate Profile Sync** | Secure candidate authentication via `@supabase/ssr` cookies and cloud-synced profile metadata. |

---

## 🛠 Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict type checking)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Row-Level Security, Cookie SSR Auth)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with Vanilla CSS design tokens
- **UI Primitives**: Accessible primitives adapted from [shadcn/ui](https://ui.shadcn.com/) / Radix UI
- **Icons**: [Lucide React](https://lucide.dev/)
- **Audio & Speech**: Browser Web Speech API (`SpeechRecognition`, `speechSynthesis`)

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- Node.js (v18.17+ or v20+)
- npm, pnpm, or yarn

### 1. Clone & Install
```bash
git clone https://github.com/saksham190606/EXAMSARTHI.git
cd EXAMSARTHI
npm install
```

### 2. Environment Configuration
Copy the provided `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
*(The repository is configured to connect to the project's Supabase instance with Row-Level Security).*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

*(Windows PowerShell users: run via `cmd /c npm run dev` if execution policies restrict npm scripts).*

### 4. Production Build & Test
```bash
# Typecheck
cmd /c "npx tsc --noEmit"

# Build production bundle
cmd /c "npm run build"

# Run automated hardening & security test suite
cmd /c "npx tsx scripts/verify_phase7e8.ts"
```

---

## 🎭 Guided Demo & Evaluation Script (For Judges)

### Demo Candidate Credentials
- **Email**: `priyansh.sharma@example.com`
- **Password**: `Examsarthi@2026`

### Recommended Walkthrough Flow:
1. **Landing Page (`/`)**:
   - Press `Tab` immediately upon loading to reveal the accessible **"Skip to main content"** link.
   - Review the WCAG AA contrast, clean typography, and feature overview.
2. **Accessibility Settings (`/settings`)**:
   - Toggle Text Size between Normal (16px), Large (18px), and Extra Large (20px). Notice instant proportional scaling.
   - Switch themes (Light / Dark / High-Contrast).
   - Update Candidate Profile name and observe cloud synchronization.
3. **Candidate Dashboard (`/dashboard`)**:
   - Log in using the demo credentials to view live Supabase-backed performance analytics.
   - Review historical attempts, subject accuracy cards, and personalized recommendations.
4. **Practice Hub (`/practice`)**:
   - Filter practice sets by Subject, Topic search, and Difficulty.
   - Test empty state search filtering and clear filters with a single click.
5. **Sectioned Exam Simulation (`/exam?exam=e2`)**:
   - Start the **SSC CGL Tier 1 Full Mock Exam (Multi-Section)**.
   - Notice the **Sectional Timing Active** badge and active Section 1 countdown timer.
   - Enable **Voice Examination Mode** (click mic or press `Alt+V`) and try voice commands (*"Option B"*, *"Next"*, *"Flag Question"*).
   - Test section locking: click "Next Section" to lock Section 1 and advance to Section 2.
6. **Submission & Official Results (`/results`)**:
   - Open submit confirmation dialog, review answered/unanswered counts, and confirm submission.
   - Observe the server-evaluated score, question-by-question review with explanations, and diagnostic topic recommendations.

---

## 👥 Contributors & Team

| Contributor | Role | Focus Area |
|---|---|---|
| **Saksham** | Team Lead + Core Developer | Full-Stack Architecture, Exam Engine, Voice & Accessibility Systems |
| **Prakhar Pal** | Data + Testing / QA | Exam Datasets, Test Scenarios, QA & Analytics Support |
| **Priyansh** | Accessibility & Research | WCAG 2.1 AA Audits, Screen-Reader Testing, Keyboard Usability |
| **Tanmay** | UI/UX & Presentation | UI/UX Design, Layout Review, Presentation & Pitch |

---

## ⚠️ Known Limitations

1. **Browser Speech Recognition**: Voice Mode relies on the standard W3C Web Speech API, natively supported in Chromium-based browsers (Google Chrome, Microsoft Edge, Brave, Opera). In browsers lacking speech recognition (such as Firefox or Safari on iOS), EXAMSARTHI automatically activates an accessible keyboard fallback.
2. **Audio Output Voices**: Synthesis voice options depend on local operating system voice packs installed on the candidate's device.
3. **Session Resumption**: If a candidate refreshes mid-exam, saved answers persist on the server, but section elapsed countdowns reflect wall-clock server time to prevent clock tampering.

---

## 👥 The EXAMSARTHI Team

| Member | Focus Area |
|---|---|
| **Saksham** | Team Lead, Full-Stack Architecture, Supabase SSR & Security |
| **Priyansh** | Accessibility Testing, WCAG Compliance & QA |
| **Tanmay** | UI/UX Design, Design System & Presentation |
| **Prakhar** | Test Question Bank, Data Modeling & Validation |

---

## 🏆 Hackathon Status: Feature-Complete

EXAMSARTHI is feature-complete, fully hardened, and production-ready for hackathon demonstration. All ten audit areas have been rigorously verified.
