import { routeVoiceCommand, normalizeSpeechInput } from '../src/lib/voice/commandRouter';
import { classifyIntentLocally, parseSpokenIntent } from '../src/lib/voice/intent-parser';
import { matchNavigationIntent } from '../src/components/layout/VoiceNavigation';

async function testVoiceCommandPipeline() {
  console.log('=== TESTING VOICE COMMAND PIPELINE ===\n');

  const testCases = [
    { input: 'Open practice, GK and geography', expectedRoute: '/practice?subject=gk', expectedIntent: 'NAVIGATE_PRACTICE_GK' },
    { input: 'Open practice GK geography', expectedRoute: '/practice?subject=gk', expectedIntent: 'NAVIGATE_PRACTICE_GK' },
    { input: 'Open GK and geography', expectedRoute: '/practice?subject=gk', expectedIntent: 'NAVIGATE_PRACTICE_GK' },
    { input: 'Go to practice GK', expectedRoute: '/practice?subject=gk', expectedIntent: 'NAVIGATE_PRACTICE_GK' },
    { input: 'Open geography practice', expectedRoute: '/practice?subject=gk', expectedIntent: 'NAVIGATE_PRACTICE_GK' },
    { input: 'Open practice', expectedRoute: '/practice', expectedIntent: 'NAVIGATE_PRACTICE' },
    { input: 'Open GK geography', expectedRoute: '/practice?subject=gk', expectedIntent: 'NAVIGATE_PRACTICE_GK' },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    console.log(`\n--- Test: "${tc.input}" ---`);
    
    // 1. routeVoiceCommand (commandRouter)
    const routed = routeVoiceCommand(tc.input, 'global-nav');
    const routeMatched = routed.handled && routed.path === tc.expectedRoute;
    if (routeMatched) {
      console.log(`  [commandRouter] PASS: routed.path === "${routed.path}"`);
    } else {
      console.error(`  [commandRouter] FAIL: expected "${tc.expectedRoute}", got "${routed.path}", handled: ${routed.handled}`);
      failed++;
      continue;
    }

    // 2. classifyIntentLocally (intent-parser)
    const localIntent = classifyIntentLocally(tc.input);
    const intentMatched = localIntent.intent === tc.expectedIntent && localIntent.targetPath === tc.expectedRoute;
    if (intentMatched) {
      console.log(`  [intent-parser] PASS: intent === "${localIntent.intent}", path === "${localIntent.targetPath}"`);
    } else {
      console.error(`  [intent-parser] FAIL: expected "${tc.expectedIntent}" & "${tc.expectedRoute}", got "${localIntent.intent}" & "${localIntent.targetPath}"`);
      failed++;
      continue;
    }

    // 3. parseSpokenIntent (async hybrid intent-parser)
    const parsedIntent = await parseSpokenIntent(tc.input, 'en');
    const parsedMatched = parsedIntent.intent === tc.expectedIntent && parsedIntent.targetPath === tc.expectedRoute;
    if (parsedMatched) {
      console.log(`  [parseSpokenIntent] PASS: intent === "${parsedIntent.intent}", path === "${parsedIntent.targetPath}"`);
    } else {
      console.error(`  [parseSpokenIntent] FAIL: expected "${tc.expectedIntent}", got "${parsedIntent.intent}"`);
      failed++;
      continue;
    }

    // 4. matchNavigationIntent (VoiceNavigation)
    const navMatch = matchNavigationIntent(tc.input);
    const expectedNavTarget = tc.expectedIntent === 'NAVIGATE_PRACTICE_GK' ? 'PRACTICE_GK' : 'PRACTICE';
    const navMatched = navMatch !== null && navMatch.path === tc.expectedRoute && navMatch.target === expectedNavTarget;
    if (navMatched) {
      console.log(`  [VoiceNavigation] PASS: navMatch.target === "${navMatch?.target}", path === "${navMatch?.path}"`);
    } else {
      console.error(`  [VoiceNavigation] FAIL: expected "${expectedNavTarget}" & "${tc.expectedRoute}", got "${navMatch?.target}" & "${navMatch?.path}"`);
      failed++;
      continue;
    }

    passed++;
  }

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${passed} / ${testCases.length} test cases PASSED.`);
  if (failed > 0) {
    console.error(`FAILURE: ${failed} test cases FAILED.`);
    process.exit(1);
  } else {
    console.log(`ALL VOICE PIPELINE TESTS PASSED SUCCESSFULLY!`);
  }
}

testVoiceCommandPipeline().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
