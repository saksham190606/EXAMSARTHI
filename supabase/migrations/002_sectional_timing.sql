-- ==============================================================================
-- EXAMSARTHI — Phase 7E-7: Sectional Timing Support Migration
-- ==============================================================================
-- Migration: 002_sectional_timing.sql
-- Description: Adds optional per-section duration configuration to exams,
--              and per-section timing progress tracking to exam attempts.
--              Fully backward-compatible: exams and attempts with NULL
--              sections operate under overall exam-level timing.
-- ==============================================================================

-- 1. Add `sections` JSONB column to public.exams
-- Stores array of: [{ id, name, order_index, duration_minutes, question_count }]
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT NULL;

COMMENT ON COLUMN public.exams.sections IS 
'Configured examination sections with individual duration limits. NULL for non-sectional exams.';

-- 2. Add `section_progress` JSONB column to public.exam_attempts
-- Stores candidate section progression and server-validated timing metrics:
-- {
--   active_section_index: number,
--   sections: [
--     {
--       section_id: string,
--       name: string,
--       duration_seconds: number,
--       time_used_seconds: number,
--       started_at: string,
--       submitted_at: string | null,
--       status: 'in_progress' | 'completed' | 'expired',
--       timing_flag: 'NORMAL' | 'CLIENT_SERVER_TIME_DISCREPANCY' | 'EXCEEDED_ALLOTTED_TIME_CAPPED'
--     }
--   ]
-- }
ALTER TABLE public.exam_attempts 
ADD COLUMN IF NOT EXISTS section_progress JSONB DEFAULT NULL;

COMMENT ON COLUMN public.exam_attempts.section_progress IS 
'Candidate per-section progress and server-validated timing audit metrics.';

-- 3. Configure sectional data for seed exam `e2` (Banking Prelims Mock)
-- 3 sections: Quantitative Aptitude (5m), Reasoning (5m), English (5m) = 15m total
UPDATE public.exams
SET sections = '[
  {
    "id": "sec_quant",
    "name": "Quantitative Aptitude",
    "order_index": 0,
    "duration_minutes": 5,
    "question_count": 4
  },
  {
    "id": "sec_reasoning",
    "name": "Reasoning",
    "order_index": 1,
    "duration_minutes": 5,
    "question_count": 4
  },
  {
    "id": "sec_english",
    "name": "English",
    "order_index": 2,
    "duration_minutes": 5,
    "question_count": 4
  }
]'::jsonb
WHERE id = 'e2';
