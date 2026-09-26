import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server';
import { normalizeText } from '@/types/question';

interface SubmitRequestBody {
  attemptId: string;
  answers: Record<string, any>;
  timeRemaining?: number;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user from session cookies or Authorization header
    let user: any = null;
    let candidateSupabase = await createSupabaseServerClient();

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const admin = getSupabaseAdminClient();
      if (admin) {
        const { data: userData, error: userError } = await admin.auth.getUser(token);
        if (!userError && userData?.user) {
          user = userData.user;
        }
      }
    }

    if (!user && candidateSupabase) {
      const { data: userData, error: authError } = await candidateSupabase.auth.getUser();
      if (!authError && userData?.user) {
        user = userData.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid candidate session required' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body: SubmitRequestBody = await req.json().catch(() => null);
    if (!body || !body.attemptId || typeof body.attemptId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request: Missing or invalid attemptId' },
        { status: 400 }
      );
    }

    const { attemptId, answers = {}, timeRemaining = 0 } = body;

    // 3. Retrieve attempt and verify candidate ownership
    const admin = getSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Server database client unavailable' },
        { status: 503 }
      );
    }

    const { data: attempt, error: attemptFetchError } = await admin
      .from('exam_attempts')
      .select('id, user_id, exam_id, status, total_questions, started_at, submitted_at, score, accuracy, attempted_count, correct_count, incorrect_count, time_used_seconds, summary_metrics')
      .eq('id', attemptId)
      .maybeSingle();

    if (attemptFetchError || !attempt) {
      return NextResponse.json(
        { error: 'Attempt not found or access denied' },
        { status: 404 }
      );
    }

    // Double check ownership
    if (attempt.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Attempt belongs to a different candidate' },
        { status: 403 }
      );
    }

    // 4. Idempotency check: if attempt is already completed, return existing safe results
    if (attempt.status === 'completed') {
      return NextResponse.json({
        success: true,
        isCompleted: true,
        alreadySubmitted: true,
        attemptId: attempt.id,
        examId: attempt.exam_id,
        summary: {
          totalQuestions: attempt.total_questions,
          attempted: attempt.attempted_count,
          unanswered: Math.max(0, attempt.total_questions - attempt.attempted_count),
          correct: attempt.correct_count,
          incorrect: attempt.incorrect_count,
          score: attempt.score,
          percentage: attempt.accuracy,
          timeUsedSeconds: attempt.time_used_seconds,
          submittedAt: attempt.submitted_at,
          summaryMetrics: attempt.summary_metrics,
        },
      });
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json(
        { error: `Attempt is closed with status: ${attempt.status}` },
        { status: 409 }
      );
    }

    // 5. Fetch associated questions & answer keys PRIVATELY using Admin Client
    // Service-role is strictly required here to read correct_answer from public.questions
    const adminSupabase = getSupabaseAdminClient();
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Server evaluation engine unconfigured' },
        { status: 500 }
      );
    }

    // Retrieve the deterministic question cohort for this exam
    const { data: examQuestions, error: eqError } = await adminSupabase
      .from('exam_questions')
      .select('question_id, order_index, section_name')
      .eq('exam_id', attempt.exam_id)
      .order('order_index', { ascending: true });

    if (eqError || !examQuestions || examQuestions.length === 0) {
      return NextResponse.json(
        { error: `Exam questions mapping missing for exam ${attempt.exam_id}` },
        { status: 500 }
      );
    }

    const questionIds = examQuestions.map(eq => eq.question_id);

    // Retrieve raw questions with protected answer keys ONLY on the server
    const { data: rawQuestions, error: rawQError } = await adminSupabase
      .from('questions')
      .select('id, type, subject, topic, difficulty, correct_answer, acceptable_answers')
      .in('id', questionIds);

    if (rawQError || !rawQuestions || rawQuestions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to retrieve question keys for grading' },
        { status: 500 }
      );
    }

    const questionMap = new Map(rawQuestions.map(q => [q.id, q]));

    // 6. Server-side grading across all five supported question formats
    let attemptedCount = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    const totalQuestions = examQuestions.length;

    const subjectMetricsMap: Record<string, {
      subject: string;
      totalQuestions: number;
      attempted: number;
      correct: number;
      incorrect: number;
      accuracy: number;
    }> = {};

    const evaluatedAnswers: Array<{
      attempt_id: string;
      question_id: string;
      user_answer: any;
      is_correct: boolean;
    }> = [];

    for (const eq of examQuestions) {
      const q = questionMap.get(eq.question_id);
      if (!q) continue;

      // Subject tracking
      if (!subjectMetricsMap[q.subject]) {
        subjectMetricsMap[q.subject] = {
          subject: q.subject,
          totalQuestions: 0,
          attempted: 0,
          correct: 0,
          incorrect: 0,
          accuracy: 0,
        };
      }
      subjectMetricsMap[q.subject].totalQuestions++;

      const candidateAns = answers[q.id];
      const isAnswerProvided = candidateAns !== undefined && candidateAns !== null && candidateAns !== '';

      let isCorrect = false;

      if (isAnswerProvided) {
        attemptedCount++;
        subjectMetricsMap[q.subject].attempted++;

        switch (q.type) {
          case 'single-choice': {
            isCorrect = typeof candidateAns === 'string' && candidateAns === q.correct_answer;
            break;
          }

          case 'multiple-choice': {
            if (Array.isArray(candidateAns)) {
              const correctList = Array.isArray(q.correct_answer)
                ? q.correct_answer
                : [q.correct_answer];
              const correctSet = new Set(correctList);
              const userSet = new Set(candidateAns);

              if (correctSet.size === userSet.size) {
                let matchesAll = true;
                for (const item of userSet) {
                  if (!correctSet.has(item)) {
                    matchesAll = false;
                    break;
                  }
                }
                isCorrect = matchesAll;
              }
            }
            break;
          }

          case 'true-false': {
            const rawCorr: any = q.correct_answer;
            const userBool = typeof candidateAns === 'boolean'
              ? candidateAns
              : (candidateAns === 'true' || candidateAns === true);
            const correctBool = typeof rawCorr === 'boolean'
              ? rawCorr
              : (rawCorr === 'true' || rawCorr === true);
            isCorrect = userBool === correctBool;
            break;
          }

          case 'short-answer':
          case 'fill-blank': {
            if (typeof candidateAns === 'string' && candidateAns.trim().length > 0) {
              const normUser = normalizeText(candidateAns);
              const acceptableList = Array.isArray(q.acceptable_answers)
                ? q.acceptable_answers
                : [];
              const candidates = [q.correct_answer, ...acceptableList].map(ans => normalizeText(String(ans)));
              isCorrect = candidates.includes(normUser);
            }
            break;
          }

          default:
            isCorrect = false;
        }

        if (isCorrect) {
          correctCount++;
          subjectMetricsMap[q.subject].correct++;
        } else {
          incorrectCount++;
          subjectMetricsMap[q.subject].incorrect++;
        }

        evaluatedAnswers.push({
          attempt_id: attempt.id,
          question_id: q.id,
          user_answer: candidateAns,
          is_correct: isCorrect,
        });
      }
    }

    // Calculate accuracies
    for (const key of Object.keys(subjectMetricsMap)) {
      const sm = subjectMetricsMap[key];
      sm.accuracy = sm.attempted > 0 ? Math.round((sm.correct / sm.attempted) * 100) : 0;
    }

    const calculatedScore = correctCount; // 1 mark per correct question
    const calculatedAccuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    
    // Compute duration in seconds safely on server
    const startTimeMs = new Date(attempt.started_at).getTime();
    const serverNow = new Date();
    const elapsedSeconds = Math.max(0, Math.floor((serverNow.getTime() - startTimeMs) / 1000));
    const effectiveTimeUsed = Math.min(elapsedSeconds, 900); // capped at duration ceiling

    // 7. Persist candidate answers using upsert on (attempt_id, question_id)
    if (evaluatedAnswers.length > 0) {
      const { error: upsertAnswersError } = await adminSupabase
        .from('attempt_answers')
        .upsert(evaluatedAnswers, { onConflict: 'attempt_id,question_id' });

      if (upsertAnswersError) {
        console.error('[Submit API] Failed to upsert attempt_answers:', upsertAnswersError);
      }
    }

    // 8. Update and lock the attempt as 'completed'
    const subjectMetricsArray = Object.values(subjectMetricsMap);
    const summaryMetrics = {
      subjectMetrics: subjectMetricsArray,
      evaluatedAt: serverNow.toISOString(),
      questionCount: totalQuestions,
    };

    const { error: updateAttemptError } = await adminSupabase
      .from('exam_attempts')
      .update({
        status: 'completed',
        score: calculatedScore,
        accuracy: calculatedAccuracy,
        attempted_count: attemptedCount,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        time_used_seconds: effectiveTimeUsed,
        summary_metrics: summaryMetrics,
        submitted_at: serverNow.toISOString(),
      })
      .eq('id', attempt.id)
      .eq('status', 'in_progress'); // Extra check to guarantee atomic single-write transition

    if (updateAttemptError) {
      console.error('[Submit API] Failed to update exam_attempt to completed:', updateAttemptError);
      return NextResponse.json(
        { error: 'Failed to finalize attempt completion' },
        { status: 500 }
      );
    }

    // 9. Return ONLY candidate-safe summary without leaking answer keys
    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      examId: attempt.exam_id,
      summary: {
        totalQuestions,
        attempted: attemptedCount,
        unanswered: totalQuestions - attemptedCount,
        correct: correctCount,
        incorrect: incorrectCount,
        score: calculatedScore,
        percentage: calculatedAccuracy,
        timeUsedSeconds: effectiveTimeUsed,
        submittedAt: serverNow.toISOString(),
        summaryMetrics,
      },
    });
  } catch (err: any) {
    console.error('[Submit API] Unhandled exception:', err);
    return NextResponse.json(
      { error: 'Internal Server Error during exam evaluation' },
      { status: 500 }
    );
  }
}
