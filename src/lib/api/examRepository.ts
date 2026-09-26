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
import { ExamSectionConfig, ExamSectionProgress } from '@/types/section';
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
import { AvailableExams, PracticeSets } from '@/lib/mockData';

export interface RemoteExamSummary {
  id: string;
  title: string;
  description: string;
  category: string;
  duration_minutes: number;
  total_questions: number;
  is_active: boolean;
  sections?: ExamSectionConfig[] | null;
}

export interface QuestionLoadResult {
  questions: CandidateQuestion[];
  isRemote: boolean;
  error?: string;
  examId?: string;
  setId?: string;
  sections?: ExamSectionConfig[] | null;
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
      .select('id, title, description, category, duration_minutes, total_questions, is_active, sections')
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
      is_active: true,
      sections: null,
    },
    {
      id: 'e2',
      title: 'Banking Prelims (IBPS / SBI PO)',
      description: 'Specialized 12-question speed test covering Quantitative Aptitude, Reasoning, and English.',
      category: 'Banking & Insurance',
      duration_minutes: 15,
      total_questions: 12,
      is_active: true,
      sections: [
        { id: 'sec_quant', name: 'Quantitative Aptitude', order_index: 0, duration_minutes: 5, question_count: 4 },
        { id: 'sec_reasoning', name: 'Reasoning', order_index: 1, duration_minutes: 5, question_count: 4 },
        { id: 'sec_english', name: 'English', order_index: 2, duration_minutes: 5, question_count: 4 },
      ],
    },
    {
      id: 'e3',
      title: 'UPSC Civil Services Prelims GS Paper-II (CSAT)',
      description: 'Rigorous 9-question analytical exam covering Reading Comprehension, Reasoning, and Numeracy.',
      category: 'Civil Services / UPSC',
      duration_minutes: 15,
      total_questions: 9,
      is_active: true,
      sections: null,
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
      const fallback = getSafeQuestionsForContext({ examId });
      const fallbackSections = examId === 'e2' ? getFallbackExams()[1].sections : null;
      return {
        questions: fallback,
        isRemote: false,
        examId,
        sections: fallbackSections,
      };
    }

    const [questionsRes, examRes] = await Promise.all([
      supabase
        .from('exam_active_questions')
        .select('question_id, type, text, subject, topic, difficulty, options, explanation, order_index, exam_id, section_name')
        .eq('exam_id', examId)
        .order('order_index', { ascending: true }),
      supabase
        .from('exams')
        .select('sections')
        .eq('id', examId)
        .maybeSingle()
    ]);

    const error = questionsRes.error;
    const data = questionsRes.data;
    const sections = (examRes.data?.sections as any) || null;

    if (error) {
      console.warn(`[ExamRepository] Supabase error for exam ${examId}:`, error.message);
      return {
        questions: getSafeQuestionsForContext({ examId }),
        isRemote: false,
        error: error.message,
        examId,
        sections,
      };
    }

    if (!data || data.length === 0) {
      console.warn(`[ExamRepository] No rows returned for exam ${examId}, using safe fallback.`);
      return {
        questions: getSafeQuestionsForContext({ examId }),
        isRemote: false,
        examId,
        sections,
      };
    }

    const mapped = data.map(mapSafeRowToQuestion);
    return {
      questions: mapped,
      isRemote: true,
      examId,
      sections,
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
      .select('id, status, started_at, exams(duration_minutes)')
      .eq('user_id', user.id)
      .eq('exam_id', examId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!fetchErr && existing && existing.id) {
      const startedMs = new Date(existing.started_at).getTime();
      const elapsedSeconds = Math.floor((Date.now() - startedMs) / 1000);
      const durationMin = (existing.exams as any)?.duration_minutes || 15;
      const maxAllowedSeconds = (durationMin * 60) + (15 * 60); // 15 min grace

      if (elapsedSeconds > maxAllowedSeconds) {
        // Mark stale attempt as abandoned so candidate starts a fresh valid session
        await supabase
          .from('exam_attempts')
          .update({
            status: 'abandoned',
            summary_metrics: {
              abandonedAt: new Date().toISOString(),
              reason: 'CHECK_ON_READ_EXPIRED',
              elapsedSeconds,
              durationMinutes: durationMin,
            },
          })
          .eq('id', existing.id)
          .eq('status', 'in_progress');
      } else {
        return { attemptId: existing.id };
      }
    }

    // 2. Query exam configuration to check for sectional timing
    const { data: examData } = await supabase
      .from('exams')
      .select('sections')
      .eq('id', examId)
      .maybeSingle();

    let initialSectionProgress: any = null;
    if (examData?.sections && Array.isArray(examData.sections) && examData.sections.length > 0) {
      const nowIso = new Date().toISOString();
      initialSectionProgress = {
        active_section_index: 0,
        sections: examData.sections.map((sec: any, idx: number) => ({
          section_id: sec.id,
          name: sec.name,
          order_index: sec.order_index ?? idx,
          duration_seconds: (sec.duration_minutes || 5) * 60,
          time_used_seconds: 0,
          started_at: idx === 0 ? nowIso : null,
          submitted_at: null,
          status: idx === 0 ? 'in_progress' : 'pending',
          timing_flag: 'NORMAL',
        })),
      };
    }

    // 3. Create new in_progress attempt using candidate client (strictly verified by RLS)
    const { data: created, error: insertErr } = await supabase
      .from('exam_attempts')
      .insert({
        user_id: user.id,
        exam_id: examId,
        status: 'in_progress',
        total_questions: totalQuestions,
        section_progress: initialSectionProgress,
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
 * Persists an active candidate answer during the exam with sectional timing validation.
 * Non-blocking, fails gracefully without disrupting the candidate.
 */
export async function saveCandidateAnswer(
  attemptId: string,
  questionId: string,
  userAnswer: any
): Promise<{ success: boolean; error?: string }> {
  if (!attemptId) return { success: false, error: 'No attemptId' };

  try {
    const res = await fetch('/api/exam/save-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId, questionId, userAnswer }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.warn('[ExamRepository] saveCandidateAnswer server notice:', data?.error);
      return { success: false, error: data?.error || 'Save answer rejected' };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('[ExamRepository] saveCandidateAnswer failed silently:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Updates section progress on the server when advancing or auto-submitting a section.
 */
export async function updateSectionProgress(
  attemptId: string,
  sectionId: string,
  timeUsedSeconds: number,
  advanceToNextSection: boolean = true
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch('/api/exam/section-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId,
        sectionId,
        timeUsedSeconds,
        advanceToNextSection,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || 'Failed to update section progress' };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error updating section progress' };
  }
}

/**
 * Submits the active candidate session to the secure server endpoint.
 */
export async function submitExamAttempt(
  attemptId: string,
  answers: Record<string, any>,
  timeRemaining?: number,
  sectionProgress?: any
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
        sectionProgress,
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

export interface CandidateActivityItem {
  id: string;
  examId: string;
  examTitle: string;
  subject?: string;
  score: number;
  totalQuestions: number;
  accuracy: number;
  correctCount: number;
  attemptedCount: number;
  submittedAt: string | null;
  timeUsedSeconds: number;
}

export interface CandidateSubjectMetric {
  subject: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number;
}

export interface CandidateDashboardAnalytics {
  completedAttemptsCount: number;
  averageScore: number;
  averageAccuracy: number;
  bestScore: number;
  totalQuestionsAttempted: number;
  subjectMetrics: CandidateSubjectMetric[];
  recentActivity: CandidateActivityItem[];
  trend: {
    hasTrend: boolean;
    trendDiff: number | null;
    latestAttempt: CandidateActivityItem | null;
    previousAttempt: CandidateActivityItem | null;
  };
  recommendations: Array<{
    id: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'MAINTAIN' | 'GENERAL';
    title: string;
    description: string;
    actionLabel: string;
    actionUrl: string;
  }>;
}

function resolveExamTitle(examId: string, remoteExamTitle?: string | null): string {
  if (remoteExamTitle) return remoteExamTitle;
  const pSet = PracticeSets.find(p => p.id === examId);
  if (pSet) return pSet.title;
  const exam = AvailableExams.find(e => e.id === examId);
  if (exam) return exam.title;
  return `Examination ${examId.toUpperCase()}`;
}

function getSubjectSlug(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes('general') || s.includes('gk')) return 'gk';
  if (s.includes('quant')) return 'quant';
  if (s.includes('reason')) return 'reasoning';
  if (s.includes('english')) return 'english';
  return 'all';
}

/**
 * Fetches real authenticated candidate analytics from completed exam attempts.
 * Strictly scoped to the authenticated candidate under Supabase RLS.
 */
export async function getCandidateDashboardAnalytics(): Promise<CandidateDashboardAnalytics> {
  const emptyAnalytics: CandidateDashboardAnalytics = {
    completedAttemptsCount: 0,
    averageScore: 0,
    averageAccuracy: 0,
    bestScore: 0,
    totalQuestionsAttempted: 0,
    subjectMetrics: [],
    recentActivity: [],
    trend: {
      hasTrend: false,
      trendDiff: null,
      latestAttempt: null,
      previousAttempt: null,
    },
    recommendations: [
      {
        id: 'no-data',
        priority: 'GENERAL',
        title: 'Start Practicing',
        description: 'Complete your first practice exam to unlock personalized recommendations.',
        actionLabel: 'Take a Mock Exam',
        actionUrl: '/exam',
      },
    ],
  };

  try {
    const supabase = createClient();
    if (!supabase) return emptyAnalytics;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return emptyAnalytics;

    // Fetch ONLY completed attempts for this candidate under RLS
    const { data: attempts, error } = await supabase
      .from('exam_attempts')
      .select('id, user_id, exam_id, status, score, accuracy, total_questions, attempted_count, correct_count, incorrect_count, time_used_seconds, summary_metrics, started_at, submitted_at, exams(id, title, subject, category)')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('submitted_at', { ascending: false });

    if (error || !attempts || attempts.length === 0) {
      return emptyAnalytics;
    }

    const completedAttemptsCount = attempts.length;
    const averageScore = Number(
      (attempts.reduce((sum, a) => sum + (Number(a.score) || 0), 0) / completedAttemptsCount).toFixed(1)
    );
    const averageAccuracy = Math.round(
      attempts.reduce((sum, a) => sum + (Number(a.accuracy) || 0), 0) / completedAttemptsCount
    );
    const bestScore = Math.max(...attempts.map(a => Number(a.score) || 0));
    const totalQuestionsAttempted = attempts.reduce((sum, a) => sum + (a.attempted_count || 0), 0);

    // Map recent activity items
    const recentActivity: CandidateActivityItem[] = attempts.slice(0, 10).map((a: any) => ({
      id: a.id,
      examId: a.exam_id,
      examTitle: resolveExamTitle(a.exam_id, a.exams?.title),
      subject: a.exams?.subject || undefined,
      score: Number(a.score) || 0,
      totalQuestions: a.total_questions || 0,
      accuracy: Math.round(Number(a.accuracy) || 0),
      correctCount: a.correct_count || 0,
      attemptedCount: a.attempted_count || 0,
      submittedAt: a.submitted_at || a.started_at,
      timeUsedSeconds: a.time_used_seconds || 0,
    }));

    // Aggregate subject metrics across completed attempts
    const subjectMap: Record<string, CandidateSubjectMetric> = {};
    for (const att of attempts) {
      const metricsArray = (att.summary_metrics as any)?.subjectMetrics;
      if (Array.isArray(metricsArray)) {
        for (const sm of metricsArray) {
          const subName = sm.subject || 'General Assessment';
          if (!subjectMap[subName]) {
            subjectMap[subName] = {
              subject: subName,
              totalQuestions: 0,
              attempted: 0,
              correct: 0,
              incorrect: 0,
              accuracy: 0,
            };
          }
          subjectMap[subName].totalQuestions += Number(sm.totalQuestions) || 0;
          subjectMap[subName].attempted += Number(sm.attempted) || 0;
          subjectMap[subName].correct += Number(sm.correct) || 0;
          subjectMap[subName].incorrect += Number(sm.incorrect) || 0;
        }
      }
    }

    const subjectMetrics: CandidateSubjectMetric[] = Object.values(subjectMap).map(s => ({
      ...s,
      accuracy: s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0,
    }));

    // Sort subject metrics by lowest accuracy first to highlight improvement areas
    subjectMetrics.sort((a, b) => a.accuracy - b.accuracy);

    // Calculate trend from last 2 attempts
    const latestAttempt = recentActivity.length > 0 ? recentActivity[0] : null;
    const previousAttempt = recentActivity.length > 1 ? recentActivity[1] : null;
    const hasTrend = Boolean(latestAttempt && previousAttempt);
    const trendDiff = hasTrend && latestAttempt && previousAttempt
      ? latestAttempt.accuracy - previousAttempt.accuracy
      : null;

    // Synthesize data-driven recommendations
    const recommendations: CandidateDashboardAnalytics['recommendations'] = [];

    // 1. Weak subjects (accuracy < 70)
    const weakSubjects = subjectMetrics.filter(s => s.attempted > 0 && s.accuracy < 70);
    for (const ws of weakSubjects) {
      const slug = getSubjectSlug(ws.subject);
      const isCritical = ws.accuracy < 50;
      recommendations.push({
        id: `weak-${ws.subject}`,
        priority: isCritical ? 'CRITICAL' : 'HIGH',
        title: `${ws.subject} Focus Area`,
        description: `Your accuracy in ${ws.subject} is currently ${ws.accuracy}% (${ws.correct}/${ws.attempted} correct). Targeted practice is recommended.`,
        actionLabel: `Practice ${ws.subject}`,
        actionUrl: `/practice?subject=${slug}`,
      });
    }

    // 2. Strong subjects (accuracy >= 80)
    const strongSubjects = subjectMetrics.filter(s => s.attempted > 0 && s.accuracy >= 80);
    for (const ss of strongSubjects) {
      const slug = getSubjectSlug(ss.subject);
      recommendations.push({
        id: `strong-${ss.subject}`,
        priority: 'MAINTAIN',
        title: `${ss.subject} Mastery`,
        description: `Strong performance at ${ss.accuracy}% accuracy (${ss.correct}/${ss.attempted} correct). Maintain your competitive edge.`,
        actionLabel: 'Practice Advanced',
        actionUrl: `/practice?subject=${slug}&difficulty=advanced`,
      });
    }

    // 3. Overall trend indicator
    if (trendDiff !== null && trendDiff >= 5) {
      recommendations.push({
        id: 'trend-improving',
        priority: 'GENERAL',
        title: 'Steady Progress',
        description: `Your accuracy improved by ${trendDiff} percentage points over your previous completed examination.`,
        actionLabel: 'Continue Practice',
        actionUrl: '/practice',
      });
    }

    // Fallback if no specific weak/strong areas
    if (recommendations.length === 0) {
      recommendations.push({
        id: 'balanced-perf',
        priority: 'GENERAL',
        title: 'Comprehensive Practice',
        description: 'Keep building test stamina across all competitive syllabus areas.',
        actionLabel: 'Explore Practice Sets',
        actionUrl: '/practice',
      });
    }

    return {
      completedAttemptsCount,
      averageScore,
      averageAccuracy,
      bestScore,
      totalQuestionsAttempted,
      subjectMetrics,
      recentActivity,
      trend: {
        hasTrend,
        trendDiff,
        latestAttempt,
        previousAttempt,
      },
      recommendations: recommendations.slice(0, 4),
    };
  } catch (err) {
    console.warn('[ExamRepository] getCandidateDashboardAnalytics exception:', err);
    return emptyAnalytics;
  }
}

/**
 * Triggers background cleanup of stale in_progress attempts that exceeded
 * the exam's allotted duration plus grace period (15 minutes).
 */
export async function cleanupCandidateAbandonedAttempts(): Promise<number> {
  try {
    const res = await fetch('/api/exam/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return typeof data.cleanedCount === 'number' ? data.cleanedCount : 0;
    }
  } catch (err) {
    // Non-blocking cleanup failure should never break candidate UI
    console.warn('[ExamRepository] cleanupCandidateAbandonedAttempts error:', err);
  }
  return 0;
}

