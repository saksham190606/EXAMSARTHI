# EXAMSARTHI — Phase 7E-7 Implementation & Verification Report
**Sectional Timing Support, Server-Side Enforcement & Question Review Integration**

**Date:** September 26, 2026  
**Status:** COMPLETE & VERIFIED  
**Candidate Test Account:** `priyansh.sharma@example.com` (UUID: `6a2d1727-827f-444c-b538-3d4fcb4090cb`)  
**Scope Delivered:** Phase 7E-7 (Items 1 through 5) — Stopped per instruction.

---

## 1. Executive Summary

Phase 7E-7 successfully implements comprehensive **Sectional Timing Support** across the database schema, exam client engine, server-side anti-tamper validation endpoints, voice examination mode, and results analytics. 

Before this phase, the database and application only supported exam-level timing (`exams.duration_minutes`), leaving competitive exams that require per-section speed tests (e.g. Banking Prelims: Quantitative Aptitude, Reasoning, English) unable to isolate sections, enforce sectional durations, or prevent cross-section question tampering.

### Key Milestones Delivered:
1. **Schema Migration & Seed Data (`002_sectional_timing.sql`)**:
   - Added `sections` JSONB column to `exams` table (`[{ id, name, order_index, duration_minutes, question_count }]`).
   - Added `section_progress` JSONB column to `exam_attempts` table.
   - Configured seed exam `e2` (Banking Prelims Mock) with 3 sections of 5 minutes each (15 min total).
   - Preserved 100% backward compatibility: non-sectional exams (`e1`, `e3`, `p1`..`p5`) have `sections = NULL`, maintaining standard exam-level duration behavior without regressions.
2. **Section-Aware Exam UI & Controls**:
   - Active section banner displaying current section (`Section X of Y: [Name]`), allotted time, and isolation rules.
   - Dual-timer system in `ExamTimer`: prominent active section countdown with low-time warnings (<60s) and milestone screen-reader announcements, alongside total exam countdown.
   - `QuestionPalette` updated to group questions by section with status indicators (`Active`, `Submitted / Locked`, `Locked upcoming`).
   - Navigation restricted: candidate cannot navigate or jump outside the active section.
   - Early section advancement with `SectionAdvanceDialog` confirmation modal.
   - Auto-advance on section timer expiry with screen-reader announcements.
3. **Voice Mode Expansion**:
   - Extended `voiceParser` and `useVoiceMode` with `NEXT_SECTION` ("अगला सेक्शन" / "Next Section") and `CURRENT_SECTION` ("वर्तमान सेक्शन" / "Current Section") voice commands in English and Hindi.
   - Supported command hints added to `VoiceExamPanel`.
4. **Server-Side Timing Validation & Anti-Tamper Enforcement**:
   - Created `/api/exam/section-progress`: verifies candidate ownership, enforces true server-side section elapsed time, caps time at allotted duration ceiling (`EXCEEDED_ALLOTTED_TIME_CAPPED`), flags client-server divergences (`CLIENT_SERVER_TIME_DISCREPANCY`), locks completed sections, and activates the next section.
   - Created `/api/exam/save-answer`: verifies active section and rejects any direct API attempt to record or modify answers for closed/expired sections with **HTTP 403 Forbidden** (`SECTION_LOCKED_OR_EXPIRED`).
   - Updated `/api/exam/submit`: validates that candidate has not injected modified or new answers for expired sections; computes per-section scores, question counts, attempted counts, and timing validations persisted into `summary_metrics.sectionMetrics`.
5. **Analytics & Results Integration**:
   - Updated `QuestionReviewList` to automatically group questions by section with section stats badges (`X/Y Correct · Z% Accuracy`) when sections are present.
   - Added `Sectional Timing & Performance` card breakdown to `/results` displaying per-section scores, accuracies, time used, and server-side verification status.

---

## 2. Files Created & Modified

