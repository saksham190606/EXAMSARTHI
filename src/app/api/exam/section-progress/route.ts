import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server';
import { ExamSectionProgress, SectionProgressItem } from '@/types/section';

/**
 * POST /api/exam/section-progress
 * 
 * Server-side sectional timing enforcement endpoint.
 * Enforces:
 * 1. Candidate session authentication and attempt ownership.
 * 2. Attempt must be in_progress.
 * 3. Validates section elapsed time against allotted duration ceiling.
 * 4. Flags timing discrepancies (CLIENT_SERVER_TIME_DISCREPANCY, EXCEEDED_ALLOTTED_TIME_CAPPED).
 * 5. Locks completed/expired sections so questions cannot be tampered with.
 * 6. Advances active section index and records server-timestamped start for the next section.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Server database client unconfigured' },
        { status: 503 }
      );
    }

    // 1. Authenticate candidate
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

    // 2. Parse request payload
    const body = await req.json().catch(() => null);
    if (!body || !body.attemptId || !body.sectionId) {
      return NextResponse.json(
        { error: 'Bad Request: Missing attemptId or sectionId' },
        { status: 400 }
      );
    }

    const { attemptId, sectionId, timeUsedSeconds = 0, advanceToNextSection = true } = body;

    // 3. Fetch attempt and verify ownership
    const { data: attempt, error: attemptError } = await admin
      .from('exam_attempts')
      .select('id, user_id, exam_id, status, started_at, section_progress')
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
        { error: 'Forbidden: Attempt belongs to another candidate' },
        { status: 403 }
      );
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json(
        { error: `Attempt is closed with status: ${attempt.status}` },
        { status: 409 }
      );
    }

    // 4. Fetch exam configuration to verify section duration limits
    const { data: exam, error: examError } = await admin
      .from('exams')
      .select('id, sections, duration_minutes')
      .eq('id', attempt.exam_id)
      .maybeSingle();

    if (examError || !exam || !Array.isArray(exam.sections) || exam.sections.length === 0) {
      return NextResponse.json(
        { error: 'This examination does not have configured sectional timing' },
        { status: 400 }
      );
    }

    const examSections: any[] = exam.sections;
    const targetSection = examSections.find(s => s.id === sectionId);

    if (!targetSection) {
      return NextResponse.json(
        { error: `Section ${sectionId} not found on exam ${attempt.exam_id}` },
        { status: 404 }
      );
    }

    const sectionDurationSeconds = (targetSection.duration_minutes || 5) * 60;
    const sectionGraceSeconds = 30; // 30s grace window for network latency

    // 5. Initialize or read existing section_progress
    const currentProgress: ExamSectionProgress = (attempt.section_progress as any) || {
      active_section_index: 0,
      sections: examSections.map((s, idx) => ({
        section_id: s.id,
        name: s.name,
        order_index: s.order_index ?? idx,
        duration_seconds: (s.duration_minutes || 5) * 60,
        time_used_seconds: 0,
        started_at: idx === 0 ? attempt.started_at : null,
        submitted_at: null,
        status: idx === 0 ? 'in_progress' : 'pending',
        timing_flag: 'NORMAL',
      })),
    };

    const targetSecProgress = currentProgress.sections.find(s => s.section_id === sectionId);
    if (!targetSecProgress) {
      return NextResponse.json(
        { error: 'Section progress record not initialized' },
        { status: 500 }
      );
    }

    // Check if section is already locked
    if (targetSecProgress.status === 'completed' || targetSecProgress.status === 'expired') {
      return NextResponse.json(
        { error: `Section ${targetSection.name} is already locked and cannot be re-submitted`, sectionProgress: currentProgress },
        { status: 409 }
      );
    }

    // 6. Server timing validation
    const serverNow = new Date();
    const sectionStartMs = targetSecProgress.started_at
      ? new Date(targetSecProgress.started_at).getTime()
      : new Date(attempt.started_at).getTime();

    const serverElapsedSeconds = Math.max(0, Math.floor((serverNow.getTime() - sectionStartMs) / 1000));
    const clientReported = typeof timeUsedSeconds === 'number' ? Math.max(0, timeUsedSeconds) : serverElapsedSeconds;
    const discrepancy = Math.abs(serverElapsedSeconds - clientReported);

    const isExceeded = serverElapsedSeconds > (sectionDurationSeconds + sectionGraceSeconds);
    const effectiveTimeUsed = Math.min(serverElapsedSeconds, sectionDurationSeconds);

    const timingFlag = isExceeded
      ? 'EXCEEDED_ALLOTTED_TIME_CAPPED'
      : discrepancy > 60
        ? 'CLIENT_SERVER_TIME_DISCREPANCY'
        : 'NORMAL';

    // Lock target section
    targetSecProgress.time_used_seconds = effectiveTimeUsed;
    targetSecProgress.submitted_at = serverNow.toISOString();
    targetSecProgress.status = isExceeded ? 'expired' : 'completed';
    targetSecProgress.timing_flag = timingFlag;

    // 7. Advance to next section if requested
    const currentIdx = examSections.findIndex(s => s.id === sectionId);
    if (advanceToNextSection && currentIdx < examSections.length - 1) {
      const nextIdx = currentIdx + 1;
      currentProgress.active_section_index = nextIdx;

      const nextSec = currentProgress.sections[nextIdx];
      if (nextSec && nextSec.status === 'pending') {
        nextSec.status = 'in_progress';
        nextSec.started_at = serverNow.toISOString();
      }
    }

    // 8. Persist updated section_progress
    const { error: updateError } = await admin
      .from('exam_attempts')
      .update({
        section_progress: currentProgress as any,
      })
      .eq('id', attempt.id)
      .eq('status', 'in_progress');

    if (updateError) {
      console.error('[SectionProgress API] Failed to update attempt section_progress:', updateError);
      return NextResponse.json(
        { error: 'Failed to record section progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sectionProgress: currentProgress,
      validatedSection: {
        sectionId,
        effectiveTimeUsed,
        timingFlag,
        serverElapsedSeconds,
        allottedDurationSeconds: sectionDurationSeconds,
      },
    });
  } catch (err: any) {
    console.error('[SectionProgress API] Exception:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal section progress error' },
      { status: 500 }
    );
  }
}
