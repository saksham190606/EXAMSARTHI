# Sarthi Phase 1: Performance Intelligence Implementation Report

## 1. Features Implemented

Phase 1 introduces core **Performance Intelligence** capabilities to Sarthi, grounding all responses in real candidate attempt data without inventing scores, topics, attempts, or trends:

1. **Performance Trend Analysis (`GET_PERFORMANCE_TREND`)**:
   - Resolves whether the candidate's performance is improving, declining, or stable compared to their prior attempt.
   - Accurately states the percentage point improvement or drop (e.g., *"Yes. Your recent performance is improving by 12 percentage points."*).
   - If declining, highlights their weakest subject area with its actual accuracy percentage.
   - Refuses to make speculative predictions about future exam outcomes.

2. **Score Diagnosis (`DIAGNOSE_SCORE`)**:
   - Evaluates completed test performance metrics (unattempted questions, incorrect answers, and subject accuracy dragging down overall score).
   - Clearly distinguishes between observed objective data (e.g., *"you left 4 questions unattempted in your latest test, and your Quantitative Aptitude accuracy is currently 45% which is significantly lowering your total score"*) and actionable study recommendations (*"I recommend focusing on your weakest areas and reviewing answer explanations to prevent losing marks"*).

3. **Weak Topic Analysis (`WHAT_ARE_MY_WEAK_TOPICS`)**:
   - Analyzes real candidate topic metrics aggregated across attempts.
   - Supports natural subject filters (e.g., "Mathematics", "Quant", "Reasoning", "English", "General Knowledge", "GK").
   - If topic-level breakdown is available, reports specific topics with their actual calculated accuracies (e.g., *"Your weakest Quantitative Aptitude topics are Algebra at 40% accuracy and Geometry at 50% accuracy."*).
   - If topic-level granularity is unavailable, gracefully falls back to reporting their overall subject accuracy or weakest subject without creating mock topics.

---

## 2. Actions Added