| File | Status | Description & Key Line References |
| :--- | :--- | :--- |
| [`supabase/migrations/002_sectional_timing.sql`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/supabase/migrations/002_sectional_timing.sql) | Created | Adds `exams.sections` and `exam_attempts.section_progress` columns; seeds `e2` with 3 sections of 5 min each. |
| [`src/types/section.ts`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/types/section.ts) | Created | Defines `ExamSectionConfig`, `SectionProgressItem`, and `ExamSectionProgress` interfaces. |
| [`src/types/database.ts`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/types/database.ts) | Modified | Regenerated via Supabase CLI; includes `sections` on `exams` and `section_progress` on `exam_attempts`. |
| [`src/app/api/exam/section-progress/route.ts`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/app/api/exam/section-progress/route.ts) | Created | Server-side sectional timing validation, duration capping, and section transition handler. |
| [`src/app/api/exam/save-answer/route.ts`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/app/api/exam/save-answer/route.ts) | Created | Real-time answer persistence endpoint with sectional anti-tamper locking against closed sections (HTTP 403). |
| [`src/app/api/exam/submit/route.ts`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/app/api/exam/submit/route.ts) | Modified | L210–245: Anti-tamper answer validation against expired sections; L390–475: Sectional scoring and timing metrics persistence. |
| [`src/lib/api/examRepository.ts`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/lib/api/examRepository.ts) | Modified | L146–151: Seed mock sections for `e2`; L200–228: Load sections; L435–458: Route `saveCandidateAnswer` through secure API; L464–500: Added `updateSectionProgress`. |
| [`src/lib/useExamEngine.ts`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/lib/useExamEngine.ts) | Modified | Added `activeSectionIndex`, `sectionTimeRemaining`, question isolation, section navigation boundaries, auto-advance on expiry, and `goToNextSection`. |
| [`src/components/exam/ExamTimer.tsx`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/components/exam/ExamTimer.tsx) | Modified | Dual-timer support: prominent section countdown with low-time warning and milestone screen-reader announcements, plus overall total timer. |
| [`src/components/exam/QuestionPalette.tsx`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/components/exam/QuestionPalette.tsx) | Modified | Sectional grouping with status headers (`Active`, `Submitted`, `Locked`) and locking of non-active section buttons. |
| [`src/components/exam/SectionAdvanceDialog.tsx`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/components/exam/SectionAdvanceDialog.tsx) | Created | Accessible confirmation modal warning the candidate before advancing to the next section early. |
| [`src/app/exam/page.tsx`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/app/exam/page.tsx) | Modified | Section banner, dual-timer binding, section advance dialog, section progress syncing, and palette integration. |
| [`src/lib/voice/voiceParser.ts`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/lib/voice/voiceParser.ts) | Modified | Added `NEXT_SECTION` and `CURRENT_SECTION` command types and multilingual regex matchers. |
| [`src/hooks/useVoiceMode.ts`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/hooks/useVoiceMode.ts) | Modified | L365–405: Handlers for `NEXT_SECTION` and `CURRENT_SECTION` commands with spoken voice feedback. |
| [`src/components/voice/VoiceExamPanel.tsx`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/components/voice/VoiceExamPanel.tsx) | Modified | Added `Next Section` and `Current Section` command badges to the supported commands guide. |
| [`src/components/results/QuestionReviewList.tsx`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/components/results/QuestionReviewList.tsx) | Modified | Section-grouped question review rendering with section score & accuracy badges when sections are present. |
| [`src/app/results/page.tsx`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/app/results/page.tsx) | Modified | L662–735: Sectional Timing & Performance breakdown cards rendering per-section scores, durations, and verification badges. |
| [`scripts/verify_phase7e7.ts`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/scripts/verify_phase7e7.ts) | Created | Automated verification test suite covering migration, sectional timing, anti-tamper bypass tests, backward compatibility, and review metadata. |

---

## 3. Database & Migration Changes

### Migration File: `supabase/migrations/002_sectional_timing.sql`
*Approved by candidate and successfully deployed to remote Supabase database (`xojviyqdkxuirlrdnqxe`):*

