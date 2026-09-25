# ExamSaarthi Accessibility (A11y) Conformance Report

ExamSaarthi is designed ground-up as a "voice-first, screen-reader-first" application, adhering strictly to **WCAG 2.2 Level AA** standards.

## 1. Authentication (Blind-First Auth)
- **Problem**: Visual CAPTCHAs and complex password requirements block visually impaired users.
- **Solution**: 
  - Implementation of **WebAuthn Passkeys** as the primary authentication method (discoverable credentials, OS-level biometrics/PIN).
  - Removal of passwords. Fallback to Magic Link.
  - **Voice Enrollment**: Instead of visual liveness checks, we capture a short spoken phrase to verify identity.

## 2. Core Exam Engine
- **Semantic HTML**: All exam interfaces utilize `<fieldset>` and `<legend>` for grouping radio buttons (MCQs), ensuring screen readers announce the context of the question with every option.
- **Timer and Status**:
  - The countdown timer is wrapped in `aria-live="polite"`, but the application uses custom milestone announcements (e.g., "10 minutes remaining") via the Web Speech API to prevent overwhelming the user with constant seconds ticking.
  - `role="alert"` is used for critical warnings (e.g., "5 minutes left" or "Exam Paused").
- **Question Navigation**: Buttons are clearly labeled with `aria-label` where visual icons exist, but most actions are explicitly text-based.

## 3. Data Sonification & Visualizations
- **Audio Graphs**: Visual dashboards (e.g., subject mastery progress bars) are accompanied by a "Listen to Trend" button. This uses the Web Audio API to map data points to frequencies, allowing non-visual comprehension of charts.
- **Spoken Summaries**: A native `speechSynthesis` integration reads out analytical summaries automatically.

## 4. Complex Subject Matter (Math & Science)
- Raw MathML/LaTeX is pre-processed before being sent to the TTS engine. A custom regex-based text transformer converts expressions like `\frac{1}{2}` into spoken English ("fraction 1 over 2") to ensure compatibility with all basic screen readers and OS-level TTS without requiring expensive third-party tools.

## 5. End-to-End Testing
- **Automated**: `axe-core` is integrated into Playwright E2E tests for all routes.
- **Manual Validations**: The DOM is strictly validated, but ultimate conformance is verified by navigating solely with keyboard (`Tab`, `Space`, `Enter`, `Arrow Keys`) and listening to NVDA/JAWS output.

## 6. Visual Design
- While React Three Fiber and Framer Motion are used on the landing pages for visual "wow" factor, the app strictly respects `@media (prefers-reduced-motion: reduce)` and allows users to toggle animations completely off. 
- The actual `/exam` taking interface contains ZERO 3D or motion components to maintain absolute calm and focus.
