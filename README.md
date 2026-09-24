# EXAMSARTHI

An accessibility-first online examination and practice platform designed to empower visually impaired candidates to independently prepare for and participate in competitive examinations.

---

## 🎯 Problem

Most digital examination portals and test-prep applications are built without genuine accessibility considerations:
- Screen readers encounter inaccessible custom widgets, broken reading orders, and unannounced dynamic countdown timers.
- Keyboard-only navigation is frequently trapped, lacks visible focus indicators, or requires pointer/mouse interaction.
- Fast-paced timed exams induce high cognitive load when candidate accommodations (e.g. text scaling, high-contrast borders, audio assistance) are missing or fragmented.

---

## 💡 Solution

EXAMSARTHI provides a standardized, distraction-free environment that prioritizes accessibility from the ground up:
- Complete end-to-end independence: candidates can discover topics, practice filtered question sets, take realistic mock exams, and review diagnostic performance analytics entirely via keyboard, screen reader, or speech.
- Zero external dependencies on third-party cloud AI APIs or authentication barriers, ensuring deterministic and reliable offline/client performance.
- Seamless compatibility across light, dark, and high-contrast environments with granular text scaling.

---

## ✨ Core Features

| Feature | Description |
|---|---|
| **Accessible Examination Engine** | Clean question layout with semantic `<fieldset>`/`<legend>` options, multi-modal status indicators, non-spamming timer milestone announcements, and confirmation safeguards. |
| **Keyboard-First Navigation** | 100% of workflows operate via standard keyboard navigation (`Tab`, `Shift+Tab`, `Arrow` keys, `Enter`, `Space`, `Escape`) with prominent focus rings. |
| **Screen-Reader-Oriented Interface** | Semantic HTML5 landmarks (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`), structured heading levels (`h1` → `h2` → `h3`), and accessible table semantics (`<th scope="col">`, `<th scope="row">`). |
| **Voice Examination Mode** | Native hands-free exam participation utilizing browser Web Speech API for voice command recognition and audio question readout, with instant keyboard fallback. |
| **Accessibility Customization** | Real-time preference controls for Text Size (16px, 18px, 20px), Theme (Light, Dark, System), High-Contrast Borders, Reduced Motion, Audio Assistance, and Voice Speed. |
| **Personalized Learning Engine** | Deterministic algorithmic recommendation engine identifying subject and topic weak areas (<70% accuracy) and linking directly to filtered practice sets. |
| **Performance Analytics** | Factual, non-judgmental results reporting with subject-level metrics, accuracy evaluation, and historical progress comparisons. |
| **Multilingual Foundation** | Platform language switching foundation (English & Hindi) for exam instructions and interface controls. |

---

## 🔊 Voice Accessibility
EXAMSARTHI heavily integrates the Web Speech API for seamless voice interaction. Candidates can trigger text-to-speech to read questions and options, adjust voice speed, or issue voice commands:
- Select answers: *"Option A"*, *"Option B"*, *"Option C"*, *"Option D"*
- Move between questions: *"Next"*, *"Previous"*
- Auditory review: *"Read Question"*, *"Repeat"*, *"How much time is left?"*
- Secure submission: *"Submit Exam"* (with double confirmation safeguards)

---

## ♿ Accessibility Principles
EXAMSARTHI is designed to align with **WCAG 2.1 AA** accessibility principles:
- **Perceivable**: Text scaling (16px, 18px, 20px), high-contrast modes, non-color-only state indicators.
- **Operable**: Full keyboard access, visible focus rings (`ring-2 ring-primary`), skip-to-content bypass.
- **Understandable**: Clear labels, non-judgmental performance feedback, distraction-free examination layout.
- **Robust**: Clean HTML5 semantic markup, accessible dialogs, and graceful degradation when browser speech APIs are unsupported.

---

## 🔄 Exam Flow
Landing (`/`) → Accessibility Settings (`/settings`) → Dashboard (`/dashboard`) → Practice (`/practice`) → Timed Exam (`/exam`) → Voice/Keyboard Interaction → Submit Confirmation Dialog → Results & Analytics (`/results`) → Personalized Practice

---

## 🛠 Technology Stack
- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI & Styling**: [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) (Base UI primitives), [Lucide React](https://lucide.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (with local storage persistence)
- **Theme Support**: [next-themes](https://github.com/pacocoursey/next-themes)
- **Speech & Audio**: Browser Web Speech API (`SpeechRecognition`, `speechSynthesis`)

---

## 🚀 Running Locally

### Prerequisites
- Node.js (v18.17+ or v20+)
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/saksham190606/EXAMSARTHI.git
   cd EXAMSARTHI
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. Run the production build:
   ```bash
   npm run build
   ```

5. Start the production server:
   ```bash
   npm run start
   ```

*(Windows PowerShell users: run with `cmd /c npm run dev` if execution policies restrict npm scripts)*

---

## 📚 Documentation
Detailed accessibility audits, implementation notes, and validation reports are available in the project documentation:
- [Accessibility Audits](./docs/accessibility/)
- [Implementation Reports](./docs/implementation/)
- [Testing & Validation](./docs/testing/)
- [Phase QA Reports](./QA/)

---

## 👥 Team
| Member | Role |
|---|---|
| **Saksham** | Team Lead + Core Developer |
| **Priyansh** | Accessibility Testing |
| **Tanmay** | UI/UX + Presentation |
| **Prakhar** | Data + Testing / QA |

---

## ⚠️ Known Limitations
- Speech recognition relies on native browser Web Speech API (supported in Chromium-based browsers like Chrome and Edge). In unsupported browsers, Voice Mode provides a clean fallback to standard keyboard-first navigation.
- The platform uses client-side local persistence (`localStorage` and `sessionStorage`) for privacy-preserving offline practice without requiring an external database.

---

## 🏆 Hackathon Highlight
EXAMSARTHI combines accessible examination layouts, native Text-to-Speech, intuitive voice commands, real-time personalization, and semantic HTML into a single cohesive, production-ready workflow.