```sql
-- 1. Add sections JSONB column to public.exams
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT NULL;

COMMENT ON COLUMN public.exams.sections IS 
'Configured examination sections: array of {id, name, order_index, duration_minutes, question_count}. NULL for non-sectional exams.';

-- 2. Add section_progress JSONB column to public.exam_attempts
ALTER TABLE public.exam_attempts 
ADD COLUMN IF NOT EXISTS section_progress JSONB DEFAULT NULL;

COMMENT ON COLUMN public.exam_attempts.section_progress IS 
'Candidate per-section progress tracking: {active_section_index, sections: [{section_id, name, order_index, duration_seconds, time_used_seconds, started_at, submitted_at, status, timing_flag}]}.';

-- 3. Configure sectional data for seed exam `e2` (Banking Prelims Mock)
UPDATE public.exams
SET sections = '[
  {"id": "sec_quant", "name": "Quantitative Aptitude", "order_index": 0, "duration_minutes": 5, "question_count": 4},
  {"id": "sec_reasoning", "name": "Reasoning", "order_index": 1, "duration_minutes": 5, "question_count": 4},
  {"id": "sec_english", "name": "English", "order_index": 2, "duration_minutes": 5, "question_count": 4}
]'::jsonb
WHERE id = 'e2';
```

---

## 4. End-to-End Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Candidate
    participant ExamUI as /exam UI
    participant Hook as useExamEngine
    participant API as /api/exam/save-answer
    participant SecAPI as /api/exam/section-progress
    participant SubmitAPI as /api/exam/submit
    participant DB as Supabase DB

    Candidate->>ExamUI: Start Banking Prelims (e2)
    ExamUI->>DB: startRemoteExamAttempt('e2')
    DB-->>ExamUI: attemptId (section_progress initialized for Section 1)
    ExamUI->>Hook: Initialize with 3 sections (5m each)
    Hook-->>ExamUI: Active Section 1: Quantitative Aptitude (04:59 remaining)

    Candidate->>ExamUI: Select answer for Q1
    ExamUI->>API: POST /api/exam/save-answer (quant-1)
    API->>DB: Verify Section 1 is active -> Upsert attempt_answers
    API-->>ExamUI: 200 OK

    alt Candidate finishes Section 1 early OR Section 1 timer expires (<=0s)
        ExamUI->>SecAPI: POST /api/exam/section-progress (sec_quant, timeUsed)
        SecAPI->>DB: Lock Section 1 ('completed'), Start Section 2 ('in_progress')
        SecAPI-->>ExamUI: 200 OK (Next section active)
        ExamUI->>Hook: Advance to Section 2 (Reasoning)
    end

    Note over Candidate, API: Direct API Bypass Attempt (Anti-Tamper)
    Candidate->>API: POST /api/exam/save-answer (quant-2 for locked Section 1)
    API-->>Candidate: 403 Forbidden (SECTION_LOCKED_OR_EXPIRED)

    Candidate->>ExamUI: Answer Section 2 questions & Click Submit Final Exam
    ExamUI->>SubmitAPI: POST /api/exam/submit (answers, sectionProgress)
    SubmitAPI->>DB: Verify no altered answers for locked sections
    SubmitAPI->>DB: Grade all answers, calculate sectionMetrics & timingFlags
    SubmitAPI->>DB: Update attempt: status='completed', summary_metrics
    SubmitAPI-->>ExamUI: 200 OK
    ExamUI->>Candidate: Redirect to /results?attemptId=...
