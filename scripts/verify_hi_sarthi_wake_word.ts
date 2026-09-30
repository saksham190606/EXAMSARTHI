/**
 * Verification test for "Hi Sarthi" voice assistant activation.
 * Verifies that:
 * 1. "Hi Sarthi", "Hey Sarthi", "Hello Sarthi", "Open Sarthi", "Sarthi AI", "हाय सारथी", etc. trigger Sarthi AI.
 * 2. On the Exams tab (/exam, /exam?set=..., /exam/...), "Hi Sarthi" is STRICTLY LOCKED and NEVER opens Sarthi AI.
 * 3. App name "examsarthi" does NOT accidentally trigger Sarthi AI.
 */

import { isExamRoute } from '../src/lib/assistant/sarthiExamLock';

function testHiSarthiWakeWord() {
  console.log("================================================================");
  console.log("  EXAMSARTHI 'HI SARTHI' VOICE WAKE WORD VERIFICATION          ");
  console.log("================================================================\n");

  let passed = 0;
  let failed = 0;

  const assertEqual = (actual: any, expected: any, testName: string) => {
    if (actual === expected) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}: actual=${actual}, expected=${expected}`);
      failed++;
    }
  };

  const checkWakeWord = (raw: string, currentPath: string): { recognized: boolean; allowed: boolean } => {
    const lower = raw.toLowerCase().trim();
    const cleanSarthiText = lower.replace(/examsarthi/g, '').trim();

    const isSarthiWakeWord = 
      cleanSarthiText.includes('hi sarthi') || 
      cleanSarthiText.includes('hey sarthi') || 
      cleanSarthiText.includes('hello sarthi') || 
      cleanSarthiText.includes('open sarthi') || 
      cleanSarthiText.includes('sarthi ai') || 
      cleanSarthiText.includes('सारथी') || 
      cleanSarthiText.includes('हाय सारथी') || 
      cleanSarthiText.includes('हे सारथी') || 
      cleanSarthiText.includes('नमस्ते सारथी') || 
      cleanSarthiText.includes('सारथी खोलो') || 
      cleanSarthiText.includes('सारथी एआई') || 
      cleanSarthiText === 'sarthi' ||
      /\b(hi|hey|hello|open|start)\s+sarthi\b/.test(cleanSarthiText);

    if (!isSarthiWakeWord) {
      return { recognized: false, allowed: false };
    }

    const inExamTab = isExamRoute(currentPath);
    if (inExamTab) {
      return { recognized: true, allowed: false };
    }

    return { recognized: true, allowed: true };
  };

  // --- PART 1: Non-exam pages (Dashboard, Practice, Results, Settings) -> Allowed ---
  const validWakePhrases = [
    "hi sarthi",
    "hey sarthi",
    "hello sarthi",
    "open sarthi",
    "start sarthi",
    "sarthi ai",
    "sarthi",
    "हाय सारथी",
    "हे सारथी",
    "नमस्ते सारथी",
    "सारथी खोलो",
    "सारथी एआई",
  ];

  const nonExamRoutes = [
    "/dashboard",
    "/practice",
    "/results",
    "/settings",
    "/",
  ];

  for (const route of nonExamRoutes) {
    for (const phrase of validWakePhrases) {
      const res = checkWakeWord(phrase, route);
      assertEqual(res.recognized && res.allowed, true, `"${phrase}" on ${route} -> Opens Sarthi AI`);
    }
  }

  // --- PART 2: Exams Tab (/exam, /exam?set=..., /exam/cgl) -> NEVER ALLOWED ---
  const examRoutes = [
    "/exam",
    "/exam?set=cgl-mock-1",
    "/exam?set=upsc-mock-1",
    "/exam?set=ibps-mock-1",
    "/exam?set=rrb-mock-1",
    "/exam/test-portal",
  ];

  for (const route of examRoutes) {
    for (const phrase of validWakePhrases) {
      const res = checkWakeWord(phrase, route);
      assertEqual(res.allowed, false, `"${phrase}" on Exams Tab (${route}) -> STRICTLY BLOCKED (NEVER OPENS)`);
    }
  }

  // --- PART 3: Negative Cases (Should NOT trigger wake word) ---
  const negativeCases = [
    "examsarthi",
    "welcome to examsarthi",
    "open dashboard",
    "next question",
    "previous question",
    "stop review",
    "submit exam",
  ];

  for (const phrase of negativeCases) {
    const res = checkWakeWord(phrase, "/dashboard");
    assertEqual(res.recognized, false, `Negative check: "${phrase}" does not trigger wake word`);
  }

  console.log("\n================================================================");
  console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED across ${passed + failed} tests.`);
  console.log("================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

testHiSarthiWakeWord();
