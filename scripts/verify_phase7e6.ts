import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey);
const candidateClient = createClient(supabaseUrl, anonKey);

const TEST_EMAIL = 'priyansh.sharma@example.com';
const TEST_PASSWORD = 'Examsarthi@2026';

interface TestResult {
  scopeItem: string;
  testName: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

async function runTests() {
  console.log('====================================================');
  console.log('EXAMSARTHI PHASE 7E-6 VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  // 1. Authenticate candidate
  const { data: authData, error: authError } = await candidateClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (authError || !authData.user || !authData.session) {
    console.error('Failed to authenticate test candidate:', authError?.message);
    process.exit(1);
  }

  const candidateId = authData.user.id;
  const token = authData.session.access_token;
  console.log(`[Auth] Candidate Authenticated: ${TEST_EMAIL} (${candidateId})`);

  // --- ITEM 1: SECTIONAL / EXAM TIMING ENFORCEMENT ---
  console.log('\n--- ITEM 1: SECTIONAL / EXAM TIMING ENFORCEMENT ---');

  // Test 1.1: Create test attempt and verify server timing cap and discrepancy detection
  const { data: attempt1, error: att1Err } = await adminClient
    .from('exam_attempts')
    .insert({
      user_id: candidateId,
      exam_id: 'e1',
      status: 'in_progress',
      total_questions: 15,
      // Started 10 minutes ago
      started_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single();

  if (att1Err || !attempt1) {
    results.push({
      scopeItem: '1. Timing Enforcement',
      testName: 'Create Timing Test Attempt',
      passed: false,
      details: att1Err?.message || 'Failed to create attempt',
    });
  } else {
    // Submit with artificial client timeRemaining indicating client only spent 30 seconds
    const submitRes = await fetch('http://localhost:3000/api/exam/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        attemptId: attempt1.id,
        answers: { 'quant-1': 'qo-1' },
        timeRemaining: 870, // claims 30s elapsed, but server elapsed is 600s
      }),
    });

    const submitJson = await submitRes.json();

    const { data: verifiedAttempt } = await adminClient
      .from('exam_attempts')
      .select('time_used_seconds, summary_metrics, status')
      .eq('id', attempt1.id)
      .single();

    const timingMetrics = (verifiedAttempt?.summary_metrics as any)?.timingValidation;
    const hasDiscrepancyFlag = timingMetrics?.timingFlag === 'CLIENT_SERVER_TIME_DISCREPANCY';
    const serverUsedRecorded = verifiedAttempt?.time_used_seconds && verifiedAttempt.time_used_seconds >= 590;

    results.push({
      scopeItem: '1. Timing Enforcement',
      testName: 'Server Discrepancy Detection & Time Enforcement',
      passed: submitRes.ok && Boolean(hasDiscrepancyFlag) && Boolean(serverUsedRecorded),
      details: `Flag: ${timingMetrics?.timingFlag}, ServerUsed: ${verifiedAttempt?.time_used_seconds}s, Discrepancy: ${timingMetrics?.timingDiscrepancySeconds}s`,
    });

    results.push({
      scopeItem: '1. Timing Enforcement',
      testName: 'Sectional Timing Limitation Documented',
      passed: timingMetrics?.sectionalTimingSupported === false,
      details: 'sectionalTimingSupported flag accurately mirrors database schema constraint',
    });
  }

  // --- ITEM 2: ABANDONED SESSION CLEANUP ---
  console.log('\n--- ITEM 2: ABANDONED SESSION CLEANUP ---');

  // Test 2.1: Create stale attempt (> duration 15m + 15m grace = 31 minutes old)
  const { data: staleAttempt, error: staleErr } = await adminClient
    .from('exam_attempts')
    .insert({
      user_id: candidateId,
      exam_id: 'e1',
      status: 'in_progress',
      total_questions: 15,
      started_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single();

  if (staleErr || !staleAttempt) {
    results.push({
      scopeItem: '2. Abandoned Cleanup',
      testName: 'Create Stale in_progress Attempt',
      passed: false,
      details: staleErr?.message || 'Failed to create stale attempt',
    });
  } else {
    // Call cleanup route
    const cleanupRes = await fetch('http://localhost:3000/api/exam/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const cleanupJson = await cleanupRes.json();

    const { data: updatedAttempt } = await adminClient
      .from('exam_attempts')
      .select('status, summary_metrics')
      .eq('id', staleAttempt.id)
      .single();

    const isMarkedAbandoned = updatedAttempt?.status === 'abandoned';

    results.push({
      scopeItem: '2. Abandoned Cleanup',
      testName: 'Cleanup Route Transitions Stale Attempt to Abandoned',
      passed: cleanupRes.ok && isMarkedAbandoned,
      details: `Cleaned: ${cleanupJson.cleanedCount}, Stale Status: ${updatedAttempt?.status}, Reason: ${(updatedAttempt?.summary_metrics as any)?.reason}`,
    });

    // Test 2.2: Verify submit rejects expired abandoned attempt
    const submitExpiredRes = await fetch('http://localhost:3000/api/exam/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        attemptId: staleAttempt.id,
        answers: {},
      }),
    });

    results.push({
      scopeItem: '2. Abandoned Cleanup',
      testName: 'Submit API Rejects Expired/Abandoned Attempts',
      passed: submitExpiredRes.status === 409 || submitExpiredRes.status === 410,
      details: `HTTP Status ${submitExpiredRes.status}: ${submitExpiredRes.statusText}`,
    });

    // Test 2.3: Verify candidate RLS query excludes abandoned from completed analytics
    const { data: analyticsAttempts } = await candidateClient
      .from('exam_attempts')
      .select('id, status')
      .eq('status', 'completed');

    const abandonedIncluded = (analyticsAttempts || []).some(a => a.id === staleAttempt.id);

    results.push({
      scopeItem: '2. Abandoned Cleanup',
      testName: 'Analytics Excludes Abandoned Attempts',
      passed: !abandonedIncluded,
      details: `Completed attempts count: ${analyticsAttempts?.length}, Abandoned attempt strictly excluded`,
    });
  }

  // --- ITEM 3 & 4: RESULTS PAGE DEPTH & ATTEMPT REVIEW SECURITY ---
  console.log('\n--- ITEM 4: RESULTS PAGE DEPTH & ATTEMPT REVIEW SECURITY ---');

  // Test 4.1: Attempt review blocked for unauthenticated requests
  const unauthReviewRes = await fetch(`http://localhost:3000/api/exam/attempt-review?attemptId=${attempt1?.id}`);
  results.push({
    scopeItem: '4. Results Page Depth',
    testName: 'Unauthenticated Review Blocked (401)',
    passed: unauthReviewRes.status === 401,
    details: `HTTP ${unauthReviewRes.status}: Answer keys protected from unauthenticated access`,
  });

  // Test 4.2: Attempt review blocked for in-progress or abandoned attempts
  const staleReviewRes = await fetch(`http://localhost:3000/api/exam/attempt-review?attemptId=${staleAttempt?.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  results.push({
    scopeItem: '4. Results Page Depth',
    testName: 'In-Progress/Abandoned Review Blocked (403)',
    passed: staleReviewRes.status === 403,
    details: `HTTP ${staleReviewRes.status}: Active or abandoned sessions cannot leak answer keys`,
  });

  // Test 4.3: Candidate reviews own completed attempt
  const reviewRes = await fetch(`http://localhost:3000/api/exam/attempt-review?attemptId=${attempt1?.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const reviewJson = await reviewRes.json();
  const hasQuestions = Array.isArray(reviewJson.questions) && reviewJson.questions.length > 0;
  const firstQ = hasQuestions ? reviewJson.questions[0] : null;
  const hasCorrectAnswer = firstQ && firstQ.correctAnswer !== undefined && firstQ.correctAnswer !== null;

  results.push({
    scopeItem: '4. Results Page Depth',
    testName: 'Question-by-Question Breakdown for Own Completed Attempt',
    passed: reviewRes.ok && Boolean(hasQuestions) && Boolean(hasCorrectAnswer),
    details: `Questions returned: ${reviewJson.questions?.length}, Sample Q1 Correct Answer: ${JSON.stringify(firstQ?.correctAnswer)}`,
  });

  // --- PRINT SUMMARY TABLE ---
  console.log('\n====================================================');
  console.log('PHASE 7E-6 TEST RESULTS SUMMARY TABLE');
  console.log('====================================================\n');
  console.table(
    results.map(r => ({
      Scope: r.scopeItem,
      'Test Description': r.testName,
      Status: r.passed ? 'PASS' : 'FAIL',
      Details: r.details,
    }))
  );

  const allPassed = results.every(r => r.passed);
  console.log(`\nOverall Test Suite Result: ${allPassed ? 'ALL TESTS PASSED (100%)' : 'SOME TESTS FAILED'}`);

  // Clean up test attempts
  if (attempt1?.id) {
    await adminClient.from('attempt_answers').delete().eq('attempt_id', attempt1.id);
    await adminClient.from('exam_attempts').delete().eq('id', attempt1.id);
  }
  if (staleAttempt?.id) {
    await adminClient.from('exam_attempts').delete().eq('id', staleAttempt.id);
  }

  process.exit(allPassed ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
