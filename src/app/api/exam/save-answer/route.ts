import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server';
import { SectionProgressItem } from '@/types/section';

/**
 * POST /api/exam/save-answer
 * 
 * Secure answer-saving endpoint that validates:
 * 1. Valid authenticated candidate session.
 * 2. Attempt ownership (`attempt.user_id === user.id`).
 * 3. Attempt is `in_progress`.
 * 4. SECTIONAL ANTI-TAMPER RULE:
 *    If the exam has sections, verifies that the target question belongs to the ACTIVE
 *    section and that the section has not expired or been submitted. Any attempt to modify
 *    or record answers in a completed or expired section is rejected with HTTP 403 Forbidden.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { attemptId, questionId, userAnswer } = body;
    if (!attemptId || !questionId) {
      return NextResponse.json(
        { error: 'Missing required fields: attemptId, questionId' },
        { status: 400 }
      );
    }

    const adminSupabase = getSupabaseAdminClient();
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Server evaluation engine unconfigured' },
        { status: 500 }
      );
    }

    // 1. Authenticate candidate
    let user: any = null;
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: userData } = await adminSupabase.auth.getUser(token);
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

    // 2. Fetch attempt
    const { data: attempt, error: attemptError } = await adminSupabase
      .from('exam_attempts')
      .select('id, user_id, exam_id, status, started_at, section_progress')
      .eq('id', attemptId)
      .maybeSingle();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: 'Exam attempt not found' },
        { status: 404 }
      );
    }

    if (attempt.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Attempt belongs to a different candidate' },
        { status: 403 }
      );
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json(
        { error: `Cannot save answers: Attempt is closed with status: ${attempt.status}` },
        { status: 409 }
      );
    }

    // 3. Sectional Timing & Anti-Tamper Enforcement
    const sectionProgress = attempt.section_progress as {
      active_section_index: number;
      sections: SectionProgressItem[];
    } | null;

    if (sectionProgress && Array.isArray(sectionProgress.sections) && sectionProgress.sections.length > 0) {
      // Find question's section
      const { data: eqData } = await adminSupabase
        .from('exam_questions')
        .select('section_name')
        .eq('exam_id', attempt.exam_id)
        .eq('question_id', questionId)
        .maybeSingle();

      const questionSectionName = eqData?.section_name;

      if (questionSectionName) {
        const targetSection = sectionProgress.sections.find(
          s => (s.name && s.name.toLowerCase() === questionSectionName.toLowerCase()) ||
               (s.section_id && s.section_id.toLowerCase() === questionSectionName.toLowerCase())
        );

        if (targetSection) {
          // Reject if section is marked expired or completed
          if (targetSection.status === 'expired' || targetSection.status === 'completed') {
            return NextResponse.json(
              {
                error: `Forbidden: Section '${targetSection.name}' is ${targetSection.status}. Answers cannot be modified for closed sections.`,
                code: 'SECTION_LOCKED_OR_EXPIRED',
                sectionStatus: targetSection.status,
                sectionName: targetSection.name
              },
              { status: 403 }
            );
          }

          // Check if server time has exceeded section duration
          if (targetSection.status === 'in_progress' && targetSection.started_at) {
            const secStart = new Date(targetSection.started_at).getTime();
            const elapsed = Math.floor((Date.now() - secStart) / 1000);
            const gracePeriod = 30; // 30s grace for in-flight requests

            if (elapsed > (targetSection.duration_seconds + gracePeriod)) {
              // Mark section expired on server
              targetSection.status = 'expired';
              targetSection.submitted_at = new Date().toISOString();
              targetSection.time_used_seconds = targetSection.duration_seconds;
              targetSection.timing_flag = 'EXCEEDED_ALLOTTED_TIME_CAPPED';

              await adminSupabase
                .from('exam_attempts')
                .update({ section_progress: sectionProgress as any })
                .eq('id', attempt.id);

              return NextResponse.json(
                {
                  error: `Forbidden: Time limit expired for section '${targetSection.name}'.`,
                  code: 'SECTION_TIME_EXPIRED',
                  sectionStatus: 'expired',
                  sectionName: targetSection.name
                },
                { status: 403 }
              );
            }
          }
        }
      }
    }

    // 4. Save/upsert candidate's answer
    const { error: upsertError } = await adminSupabase
      .from('attempt_answers')
      .upsert(
        {
          attempt_id: attemptId,
          question_id: questionId,
          user_answer: userAnswer,
        },
        { onConflict: 'attempt_id,question_id' }
      );

    if (upsertError) {
      console.error('[SaveAnswer API] Error upserting answer:', upsertError);
      return NextResponse.json(
        { error: 'Failed to record answer in database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      attemptId,
      questionId,
    });
  } catch (err: any) {
    console.error('[SaveAnswer API] Exception:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
