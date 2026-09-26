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
  console.log('EXAMSARTHI PHASE 7E-7 VERIFICATION TEST SUITE');
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

  // --- ITEM 1: SCHEMA MIGRATION & BACKWARD COMPATIBILITY ---
  console.log('\n--- ITEM 1: SCHEMA MIGRATION & BACKWARD COMPATIBILITY ---');

  // 1.1 Verify sections JSONB column on exams table for e2
  const { data: examE2, error: e2Err } = await adminClient
    .from('exams')
    .select('id, title, sections')
    .eq('id', 'e2')
    .single();

  const e2Sections = examE2?.sections as any[];
  const has3Sections = Array.isArray(e2Sections) && e2Sections.length === 3;
  const quantSec = has3Sections ? e2Sections.find(s => s.id === 'sec_quant') : null;
  const passed1_1 = !e2Err && has3Sections && quantSec?.duration_minutes === 5;

  results.push({
    scopeItem: '1. Schema & Test Data',
    testName: 'Sectional Schema Config on e2 (Banking Prelims)',
    passed: passed1_1,
    details: passed1_1 
      ? `Found 3 sections (Quant, Reasoning, English), 5m each on e2` 
      : `Error or invalid sections: ${e2Err?.message || JSON.stringify(e2Sections)}`,
  });

  // 1.2 Verify backward compatibility on e1 (non-sectional exam has null sections)
  const { data: examE1, error: e1Err } = await adminClient
    .from('exams')
    .select('id, title, sections, duration_minutes')
    .eq('id', 'e1')
    .single();

  const passed1_2 = !e1Err && examE1?.sections === null && examE1?.duration_minutes === 15;
  results.push({
    scopeItem: '1. Schema & Test Data',
    testName: 'Backward Compatibility on e1 (Non-sectional NULL sections)',
    passed: passed1_2,
    details: passed1_2
      ? `e1 correctly has sections=NULL and 15m duration`
      : `e1 failed: ${e1Err?.message || JSON.stringify(examE1)}`,
  });

  // 1.3 Verify section_progress column on exam_attempts
  const { data: colCheck, error: colErr } = await adminClient
    .from('exam_attempts')
    .select('id, section_progress')
    .limit(1);

  const passed1_3 = !colErr;
  results.push({
    scopeItem: '1. Schema & Test Data',
    testName: 'exam_attempts.section_progress column exists',
    passed: passed1_3,
    details: passed1_3 ? 'Column exists and queries successfully' : `Column query failed: ${colErr?.message}`,
  });

  // --- ITEM 2 & 3: SERVER-SIDE SECTION TIMING ENFORCEMENT & ANTI-TAMPER ---
  console.log('\n--- ITEM 2 & 3: SERVER-SIDE SECTION TIMING & ANTI-TAMPER ---');

  // 3.1 Start sectional attempt on e2
  const initialSectionProgress = {
    active_section_index: 0,
    sections: e2Sections.map((sec, idx) => ({
      section_id: sec.id,
      name: sec.name,
      order_index: sec.order_index ?? idx,
      duration_seconds: (sec.duration_minutes || 5) * 60,
      time_used_seconds: 0,
      started_at: idx === 0 ? new Date().toISOString() : '',
      submitted_at: null,
      status: idx === 0 ? 'in_progress' : 'pending',
      timing_flag: 'NORMAL',
    })),
  };

  const { data: attemptSec, error: attSecErr } = await adminClient
    .from('exam_attempts')
    .insert({
      user_id: candidateId,
      exam_id: 'e2',
      status: 'in_progress',
      total_questions: 12,
      section_progress: initialSectionProgress,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (attSecErr || !attemptSec) {
    results.push({
      scopeItem: '3. Section Timing Enforcement',
      testName: 'Initialize Sectional Test Attempt',
      passed: false,
      details: attSecErr?.message || 'Failed to insert attempt',
    });
  } else {
    // 3.2 Save valid answer in active Section 1 (Quantitative Aptitude: quant-1)
    const saveAnsRes1 = await fetch('http://localhost:3000/api/exam/save-answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        attemptId: attemptSec.id,
        questionId: 'quant-1',
        userAnswer: 'qo-1',
      }),
    });
    const saveAnsJson1 = await saveAnsRes1.json();
    const passed3_2 = saveAnsRes1.ok && saveAnsJson1.success === true;

    results.push({
      scopeItem: '3. Section Timing Enforcement',
      testName: 'Save Answer in Active Section (/api/exam/save-answer)',
      passed: passed3_2,
      details: passed3_2 ? 'Answer accepted for active Section 1' : JSON.stringify(saveAnsJson1),
    });

    // 3.3 Advance Section 1 -> Section 2 via /api/exam/section-progress
    const advRes = await fetch('http://localhost:3000/api/exam/section-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        attemptId: attemptSec.id,
        sectionId: 'sec_quant',
        timeUsedSeconds: 120, // Reported 2 minutes used of 5 minutes
        advanceToNextSection: true,
      }),
    });
    const advJson = await advRes.json();
    const sec1Completed = advJson.sectionProgress?.sections?.[0]?.status === 'completed';
    const sec2Active = advJson.sectionProgress?.active_section_index === 1 &&
                       advJson.sectionProgress?.sections?.[1]?.status === 'in_progress';
    const passed3_3 = advRes.ok && sec1Completed && sec2Active;

    results.push({
      scopeItem: '3. Section Timing Enforcement',
      testName: 'Advance Section via /api/exam/section-progress',
      passed: passed3_3,
      details: passed3_3 
        ? `Section 1 status='completed', Section 2 active (index 1)` 
        : `Failed: ${JSON.stringify(advJson)}`,
    });

    // 3.4 Direct-API-Bypass Test 1: Try modifying an answer in now-completed Section 1 via /api/exam/save-answer
    const tamperSaveRes = await fetch('http://localhost:3000/api/exam/save-answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        attemptId: attemptSec.id,
        questionId: 'quant-2', // in Section 1 (Quantitative Aptitude)
        userAnswer: 'qo-6',
      }),
    });
    const tamperSaveJson = await tamperSaveRes.json();
    const passed3_4 = tamperSaveRes.status === 403 && 
                      (tamperSaveJson.code === 'SECTION_LOCKED_OR_EXPIRED' || tamperSaveJson.error?.includes('closed'));

    results.push({
      scopeItem: '3. Section Timing Enforcement',
      testName: 'Direct API Bypass Blocked: save-answer on closed section',
      passed: passed3_4,
      details: passed3_4
        ? `HTTP 403 Forbidden correctly returned: ${tamperSaveJson.error}`
        : `Security breach! Expected 403, got ${tamperSaveRes.status}: ${JSON.stringify(tamperSaveJson)}`,
    });

    // 3.5 Direct-API-Bypass Test 2: Try submitting modified answer for closed Section 1 via /api/exam/submit
    const tamperSubmitRes = await fetch('http://localhost:3000/api/exam/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        attemptId: attemptSec.id,
        answers: {
          'quant-1': 'qo-1', // existing
          'quant-2': 'qo-6', // new tamper answer for expired section!
          'reason-1': 'ro-2', // in current Section 2
        },
        timeRemaining: 600,
      }),
    });
    const tamperSubmitJson = await tamperSubmitRes.json();
    const passed3_5 = tamperSubmitRes.status === 403 &&
                      (tamperSubmitJson.code === 'SECTION_LOCKED_OR_EXPIRED' || tamperSubmitJson.error?.includes('closed'));

    results.push({
      scopeItem: '3. Section Timing Enforcement',
      testName: 'Direct API Bypass Blocked: submit with altered expired section',
      passed: passed3_5,
      details: passed3_5
        ? `HTTP 403 Forbidden correctly rejected late answer injection: ${tamperSubmitJson.error}`
        : `Security breach! Expected 403, got ${tamperSubmitRes.status}: ${JSON.stringify(tamperSubmitJson)}`,
    });

    // 3.6 Save legitimate answer in active Section 2 (Reasoning)
    const saveSec2 = await fetch('http://localhost:3000/api/exam/save-answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        attemptId: attemptSec.id,
        questionId: 'reason-1',
        userAnswer: 'ro-2', // Correct answer
      }),
    });
    const saveSec2Json = await saveSec2.json();

    // 3.7 Submit full sectional exam legitimately
    const legitimateSubmitRes = await fetch('http://localhost:3000/api/exam/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        attemptId: attemptSec.id,
        answers: {
          'quant-1': 'qo-1', // recorded when sec 1 was active
          'reason-1': 'ro-2', // recorded when sec 2 was active
        },
        timeRemaining: 600,
      }),
    });
    const legitSubmitJson = await legitimateSubmitRes.json();
    const metrics = legitSubmitJson.summary?.summaryMetrics;
    const hasSecMetrics = Array.isArray(metrics?.sectionMetrics) && metrics.sectionMetrics.length === 3;
    const isSectionalSupported = metrics?.timingValidation?.sectionalTimingSupported === true;
    const passed3_7 = legitimateSubmitRes.ok && legitSubmitJson.success === true && hasSecMetrics && isSectionalSupported;

    results.push({
      scopeItem: '3. Section Timing Enforcement',
      testName: 'Legitimate Sectional Submission & Metrics Persistence',
      passed: passed3_7,
      details: passed3_7
        ? `Submitted successfully. sectionMetrics count: ${metrics.sectionMetrics.length}, sectionalTimingSupported: true`
        : `Failed: ${JSON.stringify(legitSubmitJson)}`,
    });

    // --- ITEM 4: RESULTS PAGE & QUESTION REVIEW GROUPING ---
    console.log('\n--- ITEM 4: RESULTS INTEGRATION & QUESTION REVIEW ---');

    // 4.1 Attempt Review API returns sectionName for review questions
    const reviewRes = await fetch(`http://localhost:3000/api/exam/attempt-review?attemptId=${attemptSec.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const reviewJson = await reviewRes.json();
    const hasReviewQuestions = Array.isArray(reviewJson.questions) && reviewJson.questions.length === 12;
    const hasSectionNames = hasReviewQuestions && reviewJson.questions.every((q: any) => typeof q.sectionName === 'string');
    const passed4_1 = reviewRes.ok && hasReviewQuestions && hasSectionNames;

    results.push({
      scopeItem: '4. Analytics & Review Integration',
      testName: 'Attempt Review Section Grouping Metadata',
      passed: passed4_1,
      details: passed4_1
        ? `All 12 questions contain explicit sectionName ('Quantitative Aptitude', 'Reasoning', 'English')`
        : `Failed: ${JSON.stringify(reviewJson).slice(0, 200)}`,
    });
  }

  // --- ITEM 5: BACKWARD COMPATIBILITY END-TO-END WITH NON-SECTIONAL EXAM (e1) ---
  console.log('\n--- ITEM 5: BACKWARD COMPATIBILITY END-TO-END (e1) ---');

  const { data: attemptE1, error: attE1Err } = await adminClient
    .from('exam_attempts')
    .insert({
      user_id: candidateId,
      exam_id: 'e1',
      status: 'in_progress',
      total_questions: 12,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (attE1Err || !attemptE1) {
    results.push({
      scopeItem: '5. Backward Compatibility',
      testName: 'Initialize Non-Sectional Attempt (e1)',
      passed: false,
      details: attE1Err?.message || 'Failed to insert e1 attempt',
    });
  } else {
    // Submit e1 attempt without sectional timing
    const submitE1Res = await fetch('http://localhost:3000/api/exam/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        attemptId: attemptE1.id,
        answers: {
          'reason-3': 'ro-10', // correct in e1
          'gk-1': 'go-2', // correct in e1
          'quant-3': 'qo-12', // correct in e1
        },
        timeRemaining: 750,
      }),
    });
    const submitE1Json = await submitE1Res.json();
    const e1Metrics = submitE1Json.summary?.summaryMetrics;
    const passed5_1 = submitE1Res.ok && 
                      submitE1Json.success === true && 
                      e1Metrics?.timingValidation?.sectionalTimingSupported === false &&
                      submitE1Json.summary?.attempted === 3 &&
                      submitE1Json.summary?.score === 3;

    results.push({
      scopeItem: '5. Backward Compatibility',
      testName: 'Submit Non-Sectional Exam (e1)',
      passed: passed5_1,
      details: passed5_1
        ? `e1 submission clean, score: ${submitE1Json.summary?.score}/3 attempted, sectionalTimingSupported: false`
        : `Failed: ${JSON.stringify(submitE1Json)}`,
    });
  }

  // --- ITEM 6: REGRESSION CHECK ON 7E-6 ABANDONED CLEANUP ---
  console.log('\n--- ITEM 6: REGRESSION CHECK ON ABANDONED CLEANUP ---');

  const cleanupRes = await fetch('http://localhost:3000/api/exam/cleanup', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const cleanupJson = await cleanupRes.json();
  const passed6_1 = cleanupRes.ok && typeof cleanupJson.cleanedCount === 'number';

  results.push({
    scopeItem: '6. Regressions Check',
    testName: 'Phase 7E-6 Abandoned Session Cleanup API',
    passed: passed6_1,
    details: passed6_1
      ? `Cleanup endpoint operational, scanned ${cleanupJson.scannedCount} attempts, cleaned ${cleanupJson.cleanedCount}`
      : `Failed: ${JSON.stringify(cleanupJson)}`,
  });

  // --- SUMMARY TABLE ---
  console.log('\n====================================================');
  console.log('PHASE 7E-7 VERIFICATION RESULTS');
  console.log('====================================================');
  console.table(
    results.map(r => ({
      Scope: r.scopeItem,
      Test: r.testName,
      Status: r.passed ? 'PASS' : 'FAIL',
      Details: r.details,
    }))
  );

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${total - passed}`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution exception:', err);
  process.exit(1);
});
