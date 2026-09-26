/**
 * EXAMSARTHI — Candidate-Safe Remote Exam Repository
 * 
 * Secure client-side repository for fetching exam metadata and questions.
 * Enforces strict security constraints:
 * 1. Queries ONLY candidate-safe views (`exam_active_questions`).
 * 2. NEVER queries the raw `questions` table from client code.
 * 3. NEVER exposes `correct_answer` or `acceptable_answers` to browser.
 * 4. Preserves deterministic order using `order_index ASC`.
 * 5. Provides seamless local fallback to `safeQuestionBank.ts` if offline.
 */

import { createClient } from '@/lib/supabase/client';
import { CandidateQuestion, QuestionType, QuestionOption } from '@/types/question';
import { 
  getSafeQuestionsForContext, 
  SafeBankingPrelimsMockQuestions, 
  SafeSscCglMockQuestions, 
  SafeUpscCsatMockQuestions,
  SafePracticeQuantQuestions,
  SafePracticeGKQuestions,
  SafePracticeReasoningQuestions,
  SafePracticeEnglishQuestions,
  SafePracticeShowcaseQuestions
} from '@/lib/questions/safeQuestionBank';

export interface RemoteExamSummary {
  id: string;
  title: string;
  description: string;
  category: string;
  duration_minutes: number;
  total_questions: number;
  is_active: boolean;
}

export interface QuestionLoadResult {
  questions: CandidateQuestion[];
  isRemote: boolean;
  error?: string;
  examId?: string;
  setId?: string;
}

/**
 * Normalizes input exam ID or string to remote database exam ID ('e1', 'e2', 'e3').
 */
export function normalizeExamId(rawId: string | null | undefined): string {
  if (!rawId) return 'e1';
  const clean = rawId.toLowerCase().trim();
  if (clean === 'e2' || clean.includes('bank') || clean.includes('ibps') || clean.includes('sbi')) {
    return 'e2';
  }
  if (clean === 'e3' || clean.includes('csat') || clean.includes('upsc')) {
    return 'e3';
  }
  return 'e1';
}

/**
 * Normalizes input practice set ID or string to remote database ID ('p1'..'p5').
 */
export function normalizePracticeSetId(rawId: string | null | undefined): string {
  if (!rawId) return 'p1';
  const clean = rawId.toLowerCase().trim();
  if (clean === 'p1' || clean.includes('quant')) return 'p1';
  if (clean === 'p2' || clean.includes('gk') || clean.includes('general')) return 'p2';
  if (clean === 'p3' || clean.includes('reason')) return 'p3';
  if (clean === 'p4' || clean.includes('english')) return 'p4';
  if (clean === 'p5' || clean.includes('showcase') || clean.includes('multi')) return 'p5';
  return 'p1';
}

/**
 * Maps raw database row from `exam_active_questions` view to candidate-safe `CandidateQuestion`.
 * Strictly ignores any hypothetical answer key properties.
 */
function mapSafeRowToQuestion(row: any): CandidateQuestion {
  return {
    id: row.question_id,
    type: (row.type as QuestionType) || 'single-choice',
    text: row.text,
    subject: row.subject,
    topic: row.topic || undefined,
    difficulty: row.difficulty || undefined,
    options: Array.isArray(row.options) ? (row.options as QuestionOption[]) : undefined,
    explanation: row.explanation || undefined,
    order_index: typeof row.order_index === 'number' ? row.order_index : 0,
    exam_id: row.exam_id,
    section_name: row.section_name || undefined,
  };
}

/**
 * Fetches available exams from Supabase candidate-accessible exams view/table.
 */
export async function getRemoteExams(): Promise<RemoteExamSummary[]> {
  try {
    const supabase = createClient();
    if (!supabase) {
      return getFallbackExams();
    }

    const { data, error } = await supabase
      .from('exams')
      .select('id, title, description, category, duration_minutes, total_questions, is_active')
      .eq('is_active', true)
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('[ExamRepository] getRemoteExams fallback:', error?.message);
      return getFallbackExams();
    }

    return data as RemoteExamSummary[];
  } catch (err: any) {
    console.warn('[ExamRepository] getRemoteExams exception:', err?.message);
    return getFallbackExams();
  }
}

