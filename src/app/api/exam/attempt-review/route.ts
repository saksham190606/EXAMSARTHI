import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/exam/attempt-review?attemptId=...
 * 
 * Secure endpoint providing question-by-question review for an official completed exam attempt.
 * Enforces strict security constraints:
 * 1. Requires valid authenticated Supabase session.
 * 2. Strictly verifies candidate ownership (`attempt.user_id === user.id`).
 * 3. Strictly verifies attempt is `completed` (NEVER exposes answer keys for in-progress or abandoned attempts).
 * 4. Returns question text, candidate's submitted answer, correct answer, and explanation.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const attemptId = searchParams.get('attemptId');

    if (!attemptId) {
      return NextResponse.json(
        { error: 'Bad Request: Missing attemptId parameter' },
        { status: 400 }
      );
    }

    // 1. Authenticate candidate
    const admin = getSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Server database client unavailable' },
        { status: 503 }
      );
    }

    let user: any = null;
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: userData } = await admin.auth.getUser(token);
      if (userData?.user) {
        user = userData.user;
      }
    }

    if (!user) {
      const serverClient = await createSupabaseServerClient();
      if (serverClient) {
        const { data: userData } = await serverClient.auth.getUser();
        if (userData?.user) {
          user = userData.user;
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid candidate session required' },
        { status: 401 }
      );
    }

    // 2. Fetch attempt and enforce ownership
    const { data: attempt, error: attemptError } = await admin
      .from('exam_attempts')
      .select('id, user_id, exam_id, status, score, accuracy, total_questions, correct_count, incorrect_count')
      .eq('id', attemptId)
      .maybeSingle();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: 'Attempt not found or access denied' },
        { status: 404 }
      );
    }

    if (attempt.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Attempt belongs to a different candidate' },
        { status: 403 }
      );
    }

    // CRITICAL: Only completed attempts can be reviewed with answer keys!
    if (attempt.status !== 'completed') {
      return NextResponse.json(
        { error: 'Review is only available for completed exam attempts' },
        { status: 403 }
      );
    }

    // 3. Fetch exam questions mapping
    const { data: examQuestions, error: eqError } = await admin
      .from('exam_questions')
      .select('question_id, order_index, section_name')
      .eq('exam_id', attempt.exam_id)
      .order('order_index', { ascending: true });

    if (eqError || !examQuestions || examQuestions.length === 0) {
      return NextResponse.json(
        { error: 'Exam question mappings not found' },
        { status: 404 }
      );
    }

    const questionIds = examQuestions.map(eq => eq.question_id);

    // 4. Fetch raw questions (with answer keys & explanations)
    const { data: rawQuestions, error: rawError } = await admin
      .from('questions')
      .select('id, text, type, subject, topic, difficulty, options, correct_answer, acceptable_answers, explanation')
      .in('id', questionIds);

    if (rawError || !rawQuestions) {
      return NextResponse.json(
        { error: 'Failed to retrieve question details' },
        { status: 500 }
      );
    }

    const questionMap = new Map(rawQuestions.map(q => [q.id, q]));

    // 5. Fetch candidate's persisted answers
    const { data: attemptAnswers, error: ansError } = await admin
      .from('attempt_answers')
      .select('question_id, user_answer, is_correct')
      .eq('attempt_id', attempt.id);

    const answersMap = new Map((attemptAnswers || []).map(a => [a.question_id, a]));

    // 6. Build the candidate review payload
    const reviewItems = examQuestions.map((eq) => {
      const q = questionMap.get(eq.question_id);
      const ans = answersMap.get(eq.question_id);

      return {
        questionId: eq.question_id,
        orderIndex: eq.order_index,
        sectionName: eq.section_name,
        text: q?.text || 'Question text unavailable',
        type: q?.type || 'single-choice',
        subject: q?.subject || 'General Assessment',
        topic: q?.topic || undefined,
        difficulty: q?.difficulty || undefined,
        options: q?.options || undefined,
        userAnswer: ans?.user_answer ?? null,
        isCorrect: ans?.is_correct ?? false,
        isAnswered: ans?.user_answer !== undefined && ans?.user_answer !== null,
        correctAnswer: q?.correct_answer ?? null,
        acceptableAnswers: q?.acceptable_answers ?? undefined,
        explanation: q?.explanation || undefined,
      };
    });

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      examId: attempt.exam_id,
      score: attempt.score,
      accuracy: attempt.accuracy,
      totalQuestions: attempt.total_questions,
      questions: reviewItems,
    });
  } catch (err: any) {
    console.error('[AttemptReview API] Exception:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal review error' },
      { status: 500 }
    );
  }
}
