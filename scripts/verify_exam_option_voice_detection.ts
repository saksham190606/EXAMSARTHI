import { routeVoiceCommand } from '../src/lib/voice/commandRouter';
import { classifyIntentLocally } from '../src/lib/voice/intent-parser';
import { matchExamIntent } from '../src/lib/voice/exam-intents';
import { matchTokenToCommand } from '../src/lib/voice/speech-recognition';
import { resolveLocally } from '../src/app/api/intent/route';

interface TestCase {
  phrase: string;
  expectedOptionIndex: number; // 0 for A, 1 for B, 2 for C, 3 for D
  expectedLetter: string;      // 'A', 'B', 'C', 'D'
}

const testCases: TestCase[] = [
  // 1. Single letter tokens
  { phrase: 'a', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'b', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'c', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'd', expectedOptionIndex: 3, expectedLetter: 'D' },

  // 2. Single digit tokens
  { phrase: '1', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: '2', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: '3', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: '4', expectedOptionIndex: 3, expectedLetter: 'D' },

  // 3. Spoken numbers & ordinals
  { phrase: 'one', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'two', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'three', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'four', expectedOptionIndex: 3, expectedLetter: 'D' },
  { phrase: 'first', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'second', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'third', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'fourth', expectedOptionIndex: 3, expectedLetter: 'D' },
  { phrase: 'first option', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'second option', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'third option', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'fourth option', expectedOptionIndex: 3, expectedLetter: 'D' },

  // 4. "Option + letter"
  { phrase: 'option a', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'option b', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'option c', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'option d', expectedOptionIndex: 3, expectedLetter: 'D' },

  // 5. "Option + number"
  { phrase: 'option 1', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'option 2', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'option 3', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'option 4', expectedOptionIndex: 3, expectedLetter: 'D' },

  // 6. Opt / Choice shortcuts
  { phrase: 'opt a', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'opt b', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'opt 1', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'choice c', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'choice 4', expectedOptionIndex: 3, expectedLetter: 'D' },

  // 7. Spoken verbs: select / choose / mark / answer
  { phrase: 'select a', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'select option b', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'select 1', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'select option 2', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'choose c', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'choose option d', expectedOptionIndex: 3, expectedLetter: 'D' },
  { phrase: 'choose 3', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'choose option 4', expectedOptionIndex: 3, expectedLetter: 'D' },
  { phrase: 'mark a', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'mark option a', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'mark b', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'mark option 2', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'mark 3', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'mark option d', expectedOptionIndex: 3, expectedLetter: 'D' },
  { phrase: 'answer a', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'answer is b', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'ans c', expectedOptionIndex: 2, expectedLetter: 'C' },

  // 8. Hindi & Hinglish variants
  { phrase: 'vikalp a', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'vikalp 1', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'vikalp b', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'vikalp 2', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'vikalp c', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'vikalp 3', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'vikalp d', expectedOptionIndex: 3, expectedLetter: 'D' },
  { phrase: 'vikalp 4', expectedOptionIndex: 3, expectedLetter: 'D' },
  { phrase: 'विकल्प ए', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'विकल्प बी', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'विकल्प सी', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'विकल्प डी', expectedOptionIndex: 3, expectedLetter: 'D' },
  { phrase: 'विकल्प 1', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'विकल्प 2', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'ए', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'बी', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'सी', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'डी', expectedOptionIndex: 3, expectedLetter: 'D' },
  { phrase: 'पहला', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'दूसरा', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'तीसरा', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'चौथा', expectedOptionIndex: 3, expectedLetter: 'D' },
  { phrase: 'एक', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'दो', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'तीन', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'चार', expectedOptionIndex: 3, expectedLetter: 'D' },
  { phrase: 'पहला विकल्प', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'दूसरा विकल्प', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'तीसरा विकल्प', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'चौथा विकल्प', expectedOptionIndex: 3, expectedLetter: 'D' },
  { phrase: 'pehla option', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'doosra option', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'teesra option', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'chautha option', expectedOptionIndex: 3, expectedLetter: 'D' },
  { phrase: 'ऑप्शन ए', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'ऑप्शन 1', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'ऑप्शन बी', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'ऑप्शन 2', expectedOptionIndex: 1, expectedLetter: 'B' },

  // 9. Phonetic homophones
  { phrase: 'ay', expectedOptionIndex: 0, expectedLetter: 'A' },
  { phrase: 'bee', expectedOptionIndex: 1, expectedLetter: 'B' },
  { phrase: 'see', expectedOptionIndex: 2, expectedLetter: 'C' },
  { phrase: 'dee', expectedOptionIndex: 3, expectedLetter: 'D' },
];

function runTests() {
  console.log('================================================================');
  console.log('  EXAMSARTHI EXAM OPTION DETECTION VERIFICATION SUITE           ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    // 1. commandRouter test
    const routed = routeVoiceCommand(tc.phrase, 'exam');
    const routerOk = routed.handled && routed.type === 'select-option' && routed.optionIndex === tc.expectedOptionIndex;

    // 2. exam-intents test
    const examMatch = matchExamIntent(tc.phrase, false);
    const expectedIntentName = `SELECT_OPTION_${tc.expectedLetter}`;
    const intentOk = examMatch.type === expectedIntentName && examMatch.optionIndex === tc.expectedOptionIndex;

    // 3. local resolve test (api/intent/route.ts)
    const localRes = resolveLocally(tc.phrase);
    const localOk = localRes?.intent === 'ANSWER' && localRes?.target === tc.expectedLetter;

    if (routerOk && intentOk && localOk) {
      console.log(`[PASS] "${tc.phrase}" -> Option ${tc.expectedLetter} (Index: ${tc.expectedOptionIndex})`);
      passed++;
    } else {
      console.error(`[FAIL] "${tc.phrase}":`);
      if (!routerOk) console.error(`  - commandRouter: handled=${routed.handled}, type=${routed.type}, index=${routed.optionIndex} (expected index ${tc.expectedOptionIndex})`);
      if (!intentOk) console.error(`  - exam-intents: type=${examMatch.type}, index=${examMatch.optionIndex} (expected ${expectedIntentName})`);
      if (!localOk) console.error(`  - resolveLocally: intent=${localRes?.intent}, target=${localRes?.target} (expected ANSWER, ${tc.expectedLetter})`);
      failed++;
    }
  }

  // 4. Critical Flag Collision Tests:
  console.log('\n--- VERIFYING NO FLAG / REVIEW COLLISION ---');
  const flagTests = [
    { phrase: 'mark for review', expectedType: 'flag-unflag' },
    { phrase: 'flag for review', expectedType: 'flag-unflag' },
    { phrase: 'flag this', expectedType: 'flag-unflag' },
    { phrase: 'mark option a', expectedType: 'select-option' },
    { phrase: 'mark b', expectedType: 'select-option' },
    { phrase: 'mark 1', expectedType: 'select-option' },
  ];

  for (const ft of flagTests) {
    const routed = routeVoiceCommand(ft.phrase, 'exam');
    if (routed.type === ft.expectedType) {
      console.log(`[PASS] Flag check: "${ft.phrase}" -> ${routed.type}`);
      passed++;
    } else {
      console.error(`[FAIL] Flag check: "${ft.phrase}" expected ${ft.expectedType}, got ${routed.type}`);
      failed++;
    }
  }

  console.log(`\n================================================================`);
  console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED across ${testCases.length + flagTests.length} tests.`);
  console.log(`================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
