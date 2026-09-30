import { routeVoiceCommand } from '../src/lib/voice/commandRouter';
import { parseSpokenIntent } from '../src/lib/voice/intent-parser';

interface TestCase {
  phrase: string;
  expectedPath: string;
  lang?: 'en' | 'hi';
}

const testCases: TestCase[] = [
  // SECTION 1: DASHBOARD
  { phrase: 'dashboard', expectedPath: '/dashboard' },
  { phrase: 'go to dashboard', expectedPath: '/dashboard' },
  { phrase: 'open dashboard', expectedPath: '/dashboard' },
  { phrase: 'show dashboard', expectedPath: '/dashboard' },
  { phrase: 'dashboard section', expectedPath: '/dashboard' },
  { phrase: 'dashboard page', expectedPath: '/dashboard' },
  { phrase: 'home', expectedPath: '/dashboard' },
  { phrase: 'go home', expectedPath: '/dashboard' },
  { phrase: 'main menu', expectedPath: '/dashboard' },
  { phrase: 'डैशबोर्ड', expectedPath: '/dashboard', lang: 'hi' },
  { phrase: 'डैशबोर्ड खोलो', expectedPath: '/dashboard', lang: 'hi' },
  { phrase: 'डैशबोर्ड पर जाओ', expectedPath: '/dashboard', lang: 'hi' },
  { phrase: 'होम', expectedPath: '/dashboard', lang: 'hi' },
  { phrase: 'मुख्य पृष्ठ', expectedPath: '/dashboard', lang: 'hi' },

  // SECTION 2: PRACTICE
  { phrase: 'practice', expectedPath: '/practice' },
  { phrase: 'go to practice', expectedPath: '/practice' },
  { phrase: 'open practice', expectedPath: '/practice' },
  { phrase: 'show practice', expectedPath: '/practice' },
  { phrase: 'practice section', expectedPath: '/practice' },
  { phrase: 'practice page', expectedPath: '/practice' },
  { phrase: 'practice questions', expectedPath: '/practice' },
  { phrase: 'start practice', expectedPath: '/practice' },
  { phrase: 'अभ्यास', expectedPath: '/practice', lang: 'hi' },
  { phrase: 'प्रैक्टिस', expectedPath: '/practice', lang: 'hi' },
  { phrase: 'पढ़ाई', expectedPath: '/practice', lang: 'hi' },
  { phrase: 'प्रैक्टिस खोलो', expectedPath: '/practice', lang: 'hi' },
  { phrase: 'अभ्यास खोलो', expectedPath: '/practice', lang: 'hi' },

  // PRACTICE GK & GEOGRAPHY
  { phrase: 'open practice gk and geography', expectedPath: '/practice?subject=gk' },
  { phrase: 'practice gk and geography', expectedPath: '/practice?subject=gk' },
  { phrase: 'gk and geography', expectedPath: '/practice?subject=gk' },
  { phrase: 'geography practice', expectedPath: '/practice?subject=gk' },
  { phrase: 'सामान्य ज्ञान और भूगोल', expectedPath: '/practice?subject=gk', lang: 'hi' },
  { phrase: 'भूगोल प्रैक्टिस', expectedPath: '/practice?subject=gk', lang: 'hi' },

  // SECTION 3: EXAMS
  { phrase: 'exam', expectedPath: '/exam' },
  { phrase: 'exams', expectedPath: '/exam' },
  { phrase: 'go to exam', expectedPath: '/exam' },
  { phrase: 'go to exams', expectedPath: '/exam' },
  { phrase: 'open exam', expectedPath: '/exam' },
  { phrase: 'open exams', expectedPath: '/exam' },
  { phrase: 'show exams', expectedPath: '/exam' },
  { phrase: 'exam hub', expectedPath: '/exam' },
  { phrase: 'exams hub', expectedPath: '/exam' },
  { phrase: 'open exam hub', expectedPath: '/exam' },
  { phrase: 'exams section', expectedPath: '/exam' },
  { phrase: 'exam section', expectedPath: '/exam' },
  { phrase: 'take exam', expectedPath: '/exam' },
  { phrase: 'start exam', expectedPath: '/exam' },
  { phrase: 'mock exam', expectedPath: '/exam' },
  { phrase: 'mock test', expectedPath: '/exam' },
  { phrase: 'परीक्षा', expectedPath: '/exam', lang: 'hi' },
  { phrase: 'एग्जाम', expectedPath: '/exam', lang: 'hi' },
  { phrase: 'मॉक टेस्ट', expectedPath: '/exam', lang: 'hi' },
  { phrase: 'टेस्ट', expectedPath: '/exam', lang: 'hi' },
  { phrase: 'परीक्षा खोलो', expectedPath: '/exam', lang: 'hi' },
  { phrase: 'एग्जाम खोलो', expectedPath: '/exam', lang: 'hi' },

  // SECTION 4: RESULTS
  { phrase: 'results', expectedPath: '/results' },
  { phrase: 'result', expectedPath: '/results' },
  { phrase: 'go to results', expectedPath: '/results' },
  { phrase: 'go to result', expectedPath: '/results' },
  { phrase: 'open results', expectedPath: '/results' },
  { phrase: 'open result', expectedPath: '/results' },
  { phrase: 'show results', expectedPath: '/results' },
  { phrase: 'results section', expectedPath: '/results' },
  { phrase: 'result section', expectedPath: '/results' },
  { phrase: 'my results', expectedPath: '/results' },
  { phrase: 'score', expectedPath: '/results' },
  { phrase: 'scores', expectedPath: '/results' },
  { phrase: 'scorecard', expectedPath: '/results' },
  { phrase: 'रिजल्ट', expectedPath: '/results', lang: 'hi' },
  { phrase: 'स्कोर', expectedPath: '/results', lang: 'hi' },
  { phrase: 'परिणाम', expectedPath: '/results', lang: 'hi' },
  { phrase: 'नतीजे', expectedPath: '/results', lang: 'hi' },
  { phrase: 'रिजल्ट खोलो', expectedPath: '/results', lang: 'hi' },
  { phrase: 'रिजल्ट दिखाओ', expectedPath: '/results', lang: 'hi' },
  { phrase: 'परिणाम खोलो', expectedPath: '/results', lang: 'hi' },

  // SECTION 5: SETTINGS
  { phrase: 'settings', expectedPath: '/settings' },
  { phrase: 'setting', expectedPath: '/settings' },
  { phrase: 'go to settings', expectedPath: '/settings' },
  { phrase: 'go to setting', expectedPath: '/settings' },
  { phrase: 'open settings', expectedPath: '/settings' },
  { phrase: 'open setting', expectedPath: '/settings' },
  { phrase: 'show settings', expectedPath: '/settings' },
  { phrase: 'settings section', expectedPath: '/settings' },
  { phrase: 'setting section', expectedPath: '/settings' },
  { phrase: 'preferences', expectedPath: '/settings' },
  { phrase: 'accessibility settings', expectedPath: '/settings' },
  { phrase: 'सेटिंग', expectedPath: '/settings', lang: 'hi' },
  { phrase: 'सेटिंग्स', expectedPath: '/settings', lang: 'hi' },
  { phrase: 'सेटिंग खोलो', expectedPath: '/settings', lang: 'hi' },
  { phrase: 'सेटिंग्स खोलो', expectedPath: '/settings', lang: 'hi' },
  { phrase: 'सेटिंग्स दिखाओ', expectedPath: '/settings', lang: 'hi' },
];

async function runTests() {
  console.log('================================================================');
  console.log('  EXAMSARTHI 5-SECTION VOICE SWITCHING VERIFICATION SUITE       ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    // 1. Test via Command Router
    const routed = routeVoiceCommand(tc.phrase, 'global-nav');
    const routerMatch = routed.handled && routed.type === 'route' && routed.path === tc.expectedPath;

    // 2. Test via Intent Parser
    const parsed = await parseSpokenIntent(tc.phrase, tc.lang || 'en');
    const parserMatch = parsed.targetPath === tc.expectedPath;

    if (routerMatch || parserMatch) {
      const matchPath = routerMatch ? routed.path : parsed.targetPath;
      console.log(`[PASS] "${tc.phrase}" -> ${matchPath} (router: ${routerMatch}, parser: ${parserMatch})`);
      passed++;
    } else {
      console.error(`[FAIL] "${tc.phrase}" -> Expected ${tc.expectedPath}, Got router=${routed.path} parser=${parsed.targetPath}`);
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
