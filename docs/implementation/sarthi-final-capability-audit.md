# Sarthi Final Capability Audit

## Overview
Comprehensive audit of the EXAMSARTHI AI Assistant (**Sarthi**) against the 12 core AI/study capabilities, verifying implementation state, real-data grounding, architecture isolation, exam safety, and next-step recommendations.

---

## Capability Audit Table

| # | Capability | Status | Existing File/Action | Missing Work |
|---|------------|--------|----------------------|--------------|
| 1 | **Weak Area Analysis**<br>*(e.g., "What are my weak areas?")* | **IMPLEMENTED** | `src/lib/assistant/sarthiActions.ts`<br>Action: `WHAT_ARE_MY_WEAK_AREAS` | Fully implemented using real `getCandidateDashboardAnalytics()` data. Identifies subjects with accuracy < 70% and formats spoken percentage breakdown. |
| 2 | **Personalized Practice Recommendation**<br>*(e.g., "What should I practice?")* | **IMPLEMENTED** | `src/lib/assistant/sarthiActions.ts`<br>Action: `WHAT_SHOULD_I_PRACTICE` | Fully implemented using real subject analytics. Ranks weakest subjects by lowest accuracy and recommends targeted practice areas. |
| 3 | **Performance Analysis**<br>*(e.g., "How am I doing?")* | **IMPLEMENTED** | `src/lib/assistant/sarthiActions.ts`<br>Action: `GET_PERFORMANCE_SUMMARY` | Fully implemented using real analytics (`averageAccuracy`, `completedAttemptsCount`). Provides spoken summary of overall performance. |
| 4 | **Improvement Guidance**<br>*(e.g., "How can I improve my score?")* | **IMPLEMENTED** | `src/lib/assistant/sarthiActions.ts`<br>Action: `HOW_SHOULD_I_IMPROVE` | Fully implemented. Pinpoints lowest-scoring subject and provides concrete focus recommendations based on real candidate data. |
| 5 | **Personalized Study Plan**<br>*(e.g., "Make me a study plan.")* | **NOT IMPLEMENTED** | None (falls back to `GENERAL_RESPONSE`) | Requires dedicated `GENERATE_STUDY_PLAN` action in `sarthiActions.ts` and `route.ts` that synthesizes subject metrics into a structured, time-apportioned study schedule. |
| 6 | **Weak Topic Analysis**<br>*(e.g., "Which Mathematics topics am I weak in?")* | **PARTIAL** | `src/lib/assistant/sarthiActions.ts`<br>Action: `WHAT_ARE_MY_WEAK_AREAS` | Currently operates at subject level. Needs dedicated `WHAT_ARE_MY_WEAK_TOPICS` action accepting `{ subject?: string }` payload to drill into sub-topic accuracy breakdown. |
| 7 | **Performance Trend**<br>*(e.g., "Am I improving?")* | **PARTIAL** | `src/lib/api/examRepository.ts`<br>(Calculates `trendDiff`) | Analytics engine computes `trendDiff` across recent attempts, but lacks a dedicated `GET_PERFORMANCE_TREND` action in Sarthi to report progress delta verbally. |
| 8 | **Personalized Practice Start**<br>*(e.g., "Start practice for Mathematics.")* | **IMPLEMENTED** | `src/lib/assistant/sarthiActions.ts`<br>Action: `START_PRACTICE` | Fully implemented. Maps subject to valid slug, navigates safely to `/practice?subject=<slug>`, and provides voice confirmation. |
| 9 | **Next-Test Preparation**<br>*(e.g., "How should I prepare for my next test?")* | **PARTIAL** | `src/lib/assistant/sarthiActions.ts`<br>Action: `HOW_SHOULD_I_IMPROVE` | Partially covered by general improvement advice; needs `PREPARE_NEXT_TEST` action combining time management pacing and high-frequency error categories. |
| 10 | **Goal-Based Guidance**<br>*(e.g., "I want to improve my Mathematics score.")* | **PARTIAL** | `src/lib/assistant/sarthiActions.ts`<br>Action: `START_PRACTICE` | Currently routes to practice for the subject; needs `SET_GOAL_GUIDANCE` action calculating accuracy gap (current % vs target) and milestone steps. |
| 11 | **Performance-Based Recommendation**<br>*(e.g., "What should I focus on this week?")* | **PARTIAL** | `src/lib/assistant/sarthiActions.ts`<br>Action: `WHAT_SHOULD_I_PRACTICE` | Recommends immediate subject; needs `GET_WEEKLY_FOCUS` action synthesizing multi-priority recommendations from `analytics.recommendations`. |
| 12 | **Natural Study Questions**<br>*(e.g., "Why is my score low?")* | **PARTIAL** | `src/app/api/ai/sarthi/route.ts`<br>Action: `GENERAL_RESPONSE` | Groq provides general contextual responses; needs diagnostic context (unattempted questions, wrong answers, time exhaustion) injected into analytics reasoning. |

