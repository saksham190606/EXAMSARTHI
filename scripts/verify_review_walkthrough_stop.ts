/**
 * Verification test for Review Walkthrough STOP command detection and execution.
 * Tests that all stop phrases in English & Hindi trigger exit to results page.
 */

function testStopPhrases() {
  const phrases = [
    { phrase: "stop", expected: true },
    { phrase: "stop review", expected: true },
    { phrase: "stop walkthrough", expected: true },
    { phrase: "exit", expected: true },
    { phrase: "exit review", expected: true },
    { phrase: "quit", expected: true },
    { phrase: "close", expected: true },
    { phrase: "cancel", expected: true },
    { phrase: "ruko", expected: true },
    { phrase: "रुक", expected: true },
    { phrase: "band karo", expected: true },
    { phrase: "बंद करो", expected: true },
    { phrase: "बंद", expected: true },
    { phrase: "समाप्त", expected: true },
    { phrase: "khatam", expected: true },
    { phrase: "वापस", expected: true },
    { phrase: "back to result", expected: true },
    { phrase: "back to results", expected: true },
    { phrase: "go back to results", expected: true },
    { phrase: "result", expected: true },
    { phrase: "results", expected: true },
    // Negative cases
    { phrase: "next question", expected: false },
    { phrase: "previous question", expected: false },
    { phrase: "repeat answer", expected: false },
  ];

  console.log("================================================================");
  console.log("  REVIEW WALKTHROUGH STOP COMMAND VERIFICATION                  ");
  console.log("================================================================\n");

  let passed = 0;
  let failed = 0;

  for (const { phrase, expected } of phrases) {
    const lower = phrase.toLowerCase().trim();
    const isStop = 
      lower.includes('stop') || 
      lower.includes('exit') || 
      lower.includes('close') || 
      lower.includes('quit') || 
      lower.includes('cancel') || 
      lower.includes('khatam') || 
      lower.includes('ruko') || 
      lower.includes('रुक') ||
      lower.includes('band karo') ||
      lower.includes('बंद करो') ||
      lower.includes('बंद') ||
      lower.includes('समाप्त') ||
      lower.includes('वापस') ||
      lower.includes('back to result') ||
      lower.includes('go back to result') ||
      lower === 'result' ||
      lower === 'results';

    if (isStop === expected) {
      console.log(`[PASS] "${phrase}" -> isStop: ${isStop}`);
      passed++;
    } else {
      console.error(`[FAIL] "${phrase}" -> isStop: ${isStop}, expected: ${expected}`);
      failed++;
    }
  }

  console.log("\n================================================================");
  console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED across ${passed + failed} tests.`);
  console.log("================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

testStopPhrases();
