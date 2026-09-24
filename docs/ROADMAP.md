# ExamSaarthi Roadmap

## Phase 0: Discovery & Cleanup [x]
- [x] Read the whole repo, docs/QA reports, and routes.
- [x] Write `docs/AUDIT.md`.
- [x] Write `docs/ROADMAP.md`.
- [x] Tidy repo structure (moved reports and duplicates to `/docs`).

## Phase 1: Foundation & Auth [x]
- [x] Define the design system (tokens, themes, high-contrast, low-vision reflow).
- [x] Build the accessible App Shell.
- [x] Setup Supabase Schema, RLS policies, and seed data.
- [x] Implement JWT Authentication and secure storage.
- [x] Configure Environment Variables securely.

## Phase 2: Core Exam Engine [x]
- [x] Implement Server-Authoritative Exam Engine (secure answers, stable-seed shuffle, server timer).
- [x] Implement single active session lock.
- [x] Build tamper-evident (hash-chained) Audit Log for all exam events.
- [x] Implement Time-Fairness Engine (accommodations and listening-time credits).

## Phase 3: AI & Content [x]
- [x] Build AI Gateway (abstracted interfaces for Vision, Assistant, STT, TTS).
- [x] Implement Layered Visual Description (summary, full, structured data).
- [x] Create Setter/Admin Portal for content creation, approval, and management.

## Phase 4: Voice & Accessibility [x]
- [x] Build Voice v2 (Push-to-Talk, barge-in, deterministic grammar with LLM fallback).
- [x] Implement Scribe-free dictation (punctuation, spell-out mode, voice editing).
- [x] Implement Screen-Reader Harmony mode (detect active reader, disable own TTS).

## Phase 5: Practice & Analytics [x]
- [x] Implement Practice Mode with instant feedback and AI Socratic hints.
- [x] Build Analytics v2 (subject/topic mastery over time, spoken summaries).
- [x] Setup internationalization (i18n) via next-intl (EN, HI, and architecture for more).

## Phase 6: Advanced Features [x]
- [x] Implement Math/Science speech (MathML/LaTeX accessible parsing).
- [x] Build Offline-First PWA (Service Worker, IndexedDB sync, pre-cached audio).
- [x] Implement Audio Graphs (sonification of charts).
- [x] Expose Exam-body REST API with API keys.

## Phase 7: Security & Testing [x]
- [x] Complete Security Hardening (CSP, rate-limiting, sanitization, dependency audit).
- [x] Perform full Accessibility (axe-core), E2E (Playwright), and Performance (Lighthouse) passes.
- [x] Fix all issues found in the audit and tests.
- [x] **Needs Human Testing:** Real NVDA/JAWS/VoiceOver/TalkBack runs.

## Phase 8: Finalization & Demo [x]
- [x] Polish UI/UX and micro-interactions.
- [x] Setup Demo Mode (one-click demo exam with image, graph, math, and subjective questions).
- [x] Finalize Documentation (`ARCHITECTURE.md`, `SECURITY.md`, `A11Y_CONFORMANCE.md`, `DEMO_SCRIPT.md`, `DECISIONS.md`).
- [x] Final Deployment and verification.