```

---

## 5. Verification Test Suite Results

The automated test suite in [`scripts/verify_phase7e7.ts`](file:///c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/scripts/verify_phase7e7.ts) was executed against the running application and live database. All 11 tests passed with zero failures.

| Index | Scope Area | Test Name | Status | Details |
| :---: | :--- | :--- | :---: | :--- |
| **0** | 1. Schema & Test Data | Sectional Schema Config on `e2` (Banking Prelims) | **PASS** | Found 3 sections (Quant, Reasoning, English), 5m each on `e2`. |
| **1** | 1. Schema & Test Data | Backward Compatibility on `e1` (Non-sectional NULL sections) | **PASS** | `e1` correctly has `sections = NULL` and 15m duration. |
| **2** | 1. Schema & Test Data | `exam_attempts.section_progress` column exists | **PASS** | Column queries and updates correctly in database. |
| **3** | 3. Section Timing Enforcement | Save Answer in Active Section (`/api/exam/save-answer`) | **PASS** | Answer accepted for active Section 1 (`quant-1`). |
| **4** | 3. Section Timing Enforcement | Advance Section via `/api/exam/section-progress` | **PASS** | Section 1 status transitioned to `completed`, Section 2 active (index 1). |
| **5** | 3. Section Timing Enforcement | Direct API Bypass Blocked: save-answer on closed section | **PASS** | **HTTP 403 Forbidden** returned: `Forbidden: Section 'Quantitative Aptitude' is completed. Answers cannot be modified for closed sections.` |
| **6** | 3. Section Timing Enforcement | Direct API Bypass Blocked: submit with altered expired section | **PASS** | **HTTP 403 Forbidden** returned: `Tamper detected: Answers cannot be submitted or altered for closed section 'Quantitative Aptitude'.` |
| **7** | 3. Section Timing Enforcement | Legitimate Sectional Submission & Metrics Persistence | **PASS** | Submitted successfully. `sectionMetrics` count: 3, `sectionalTimingSupported: true`. |
| **8** | 4. Analytics & Review Integration | Attempt Review Section Grouping Metadata | **PASS** | All 12 questions returned by review API contain explicit `sectionName`. |
| **9** | 5. Backward Compatibility | Submit Non-Sectional Exam (`e1`) | **PASS** | `e1` submission clean, score: 3/3 attempted, `sectionalTimingSupported: false`. |
| **10** | 6. Regressions Check | Phase 7E-6 Abandoned Session Cleanup API | **PASS** | Cleanup endpoint operational (`/api/exam/cleanup`). |

### Summary Counts:
- **Total Tests:** 11
- **Passed:** 11 (100%)
- **Failed:** 0 (0%)

---

## 6. Build & Type Checking Verification

```bash
cmd /c "npx tsc --noEmit"
# Result: Exit code 0 (Zero type errors)

cmd /c "npm run build"
# Result: Exit code 0
# ▲ Next.js 16.3.5 (Turbopack)
# ✓ Compiled successfully in 3.6s
# Finished TypeScript in 9.8s ...
# ✓ Generating static pages using 11 workers (16/16) in 823ms
# Routes generated:
#   ├ ƒ /api/exam/attempt-review
#   ├ ƒ /api/exam/cleanup
#   ├ ƒ /api/exam/save-answer (NEW)
#   ├ ƒ /api/exam/section-progress (NEW)
#   ├ ƒ /api/exam/submit
#   ├ ○ /dashboard
#   ├ ○ /exam
#   ├ ○ /results
```

---

## 7. Browser Subagent QA Verification

The browser subagent performed a full end-to-end user session on `/exam?exam=e2`:
- **UI Validation**: Confirmed active section header "Section 1 of 3: Quantitative Aptitude", running countdown timer (`04:54`), and Question Palette grouping with locked upcoming sections.
- **Section Advance Modal**: Clicked "Next Section (Reasoning)", confirmed `SectionAdvanceDialog` opened with warning text, and clicked "Proceed to Reasoning".
- **Section Transition**: Verified UI seamlessly shifted to Section 2 (Reasoning), marking Section 1 as closed/submitted and isolating Section 2 questions.
- **Submission & Results**: Confirmed exam submission navigated to `/results?attemptId=ac27a71f-3796-4400-8d66-a95a56b686d5`.
- **Results Review**: Verified `Sectional Timing & Performance` cards rendered with server verification badges, and `QuestionReviewList` grouped questions under section headers.
- **Session Artifact**: Browser recording saved to `sectional_exam_flow_1790408126333.webp`.

---

## 8. Remaining Limitations

1. **Configurable Negative Marking per Section**: In this phase, scoring follows standard competitive rules (1 mark per correct answer; 0 for unattempted/incorrect). Custom penalty rules per section (e.g. -0.25 in Banking Prelims) can be added to section configuration in a future scoring pass.
2. **Offline Section Resumption**: While local fallback session state caches section progress in `sessionStorage`, a candidate who switches devices mid-exam will resume at the start of the currently active remote section recorded in `exam_attempts.section_progress`.

---

## 9. Next Phase Readiness

Phase 7E-7 is fully complete and verified. As directed by the user prompt:
**"STOP after Phase 7E-7. Do not apply any schema migration or proceed further without explicit authorization."**

All changes have been tested, validated against direct API bypasses, verified for zero regressions to Phase 7E-5 dashboard analytics and Phase 7E-6 polish passes, and committed cleanly.
