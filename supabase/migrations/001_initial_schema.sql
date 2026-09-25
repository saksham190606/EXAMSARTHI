-- ==============================================================================
-- EXAMSARTHI — Phase 7C: Initial Database Schema & Row Level Security (RLS)
-- ==============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Core schema supporting all 5 question formats, candidate profiles,
--              exam cohorts, attempts, answer persistence, and answer-key protection.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CANDIDATE PROFILES TABLE
-- ==============================================================================
-- Linked 1:1 with Supabase Auth (auth.users).
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Candidate profile details linked directly to Supabase Auth users.';

-- Automatic updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 3. EXAMS & PRACTICE SETS TABLE
-- ==============================================================================
-- Preserves existing identifiers: e1, e2, e3 (mocks) and p1, p2, p3, p4, p5 (practice).
CREATE TABLE IF NOT EXISTS public.exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('mock', 'practice')),
  subject TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  total_questions INTEGER NOT NULL CHECK (total_questions >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.exams IS 'Catalog of competitive mock exams and focused practice sets.';

-- ==============================================================================
-- 4. MASTER QUESTIONS TABLE (Raw Answer Key - Restricted Access)
-- ==============================================================================
-- Contains full question data, options, explanations, and raw answer keys.
-- Direct candidate access to this raw table is RESTRICTED by RLS to protect answers.
CREATE TABLE IF NOT EXISTS public.questions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN (
    'single-choice',
    'multiple-choice',
    'true-false',
    'short-answer',
    'fill-blank'
  )),
  text TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT,
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  options JSONB,                -- Array of {id: string, text: string} or NULL
  correct_answer JSONB NOT NULL, -- string, string[], or boolean
  acceptable_answers JSONB,     -- Array of alternative string forms or NULL
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.questions IS 'Master question bank. Raw table containing answer keys accessible only by administrators and evaluation functions.';

-- Performance indexes for category filtering
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_type ON public.questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON public.questions(topic);

-- ==============================================================================
-- 5. CANDIDATE-SAFE QUESTION VIEWS (Answer Key Protection Layer)
-- ==============================================================================
-- Secure projections that omit `correct_answer` and `acceptable_answers`.
-- Normal candidates and client applications query these views instead of the raw table.

CREATE OR REPLACE VIEW public.exam_questions_safe AS
SELECT
  q.id,
  q.type,
  q.text,
  q.subject,
  q.topic,
  q.difficulty,
  q.options,
  q.explanation,
  q.created_at
FROM public.questions q;

COMMENT ON VIEW public.exam_questions_safe IS 'Candidate-safe projection of questions excluding correct_answer and acceptable_answers.';

-- ==============================================================================
-- 6. EXAM-QUESTION MAPPINGS TABLE
-- ==============================================================================
-- Maps questions to exams/practice sets with strict section ordering and zero cohort contamination.
CREATE TABLE IF NOT EXISTS public.exam_questions (
  exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  section_name TEXT,
  order_index INTEGER NOT NULL CHECK (order_index >= 0),
  PRIMARY KEY (exam_id, question_id)
);

COMMENT ON TABLE public.exam_questions IS 'Deterministic mapping of questions into exam cohorts with section ordering.';

CREATE INDEX IF NOT EXISTS idx_exam_questions_order 
  ON public.exam_questions(exam_id, order_index);

-- Convenient candidate-safe joined view for active exam questions in display order
CREATE OR REPLACE VIEW public.exam_active_questions AS
SELECT
  eq.exam_id,
  eq.section_name,
  eq.order_index,
  q.id AS question_id,
  q.type,
  q.text,
  q.subject,
  q.topic,
  q.difficulty,
  q.options,
  q.explanation,
  q.created_at
FROM public.exam_questions eq
JOIN public.questions q ON eq.question_id = q.id;

COMMENT ON VIEW public.exam_active_questions IS 'Candidate-safe view providing ordered exam questions without answer keys.';