function getFallbackExams(): RemoteExamSummary[] {
  return [
    {
      id: 'e1',
      title: 'SSC CGL Tier-1 Full Mock',
      description: 'Comprehensive 12-question competitive mock covering Reasoning, GK, Quant, and English.',
      category: 'SSC / Central Govt',
      duration_minutes: 15,
      total_questions: 12,
      is_active: true
    },
    {
      id: 'e2',
      title: 'Banking Prelims (IBPS / SBI PO)',
      description: 'Specialized 12-question speed test covering Quantitative Aptitude, Reasoning, and English.',
      category: 'Banking & Insurance',
      duration_minutes: 15,
      total_questions: 12,
      is_active: true
    },
    {
      id: 'e3',
      title: 'UPSC Civil Services Prelims GS Paper-II (CSAT)',
      description: 'Rigorous 9-question analytical exam covering Reading Comprehension, Reasoning, and Numeracy.',
      category: 'Civil Services / UPSC',
      duration_minutes: 15,
      total_questions: 9,
      is_active: true
    }
  ];
}

/**
 * Fetches candidate-safe questions for a competitive mock exam.
 * Queries `exam_active_questions` ordered deterministically by `order_index ASC`.
 */
export async function getRemoteQuestionsForExam(rawExamId: string): Promise<QuestionLoadResult> {
  const examId = normalizeExamId(rawExamId);

  try {
    const supabase = createClient();
    if (!supabase) {
      return {
        questions: getSafeQuestionsForContext({ examId }),
        isRemote: false,
        examId
      };
    }

    const { data, error } = await supabase
      .from('exam_active_questions')
      .select('question_id, type, text, subject, topic, difficulty, options, explanation, order_index, exam_id, section_name')
      .eq('exam_id', examId)
      .order('order_index', { ascending: true });

    if (error) {
      console.warn(`[ExamRepository] Supabase error for exam ${examId}:`, error.message);
      return {
        questions: getSafeQuestionsForContext({ examId }),
        isRemote: false,
        error: error.message,
        examId
      };
    }

    if (!data || data.length === 0) {
      console.warn(`[ExamRepository] No rows returned for exam ${examId}, using safe fallback.`);
      return {
        questions: getSafeQuestionsForContext({ examId }),
        isRemote: false,
        examId
      };
    }

    const mapped = data.map(mapSafeRowToQuestion);
    return {
      questions: mapped,
      isRemote: true,
      examId
    };
  } catch (err: any) {
    console.warn(`[ExamRepository] Network/client exception for exam ${examId}:`, err?.message);
    return {
      questions: getSafeQuestionsForContext({ examId }),
      isRemote: false,
      error: err?.message || 'Remote request failed',
      examId
    };
  }
}

/**
 * Fetches candidate-safe questions for a practice set.
 * Queries `exam_active_questions` ordered deterministically by `order_index ASC`.
 */
export async function getRemoteQuestionsForPracticeSet(rawSetId: string): Promise<QuestionLoadResult> {
  const setId = normalizePracticeSetId(rawSetId);

  try {
    const supabase = createClient();
    if (!supabase) {
      return {
        questions: getSafeQuestionsForContext({ setId }),
        isRemote: false,
        setId
      };
    }

    const { data, error } = await supabase
      .from('exam_active_questions')
      .select('question_id, type, text, subject, topic, difficulty, options, explanation, order_index, exam_id, section_name')
      .eq('exam_id', setId)
      .order('order_index', { ascending: true });

    if (error) {
      console.warn(`[ExamRepository] Supabase error for practice set ${setId}:`, error.message);
      return {
        questions: getSafeQuestionsForContext({ setId }),
        isRemote: false,
        error: error.message,
        setId
      };
    }

    if (!data || data.length === 0) {
      console.warn(`[ExamRepository] No rows returned for practice set ${setId}, using safe fallback.`);
      return {
        questions: getSafeQuestionsForContext({ setId }),
        isRemote: false,
        setId
      };
    }

    const mapped = data.map(mapSafeRowToQuestion);
    return {
      questions: mapped,
      isRemote: true,
      setId
    };
  } catch (err: any) {
    console.warn(`[ExamRepository] Network exception for practice set ${setId}:`, err?.message);
    return {
      questions: getSafeQuestionsForContext({ setId }),
      isRemote: false,
      error: err?.message || 'Remote request failed',
      setId
    };
  }
}

