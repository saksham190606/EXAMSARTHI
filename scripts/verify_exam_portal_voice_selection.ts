import { matchExamTokens, matchExamVoiceRoute } from '../src/lib/voice/exam-router';
import { routeVoiceCommand } from '../src/lib/voice/commandRouter';

interface ExamTestCase {
  spoken: string;
  expectedId: string;
  expectedParam: string;
}

const testCases: ExamTestCase[] = [
  // UPSC
  { spoken: 'upsc', expectedId: 'upsc-prelims', expectedParam: 'upsc-mock-1' },
  { spoken: 'upsc exam', expectedId: 'upsc-prelims', expectedParam: 'upsc-mock-1' },
  { spoken: 'upsc prelims', expectedId: 'upsc-prelims', expectedParam: 'upsc-mock-1' },
  { spoken: 'take upsc', expectedId: 'upsc-prelims', expectedParam: 'upsc-mock-1' },
  { spoken: 'choose upsc', expectedId: 'upsc-prelims', expectedParam: 'upsc-mock-1' },
  { spoken: 'open upsc', expectedId: 'upsc-prelims', expectedParam: 'upsc-mock-1' },
  { spoken: 'civil services', expectedId: 'upsc-prelims', expectedParam: 'upsc-mock-1' },
  { spoken: 'ias', expectedId: 'upsc-prelims', expectedParam: 'upsc-mock-1' },
  { spoken: 'यूपीएससी', expectedId: 'upsc-prelims', expectedParam: 'upsc-mock-1' },

  // SSC
  { spoken: 'ssc', expectedId: 'ssc-cgl', expectedParam: 'cgl-mock-1' },
  { spoken: 'ssc cgl', expectedId: 'ssc-cgl', expectedParam: 'cgl-mock-1' },
  { spoken: 'cgl', expectedId: 'ssc-cgl', expectedParam: 'cgl-mock-1' },
  { spoken: 'ssc exam', expectedId: 'ssc-cgl', expectedParam: 'cgl-mock-1' },
  { spoken: 'open ssc', expectedId: 'ssc-cgl', expectedParam: 'cgl-mock-1' },
  { spoken: 'take ssc', expectedId: 'ssc-cgl', expectedParam: 'cgl-mock-1' },
  { spoken: 'choose ssc', expectedId: 'ssc-cgl', expectedParam: 'cgl-mock-1' },
  { spoken: 'staff selection', expectedId: 'ssc-cgl', expectedParam: 'cgl-mock-1' },
  { spoken: 'एसएससी', expectedId: 'ssc-cgl', expectedParam: 'cgl-mock-1' },
  { spoken: 'सीजीएल', expectedId: 'ssc-cgl', expectedParam: 'cgl-mock-1' },

  // BANK IPO / BANK PO / IBPS
  { spoken: 'bank ipo', expectedId: 'ibps-po', expectedParam: 'ibps-mock-1' },
  { spoken: 'bank po', expectedId: 'ibps-po', expectedParam: 'ibps-mock-1' },
  { spoken: 'bank', expectedId: 'ibps-po', expectedParam: 'ibps-mock-1' },
  { spoken: 'banking', expectedId: 'ibps-po', expectedParam: 'ibps-mock-1' },
  { spoken: 'ibps', expectedId: 'ibps-po', expectedParam: 'ibps-mock-1' },
  { spoken: 'ibps po', expectedId: 'ibps-po', expectedParam: 'ibps-mock-1' },
  { spoken: 'open bank po', expectedId: 'ibps-po', expectedParam: 'ibps-mock-1' },
  { spoken: 'take bank ipo', expectedId: 'ibps-po', expectedParam: 'ibps-mock-1' },
  { spoken: 'choose bank po', expectedId: 'ibps-po', expectedParam: 'ibps-mock-1' },
  { spoken: 'bank exam', expectedId: 'ibps-po', expectedParam: 'ibps-mock-1' },
  { spoken: 'बैंक पीओ', expectedId: 'ibps-po', expectedParam: 'ibps-mock-1' },
  { spoken: 'बैंक आईपीओ', expectedId: 'ibps-po', expectedParam: 'ibps-mock-1' },
  { spoken: 'आईबीपीएस', expectedId: 'ibps-po', expectedParam: 'ibps-mock-1' },

  // RAILWAY / RRB
  { spoken: 'railway', expectedId: 'rrb-ntpc', expectedParam: 'rrb-mock-1' },
  { spoken: 'railways', expectedId: 'rrb-ntpc', expectedParam: 'rrb-mock-1' },
  { spoken: 'rrb', expectedId: 'rrb-ntpc', expectedParam: 'rrb-mock-1' },
  { spoken: 'ntpc', expectedId: 'rrb-ntpc', expectedParam: 'rrb-mock-1' },
  { spoken: 'rrb ntpc', expectedId: 'rrb-ntpc', expectedParam: 'rrb-mock-1' },
  { spoken: 'railway exam', expectedId: 'rrb-ntpc', expectedParam: 'rrb-mock-1' },
  { spoken: 'open railway', expectedId: 'rrb-ntpc', expectedParam: 'rrb-mock-1' },
  { spoken: 'रेलवे', expectedId: 'rrb-ntpc', expectedParam: 'rrb-mock-1' },
  { spoken: 'आरआरबी', expectedId: 'rrb-ntpc', expectedParam: 'rrb-mock-1' },

  // VISION AI
  { spoken: 'vision ai', expectedId: 'vision-ai-diagram', expectedParam: 'p6' },
  { spoken: 'diagram', expectedId: 'vision-ai-diagram', expectedParam: 'p6' },
  { spoken: 'visual', expectedId: 'vision-ai-diagram', expectedParam: 'p6' },
];

function runTests() {
  console.log('================================================================');
  console.log('  EXAMSARTHI EXAM PORTAL VOICE SELECTION VERIFICATION          ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    // 1. In-hub token / route matching
    const tokenMatch = matchExamTokens(tc.spoken);
    const routeMatch = tokenMatch ? tokenMatch.route : matchExamVoiceRoute(tc.spoken);

    // 2. Command router global match (if applicable)
    const routed = routeVoiceCommand(tc.spoken, 'hub');

    const matchedId = routeMatch?.id;
    const matchedParam = routeMatch?.param;
    const matchesExpectation = matchedId === tc.expectedId && matchedParam === tc.expectedParam;

    if (matchesExpectation) {
      console.log(`[PASS] "${tc.spoken}" -> ${routeMatch?.title} (id: ${matchedId}, param: ${matchedParam})`);
      passed++;
    } else {
      console.error(`[FAIL] "${tc.spoken}" -> Expected ${tc.expectedId} (${tc.expectedParam}), got ${matchedId} (${matchedParam})`);
      failed++;
    }
  }

  console.log('\n================================================================');
  console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED across ${testCases.length} tests.`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