---

## Status Categorization

### 1. Already Working (Fully Grounded in Real Data)
- **Weak Area Analysis** (`WHAT_ARE_MY_WEAK_AREAS`): Extracts real subject accuracies, filters <70%, speaks exact figures.
- **Personalized Practice Recommendation** (`WHAT_SHOULD_I_PRACTICE`): Sorts lowest accuracy subjects, speaks prioritized recommendation.
- **Performance Summary** (`GET_PERFORMANCE_SUMMARY`): Reads total completed attempts and average accuracy.
- **Improvement Guidance** (`HOW_SHOULD_I_IMPROVE`): Targeted feedback identifying weakest subject.
- **Personalized Practice Start** (`START_PRACTICE`): Whitelisted route navigation to `/practice?subject=<slug>`.

### 2. Partially Working (Underlying Data or General Action Exists)
- **Weak Topic Analysis**: Subject-level analytics exist; sub-topic query payload needs dedicated handling.
- **Performance Trend**: `trendDiff` is computed in `examRepository.ts` but needs a dedicated spoken Sarthi action handler (`GET_PERFORMANCE_TREND`).
- **Next-Test Preparation**: Broad improvement guidance works; test pacing / strategy checklist needs dedicated action.
- **Goal-Based Guidance**: Routing to target subject works; target milestone calculation needs dedicated handler.
- **Weekly Focus**: Priority-ranked recommendations exist on dashboard; weekly schedule articulation needs dedicated action.
- **Natural Diagnostic Questions**: `GENERAL_RESPONSE` works conversationally; root-cause diagnostic data (unattempted vs incorrect breakdown) needs integration.

### 3. Not Implemented
- **Personalized Study Plan**: Requires new action `GENERATE_STUDY_PLAN` synthesizing available study hours with weak subject weights.

---

## Architectural & Safety Verification

1. **Active Exam Sarthi Lock**: **VERIFIED**
   - Sarthi is strictly disabled whenever `isExamRoute(pathname)` or `isExamActiveNow()` is `true` (`/exam`, `/exam/*`, `/exam?*`).
   - Widget renders `null`, mic is stopped (`abort()`), `Alt+S` is blocked, and API rejects requests with `403 Forbidden`.
   - Automatically restored only on `/results` following verified exam submission.
2. **Exam Voice Mode Independence**: **VERIFIED**
   - Exam accessibility controls (`useVoiceMode` / `VoiceExamPanel`) handle *Next*, *Previous*, *Option Selection*, *Flag*, and *Submit* completely independent of Sarthi.
3. **Real Performance Data Grounding**: **VERIFIED**
   - Sarthi exclusively queries `getCandidateDashboardAnalytics()`. Zero synthetic or invented data.
4. **Local Fallback Resilience**: **VERIFIED**
   - When offline or in local demo mode, analytics fall back seamlessly to `sessionStorage`/`localStorage` attempt history.
5. **Navigation Security**: **VERIFIED**
   - `NAVIGATE` and `START_PRACTICE` enforce strict path whitelisting (`/dashboard`, `/exam`, `/results`, `/settings`, `/practice`, `/`). Arbitrary URLs and script injections are blocked.

---

## Recommended Implementation Order

1. **Phase 1: Performance Trend & Diagnostic Actions** (Low risk, high impact)
   - Add `GET_PERFORMANCE_TREND` (uses existing `trendDiff` in `examRepository.ts`).
   - Add `DIAGNOSE_SCORE` (examines unattempted count vs accuracy drop).
2. **Phase 2: Granular Topic Analysis & Goal Guidance**
   - Add `WHAT_ARE_MY_WEAK_TOPICS` (topic-level drill-down per subject).
   - Add `SET_GOAL_GUIDANCE` (milestone roadmap for target scores).
3. **Phase 3: Study Planning & Weekly Focus**
   - Add `GENERATE_STUDY_PLAN` and `GET_WEEKLY_FOCUS` (structured time allocation).
