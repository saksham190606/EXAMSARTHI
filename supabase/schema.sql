-- ExamSaarthi Supabase Schema & RLS Policies

-- ENUMS
CREATE TYPE user_role AS ENUM ('candidate', 'setter', 'admin', 'educator');
CREATE TYPE exam_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE session_status AS ENUM ('active', 'paused', 'completed', 'terminated');

-- PROFILES
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    role user_role DEFAULT 'candidate'::user_role,
    full_name TEXT NOT NULL,
    accessibility_prefs JSONB DEFAULT '{}'::jsonb, -- stores text size, contrast, voice speed, etc.
    accommodation_profile JSONB DEFAULT '{}'::jsonb, -- extra time multipliers, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXAMS
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status exam_status DEFAULT 'draft'::exam_status,
    created_by UUID REFERENCES profiles(id),
    settings JSONB DEFAULT '{}'::jsonb, -- duration, allowed tools, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QUESTIONS
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    question_type TEXT NOT NULL, -- 'mcq', 'subjective', 'math', 'image'
    content JSONB NOT NULL, -- text, image urls, layered visual description
    options JSONB, -- For MCQs
    correct_answer JSONB NOT NULL, -- Hidden from client!
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXAM SESSIONS (Active Attempts)
CREATE TABLE exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status session_status DEFAULT 'active'::session_status,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    time_remaining_seconds INTEGER NOT NULL,
    seed_value TEXT NOT NULL, -- for stable shuffling of questions/options
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (exam_id, candidate_id) -- only one session per exam per candidate
);

-- ANSWERS (Autosaved)
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    answer_data JSONB NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (session_id, question_id)
);

-- AUDIT LOGS (Tamper-evident)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'focus_lost', 'paste', 'answer_changed', 'timer_paused'
    details JSONB,
    previous_hash TEXT, -- chain hash for tamper evidence
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/update their own profile. Admins/Setters can read all.
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins/Educators can view all profiles" ON profiles FOR SELECT 
    USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'setter', 'educator')));

-- Exams: Candidates can see published exams. Setters can see their own. Admins see all.
CREATE POLICY "Candidates can view published exams" ON exams FOR SELECT 
    USING (status = 'published');
CREATE POLICY "Setters can manage their exams" ON exams FOR ALL 
    USING (created_by = auth.uid() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('setter', 'admin')));

-- Questions: Candidates CANNOT read correct_answer via standard select. We will need a secure view or edge function to serve exams without answers.
-- But for the sake of RLS, candidates can read questions for published exams they are taking.
-- IMPORTANT: The actual client fetching MUST filter out `correct_answer`. We'll enforce this via Server Actions, NOT directly via Supabase client.
CREATE POLICY "Server Action manages Questions" ON questions FOR ALL USING (true); -- Only accessed via Server Actions using Service Role

-- Exam Sessions: Candidates can read/update their own active sessions.
CREATE POLICY "Candidates can view own session" ON exam_sessions FOR SELECT 
    USING (candidate_id = auth.uid());
CREATE POLICY "Candidates can update own session" ON exam_sessions FOR UPDATE 
    USING (candidate_id = auth.uid());

-- Answers: Candidates can insert/update their own answers via session.
CREATE POLICY "Candidates can manage own answers" ON answers FOR ALL 
    USING (EXISTS (SELECT 1 FROM exam_sessions s WHERE s.id = answers.session_id AND s.candidate_id = auth.uid()));

-- Audit Logs: Insert only for candidates.
CREATE POLICY "Candidates can insert audit logs" ON audit_logs FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM exam_sessions s WHERE s.id = audit_logs.session_id AND s.candidate_id = auth.uid()));
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'setter')));