The following actions were added to the whitelisted Sarthi action architecture in [src/lib/assistant/sarthiActions.ts](file:///c:/Users/lenovo/OneDrive/Desktop/examsarthi/src/lib/assistant/sarthiActions.ts) and [src/app/api/ai/sarthi/route.ts](file:///c:/Users/lenovo/OneDrive/Desktop/examsarthi/src/app/api/ai/sarthi/route.ts):

| Action Name | Description | Example Voice Queries |
| :--- | :--- | :--- |
| `GET_PERFORMANCE_TREND` | Returns percentage point improvement/drop from candidate's recent attempts | *"Am I improving?"*, *"Is my performance improving?"*, *"How am I doing compared to previous tests?"* |
| `DIAGNOSE_SCORE` | Diagnoses root causes of score losses (unattempted, incorrect, low subject accuracy) | *"Why is my score low?"*, *"Why am I losing marks?"*, *"What's causing my low score?"* |
| `WHAT_ARE_MY_WEAK_TOPICS` | Returns weakest topics for a specific subject or across all attempts | *"Which Mathematics topics am I weak in?"*, *"What topics am I weak in?"*, *"Which topics should I practice?"* |

---

## 3. Existing Data Sources Used

All intelligence queries reuse the centralized analytics repository without duplicating calculation logic or creating a secondary database:

1. `getCandidateDashboardAnalytics()` from [src/lib/api/examRepository.ts](file:///c:/Users/lenovo/OneDrive/Desktop/examsarthi/src/lib/api/examRepository.ts):
   - `trend.trendDiff`: Pre-calculated delta in accuracy between the candidate's latest and previous attempts.
   - `trend.hasTrend`: Boolean flag indicating if at least 2 completed attempts exist.
   - `recentActivity`: Array of `CandidateActivityItem` objects storing `totalQuestions`, `attemptedCount`, `correctCount`, `accuracy`, and `score` for recent tests.
   - `subjectMetrics`: Array of `CandidateSubjectMetric` storing aggregated questions, attempted, correct, incorrect, and accuracy per subject.
   - `topicMetrics`: Array of `CandidateTopicMetric` storing aggregated accuracy per subject-topic pair.

2. Fallback Mechanism:
   - Preserves offline/local performance history fallback (`getPerformanceHistory()`) when remote Supabase attempts are unavailable.

---

## 4. How Topic-Level Analysis Works

1. In [src/lib/api/examRepository.ts](file:///c:/Users/lenovo/OneDrive/Desktop/examsarthi/src/lib/api/examRepository.ts), completed attempt `summary_metrics` are parsed for `topicMetrics` or nested `topics` within `subjectMetrics`.
2. Topics are aggregated under a normalized compound key `${subject}:::${topic}` summing `totalQuestions`, `attempted`, `correct`, and `incorrect`.
3. In `WHAT_ARE_MY_WEAK_TOPICS` in [src/lib/assistant/sarthiActions.ts](file:///c:/Users/lenovo/OneDrive/Desktop/examsarthi/src/lib/assistant/sarthiActions.ts):
   - Natural language subject queries are normalized (`math`/`quant` $\rightarrow$ `Quantitative Aptitude`, `reasoning`/`logic` $\rightarrow$ `Reasoning`, `gk`/`general knowledge` $\rightarrow$ `General Knowledge`, etc.).
   - Topic metrics are filtered by the target subject and sorted by lowest accuracy first.
   - Sub-70% accuracy topics are formatted into natural spoken sentences.

---

## 5. How Insufficient Data is Handled

When data is missing or incomplete, Sarthi never fabricates numbers:

- **Insufficient Completed Tests for Trend**:
  - Response: *"I don't have enough completed tests yet to determine your performance trend."*
- **Insufficient Attempt Details for Diagnosis**:
  - Response: *"I don't have enough detailed attempt data to determine exactly why your score is low yet. Complete a practice test and I can diagnose your performance."*
- **Missing Topic Data for a Specific Subject**:
  - Response: *"I don't have enough topic-level performance data for Quantitative Aptitude yet, but your overall Quantitative Aptitude accuracy is 50%."*
- **No Performance Data at all**:
  - Response: *"I don't have enough performance data yet to analyze your topics."*

---

## 6. Exam-Lock Verification

Active exam integrity is strictly enforced:
- Sarthi remains disabled during `/exam`, `/exam/*`, `/exam?set=p1`, `/exam?exam=...`.
- [src/app/api/ai/sarthi/route.ts](file:///c:/Users/lenovo/OneDrive/Desktop/examsarthi/src/app/api/ai/sarthi/route.ts) inspects `currentUrl` and returns `HTTP 403 Forbidden` (`{ error: "Sarthi is disabled during active exams." }`) for any exam path.
- Existing Exam Voice Mode (`NEXT`, `PREVIOUS`, `READ QUESTION`, `OPTION A-D`, etc.) operates independently through its own isolated handlers.

---

## 7. TypeScript Result

```bash
cmd /c npx tsc --noEmit
# Result: Exit code 0 (No type errors)
```

---

## 8. Build Result

```bash
cmd /c npm run build
# Result: Exit code 0
# Route (app)                              Size     First Load JS
# ┌ ○ /                                    142 B           137 kB
# ├ ○ /_not-found                          980 B           101 kB
# ├ ƒ /api/ai/sarthi                       0 B                0 B
# ├ ƒ /api/auth/callback                   0 B                0 B
# ├ ƒ /api/exam/active-questions           0 B                0 B
# ├ ƒ /api/exam/attempt                    0 B                0 B
# ├ ƒ /api/exam/submit                     0 B                0 B
# ├ ƒ /api/exams                           0 B                0 B
# ├ ƒ /api/health                          0 B                0 B
# ├ ƒ /api/mock/submit                     0 B                0 B
# ├ ƒ /api/user/analytics                  0 B                0 B
# ├ ○ /auth/login                          1.02 kB         138 kB
# ├ ○ /auth/signup                         1.02 kB         138 kB
# ├ ○ /dashboard                           8.63 kB         145 kB
# ├ ○ /exam                                44.8 kB         182 kB
# ├ ○ /practice                            2.49 kB         139 kB
# ├ ○ /results                             4.85 kB         142 kB
# └ ○ /settings                            3.84 kB         141 kB
# + First Load JS shared by all            99.9 kB
```

---

## 9. Manual & API Test Results

The following test queries were executed against the `/api/ai/sarthi` endpoint:

| Test # | Query | Expected Action | Returned Status & Action | Verified Output / Behavior |
| :--- | :--- | :--- | :--- | :--- |
| 1 | *"What are my weak areas?"* | `WHAT_ARE_MY_WEAK_AREAS` | `200 OK` - `WHAT_ARE_MY_WEAK_AREAS` | Identifies lowest accuracy subjects from `subjectMetrics` |
| 2 | *"Am I improving?"* | `GET_PERFORMANCE_TREND` | `200 OK` - `GET_PERFORMANCE_TREND` | Evaluates `trend.trendDiff` and reports delta |
| 3 | *"Why is my score low?"* | `DIAGNOSE_SCORE` | `200 OK` - `DIAGNOSE_SCORE` | Diagnoses unattempted, incorrect, and weak subjects |
| 4 | *"Which Mathematics topics am I weak in?"* | `WHAT_ARE_MY_WEAK_TOPICS` | `200 OK` - `WHAT_ARE_MY_WEAK_TOPICS` (payload: `{ subject: "Mathematics" }`) | Filters and reports Math topic metrics |
| 5 | *"What topics should I practice?"* | `WHAT_SHOULD_I_PRACTICE` / `WHAT_ARE_MY_WEAK_TOPICS` | `200 OK` - `WHAT_SHOULD_I_PRACTICE` | Returns personalized practice recommendations |
| 6 | Active Exam Lock (`currentUrl: "/exam?set=p1"`) | N/A (Blocked) | `403 Forbidden` | `{ error: "Sarthi is disabled during active exams." }` |
| 7 | *"How am I doing?"* | `GET_PERFORMANCE_SUMMARY` | `200 OK` - `GET_PERFORMANCE_SUMMARY` | Overall accuracy summary |
| 8 | *"How can I improve my score?"* | `HOW_SHOULD_I_IMPROVE` | `200 OK` - `HOW_SHOULD_I_IMPROVE` | Actionable subject guidance |
| 9 | *"Start practice for Mathematics"* | `START_PRACTICE` | `200 OK` - `START_PRACTICE` (payload: `{ subject: "Mathematics" }`) | Routes to `/practice?subject=quant` |

---

## 10. Exact Files Changed

The following files were modified for Phase 1:

1. `src/lib/api/examRepository.ts`
   - Added `CandidateTopicMetric` interface.
   - Added `topicMetrics` to `CandidateDashboardAnalytics`.
   - Implemented real topic aggregation logic in `getCandidateDashboardAnalytics()`.

2. `src/app/api/ai/sarthi/route.ts`
   - Added `GET_PERFORMANCE_TREND`, `DIAGNOSE_SCORE`, and `WHAT_ARE_MY_WEAK_TOPICS` to the whitelisted actions and Groq system schema prompt.

3. `src/lib/assistant/sarthiActions.ts`
   - Added `SarthiActionType` definitions for the 3 new actions.
   - Added handlers for `GET_PERFORMANCE_TREND`, `DIAGNOSE_SCORE`, and `WHAT_ARE_MY_WEAK_TOPICS` with English and Hindi voice support and data insufficiency fallbacks.