-- ==============================================================================
-- 7. EXAM ATTEMPTS TABLE
-- ==============================================================================
-- Tracks candidate attempts, time used, and evaluated scores.
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id TEXT NOT NULL REFERENCES public.exams(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  score NUMERIC(5,2) CHECK (score >= 0),
  accuracy NUMERIC(5,2) CHECK (accuracy >= 0 AND accuracy <= 100),
  total_questions INTEGER NOT NULL CHECK (total_questions >= 0),
  attempted_count INTEGER NOT NULL DEFAULT 0 CHECK (attempted_count >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  incorrect_count INTEGER NOT NULL DEFAULT 0 CHECK (incorrect_count >= 0),
  time_used_seconds INTEGER NOT NULL DEFAULT 0 CHECK (time_used_seconds >= 0),
  summary_metrics JSONB, -- Stores subject and topic breakdown for rapid dashboard rendering
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.exam_attempts IS 'Examination sessions. Records session duration, progress, and immutable completion state.';

CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id ON public.exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON public.exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON public.exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_started_at ON public.exam_attempts(started_at DESC);

-- ==============================================================================
-- 8. ATTEMPT ANSWERS TABLE
-- ==============================================================================
-- Stores individual answers for each question within an attempt.
CREATE TABLE IF NOT EXISTS public.attempt_answers (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
  user_answer JSONB,    -- Stores string, string[], or boolean
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

COMMENT ON TABLE public.attempt_answers IS 'Candidate answers per question within an attempt session.';

CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_id ON public.attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_question_id ON public.attempt_answers(question_id);

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 9.1 Profiles Policies
-- ------------------------------------------------------------------------------
-- Candidates can view, insert, and update ONLY their own profile.
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated, anon
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated, anon
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated, anon
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 9.2 Exams Policies
-- ------------------------------------------------------------------------------
-- Active exams are publicly readable by all candidates.
CREATE POLICY "exams_select_active"
  ON public.exams FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Client roles cannot modify exams (Admin / service_role only).

-- ------------------------------------------------------------------------------
-- 9.3 Exam-Questions Mapping Policies
-- ------------------------------------------------------------------------------
-- Mappings are publicly readable for active exams.
CREATE POLICY "exam_questions_select_active"
  ON public.exam_questions FOR SELECT
  TO authenticated, anon
  USING (EXISTS (
    SELECT 1 FROM public.exams e 
    WHERE e.id = exam_questions.exam_id AND e.is_active = true
  ));

-- Client roles cannot modify mappings.

-- ------------------------------------------------------------------------------
-- 9.4 Raw Questions Table Policies (Answer Key Protection)
-- ------------------------------------------------------------------------------
-- CRITICAL SECURITY RULE: No unrestricted SELECT policy is granted on raw questions
-- to normal anon or authenticated candidate roles.
-- Candidates query `exam_questions_safe` or `exam_active_questions`.
-- Service-role retains unrestricted access for admin and backend tasks.

-- ------------------------------------------------------------------------------
-- 9.5 Exam Attempts Policies
-- ------------------------------------------------------------------------------
-- Candidates can view their own attempts.
CREATE POLICY "attempts_select_own"
  ON public.exam_attempts FOR SELECT
  TO authenticated, anon
  USING (auth.uid() = user_id);

-- Candidates can insert their own attempts.
CREATE POLICY "attempts_insert_own"
  ON public.exam_attempts FOR INSERT
  TO authenticated, anon
  WITH CHECK (auth.uid() = user_id);

-- Candidates can update ONLY in_progress attempts (enforces submission immutability).
CREATE POLICY "attempts_update_in_progress"
  ON public.exam_attempts FOR UPDATE
  TO authenticated, anon
  USING (auth.uid() = user_id AND status = 'in_progress')
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 9.6 Attempt Answers Policies
-- ------------------------------------------------------------------------------
-- Candidates can view answers belonging to their own attempts.
CREATE POLICY "answers_select_own"
  ON public.attempt_answers FOR SELECT
  TO authenticated, anon
  USING (EXISTS (
    SELECT 1 FROM public.exam_attempts a 
    WHERE a.id = attempt_answers.attempt_id AND a.user_id = auth.uid()
  ));

-- Candidates can insert answers only into their own in_progress attempts.
CREATE POLICY "answers_insert_in_progress"
  ON public.attempt_answers FOR INSERT
  TO authenticated, anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.exam_attempts a 
    WHERE a.id = attempt_answers.attempt_id 
      AND a.user_id = auth.uid() 
      AND a.status = 'in_progress'
  ));

-- Candidates can update answers only while the attempt is in_progress.
CREATE POLICY "answers_update_in_progress"
  ON public.attempt_answers FOR UPDATE
  TO authenticated, anon
  USING (EXISTS (
    SELECT 1 FROM public.exam_attempts a 
    WHERE a.id = attempt_answers.attempt_id 
      AND a.user_id = auth.uid() 
      AND a.status = 'in_progress'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.exam_attempts a 
    WHERE a.id = attempt_answers.attempt_id 
      AND a.user_id = auth.uid() 
      AND a.status = 'in_progress'
  ));

-- ==============================================================================
-- 10. GRANTS & ROLE PERMISSIONS
-- ==============================================================================
-- Safe view permissions for client roles
GRANT SELECT ON public.exam_questions_safe TO anon, authenticated;
GRANT SELECT ON public.exam_active_questions TO anon, authenticated;

-- Table permissions subject to RLS
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.exams TO anon, authenticated;
GRANT SELECT ON public.exam_questions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.exam_attempts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.attempt_answers TO anon, authenticated;
