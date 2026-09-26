import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/exam/cleanup
 * 
 * Scans for stale `in_progress` exam attempts that have exceeded
 * the exam's allotted duration + 15 minute grace period, and transitions
 * them to `status = 'abandoned'`.
 * 
 * Accessible to authenticated candidates (scoped to their own attempts)
 * or system/cron callers with service-role token.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Server database client unavailable' },
        { status: 503 }
      );
    }

    // 1. Identify caller (scoped candidate or system)
    let candidateUserId: string | null = null;
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: userData } = await admin.auth.getUser(token);
      if (userData?.user) {
        candidateUserId = userData.user.id;
      }
    }

    if (!candidateUserId) {
      const serverClient = await createSupabaseServerClient();
      if (serverClient) {
        const { data: userData } = await serverClient.auth.getUser();
        if (userData?.user) {
          candidateUserId = userData.user.id;
        }
      }
    }

    if (!candidateUserId) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid candidate session required' },
        { status: 401 }
      );
    }

    // 2. Fetch all exams to map their duration_minutes
    const { data: exams, error: examsError } = await admin
      .from('exams')
      .select('id, duration_minutes');

    if (examsError || !exams) {
      return NextResponse.json(
        { error: 'Failed to retrieve exam durations' },
        { status: 500 }
      );
    }

    const examDurationMap = new Map(exams.map(e => [e.id, (e.duration_minutes || 15) * 60]));

    // 3. Query in_progress attempts
    let query = admin
      .from('exam_attempts')
      .select('id, user_id, exam_id, started_at, status')
      .eq('status', 'in_progress');

    if (candidateUserId) {
      query = query.eq('user_id', candidateUserId);
    }

    const { data: inProgressAttempts, error: attemptsError } = await query;
    if (attemptsError) {
      return NextResponse.json(
        { error: 'Failed to query in-progress attempts' },
        { status: 500 }
      );
    }

    if (!inProgressAttempts || inProgressAttempts.length === 0) {
      return NextResponse.json({
        success: true,
        cleanedCount: 0,
        abandonedAttemptIds: [],
        message: 'No stale in-progress attempts found',
      });
    }

    const nowMs = Date.now();
    const GRACE_PERIOD_SECONDS = 15 * 60; // 15 minutes grace period
    const staleAttemptIds: string[] = [];

    for (const att of inProgressAttempts) {
      const startedMs = new Date(att.started_at).getTime();
      const elapsedSeconds = Math.floor((nowMs - startedMs) / 1000);
      const durationSeconds = examDurationMap.get(att.exam_id) || (15 * 60);
      const expiryThreshold = durationSeconds + GRACE_PERIOD_SECONDS;

      if (elapsedSeconds > expiryThreshold) {
        staleAttemptIds.push(att.id);
      }
    }

    if (staleAttemptIds.length === 0) {
      return NextResponse.json({
        success: true,
        cleanedCount: 0,
        abandonedAttemptIds: [],
        message: 'All in-progress attempts remain within active exam window',
      });
    }

    // 4. Update stale attempts to 'abandoned'
    const { error: updateError } = await admin
      .from('exam_attempts')
      .update({
        status: 'abandoned',
        summary_metrics: {
          abandonedAt: new Date().toISOString(),
          reason: 'CLEANUP_EXPIRED_WINDOW',
          gracePeriodMinutes: 15,
        }
      })
      .in('id', staleAttemptIds)
      .eq('status', 'in_progress');

    if (updateError) {
      console.error('[Cleanup API] Error updating abandoned attempts:', updateError);
      return NextResponse.json(
        { error: 'Failed to update stale attempts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cleanedCount: staleAttemptIds.length,
      abandonedAttemptIds: staleAttemptIds,
      message: `Cleaned up ${staleAttemptIds.length} expired attempt(s)`,
    });
  } catch (err: any) {
    console.error('[Cleanup API] Exception:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal cleanup error' },
      { status: 500 }
    );
  }
}