/**
 * Unified context resolver: loads questions for Practice Set or Mock Exam.
 * Guarantees candidate-safe question retrieval and zero answer keys.
 */
export async function resolveCandidateQuestions(params: {
  setId?: string | null;
  examId?: string | null;
}): Promise<QuestionLoadResult> {
  const { setId, examId } = params;

  if (setId) {
    return getRemoteQuestionsForPracticeSet(setId);
  }

  if (examId) {
    return getRemoteQuestionsForExam(examId);
  }

  // Default mock exam: SSC CGL (e1)
  return getRemoteQuestionsForExam('e1');
}

/**
 * Creates or retrieves an in-progress exam attempt for the authenticated candidate.
 * Guarantees idempotency and prevents duplicate attempts from React renders.
 */
export async function startRemoteExamAttempt(
  rawExamId: string,
  totalQuestions: number
): Promise<{ attemptId: string | null; error?: string }> {
  try {
    const supabase = createClient();
    if (!supabase) {
      return { attemptId: null, error: 'Database unconfigured' };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { attemptId: null, error: 'Candidate not authenticated' };
    }

    const examId = normalizeExamId(rawExamId);

    // 1. Look for existing in_progress attempt for this candidate and exam
    const { data: existing, error: fetchErr } = await supabase
      .from('exam_attempts')
      .select('id, status, started_at')
      .eq('user_id', user.id)
      .eq('exam_id', examId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!fetchErr && existing && existing.id) {
      return { attemptId: existing.id };
    }

    // 2. Create new in_progress attempt using candidate client (strictly verified by RLS)
    const { data: created, error: insertErr } = await supabase
      .from('exam_attempts')
      .insert({
        user_id: user.id,
        exam_id: examId,
        status: 'in_progress',
        total_questions: totalQuestions,
      })
      .select('id')
      .single();

    if (insertErr || !created) {
      console.warn('[ExamRepository] startRemoteExamAttempt error:', insertErr?.message);
      return { attemptId: null, error: insertErr?.message || 'Failed to create attempt' };
    }

    return { attemptId: created.id };
  } catch (err: any) {
    console.error('[ExamRepository] startRemoteExamAttempt exception:', err);
    return { attemptId: null, error: err?.message };
  }
}

/**
 * Persists an active candidate answer during the exam.
 * Non-blocking, fails gracefully without disrupting the candidate.
 */
export async function saveCandidateAnswer(
  attemptId: string,
  questionId: string,
  userAnswer: any
): Promise<void> {
  if (!attemptId) return;

  try {
    const supabase = createClient();
    if (!supabase) return;

    await supabase
      .from('attempt_answers')
      .upsert(
        {
          attempt_id: attemptId,
          question_id: questionId,
          user_answer: userAnswer,
        },
        { onConflict: 'attempt_id,question_id' }
      );
  } catch (err) {
    console.warn('[ExamRepository] saveCandidateAnswer failed silently:', err);
  }
}

/**
 * Submits the active candidate session to the secure server endpoint.
 */
export async function submitExamAttempt(
  attemptId: string,
  answers: Record<string, any>,
  timeRemaining?: number
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch('/api/exam/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attemptId,
        answers,
        timeRemaining,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      return {
        success: false,
        error: data?.error || `Submission failed with HTTP ${res.status}`,
      };
    }

    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error while submitting exam',
    };
  }
}

/**
 * Retrieves the official persisted remote attempt from Supabase for the candidate.
 */
export async function getRemoteAttemptResult(attemptId: string): Promise<{
  attempt: any | null;
  error?: string;
}> {
  try {
    const supabase = createClient();
    if (!supabase) {
      return { attempt: null, error: 'Database client unavailable' };
    }

    const { data, error } = await supabase
      .from('exam_attempts')
      .select('id, user_id, exam_id, status, score, accuracy, total_questions, attempted_count, correct_count, incorrect_count, time_used_seconds, summary_metrics, started_at, submitted_at')
      .eq('id', attemptId)
      .maybeSingle();

    if (error || !data) {
      return { attempt: null, error: error?.message || 'Attempt not found' };
    }

    return { attempt: data };
  } catch (err: any) {
    return { attempt: null, error: err?.message };
  }
}
