import fs from 'fs';
import path from 'path';
import { calculateResults } from '../src/lib/resultsUtils';
import { analyzePerformance, generateRecommendations } from '../src/lib/personalization/engine';
import { MockExamQuestions } from '../src/lib/examData';
import { ExamState } from '../src/lib/useExamEngine';
import { PerformanceProfile } from '../src/lib/personalization/types';

console.log('='.repeat(70));
console.log('  EXAMSARTHI — PHASE 6 CROSS-PRODUCT ACCESSIBILITY & REGRESSION SUITE  ');
console.log('='.repeat(70));

let failures = 0;
function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`[PASS] ${msg}`);
  } else {
    console.error(`[FAIL] ${msg}`);
    failures++;
  }
}

// 1. Core Routes Existence
console.log('\n--- 1. ROUTE INTEGRITY & FILE EXISTENCE ---');
const routes = [
  'src/app/(marketing)/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/practice/page.tsx',
  'src/app/exam/page.tsx',
  'src/app/results/page.tsx',
  'src/app/settings/page.tsx',
  'src/app/layout.tsx',
];

routes.forEach((r) => {
  const p = path.resolve(r);
  assert(fs.existsSync(p), `${r} exists`);
});

// 2. Global Layout & Landmarks
console.log('\n--- 2. GLOBAL LAYOUT & ACCESSIBILITY LANDMARKS ---');
const layoutCode = fs.readFileSync(path.resolve('src/app/layout.tsx'), 'utf8');
assert(layoutCode.includes('Skip to main content'), 'Skip-to-content link present in layout');
assert(layoutCode.includes('id="main-content"'), 'Root main landmark with id="main-content" present');
assert(layoutCode.includes('AccessibilityProvider'), 'AccessibilityProvider wraps application');
assert(layoutCode.includes('ThemeProvider'), 'ThemeProvider wraps application');
assert(layoutCode.includes('EXAMSARTHI'), 'Platform identity defined in title metadata');

// 3. Single Main Landmark Verification (No nested <main>)
console.log('\n--- 3. SINGLE MAIN LANDMARK AUDIT ---');
['exam/page.tsx', 'results/page.tsx', 'settings/page.tsx'].forEach((sub) => {
  const code = fs.readFileSync(path.resolve(`src/app/${sub}`), 'utf8');
  assert(!code.includes('<main'), `src/app/${sub} does not define nested <main> landmark`);
});

// 4. Header & Navigation Consistency
console.log('\n--- 4. NAVIGATION & HEADER AUDIT ---');
const headerCode = fs.readFileSync(path.resolve('src/components/layout/Header.tsx'), 'utf8');
const mobileNavCode = fs.readFileSync(path.resolve('src/components/layout/MobileNav.tsx'), 'utf8');
assert(headerCode.includes('/dashboard'), 'Header links to /dashboard');
assert(headerCode.includes('/practice'), 'Header links to /practice');
assert(headerCode.includes('/exam'), 'Header links to /exam');
assert(headerCode.includes('/results'), 'Header links to /results');
assert(headerCode.includes('/settings'), 'Header links to /settings');
assert(mobileNavCode.includes('/settings'), 'MobileNav links to /settings');
assert(headerCode.includes('AccessibilityPanel'), 'Header embeds AccessibilityPanel trigger');

// 5. Public Claims Compliance Audit
console.log('\n--- 5. PUBLIC CLAIMS & ACCESSIBILITY STATEMENTS AUDIT ---');
const bentoCode = fs.readFileSync(path.resolve('src/components/marketing/BentoFeatureSection.tsx'), 'utf8');
assert(!bentoCode.includes('WCAG 2.1 AAA Compliant'), 'Removed overreaching "WCAG 2.1 AAA Compliant" claim');
assert(bentoCode.includes('Aligned with WCAG 2.1 AA Principles'), 'Uses appropriate "Aligned with WCAG 2.1 AA Principles" wording');

// 6. Settings Page Audit
console.log('\n--- 6. ACCESSIBILITY SETTINGS PAGE AUDIT ---');
const settingsCode = fs.readFileSync(path.resolve('src/app/settings/page.tsx'), 'utf8');
assert(settingsCode.includes('useAccessibilityStore'), 'Settings page connects to useAccessibilityStore');
assert(settingsCode.includes('useTheme'), 'Settings page connects to useTheme');
assert(settingsCode.includes('Text Size & Scaling'), 'Controls Text Size & Scaling');
assert(settingsCode.includes('Theme & Contrast'), 'Controls Theme & Contrast');
assert(settingsCode.includes('Reduced Motion'), 'Controls Reduced Motion');
assert(settingsCode.includes('Audio Assistance'), 'Controls Audio Assistance');
assert(settingsCode.includes('Voice Speed'), 'Controls Voice Speed');
assert(settingsCode.includes('Language Preferences'), 'Controls Language Preferences');

// 7. Exam Engine & Voice Mode Audit
console.log('\n--- 7. EXAM ENGINE & VOICE MODE AUDIT ---');
const examCode = fs.readFileSync(path.resolve('src/app/exam/page.tsx'), 'utf8');
assert(examCode.includes('useExamEngine'), 'Preserves useExamEngine');
assert(examCode.includes('useVoiceMode'), 'Preserves useVoiceMode');
assert(examCode.includes('QuestionDisplay'), 'Preserves QuestionDisplay');
assert(examCode.includes('QuestionPalette'), 'Preserves QuestionPalette');
assert(examCode.includes('ExamTimer'), 'Preserves ExamTimer');
assert(examCode.includes('SubmitDialog'), 'Preserves SubmitDialog');

// 8. End-to-End Simulation: Exam Submission → Personalization → History Comparison
console.log('\n--- 8. END-TO-END DATA FLOW SIMULATION ---');

// Attempt 1: 10 answered (8 correct, 2 incorrect), 5 unanswered
const answersAttempt1: Record<string, string> = {};
for (let i = 0; i < 8; i++) {
  answersAttempt1[MockExamQuestions[i].id] = MockExamQuestions[i].correctAnswerId;
}
for (let i = 8; i < 10; i++) {
  const incorrect = MockExamQuestions[i].options.find(
    (o) => o.id !== MockExamQuestions[i].correctAnswerId
  )!.id;
  answersAttempt1[MockExamQuestions[i].id] = incorrect;
}

const state1: ExamState = {
  currentQuestionIndex: 14,
  answers: answersAttempt1,
  flagged: new Set(['q1', 'q5']),
  timeRemaining: 950,
  isSubmitted: true,
};

const results1 = calculateResults(MockExamQuestions, state1, 1200);
assert(results1.correct === 8, 'Attempt 1: 8 correct answers');
assert(results1.incorrect === 2, 'Attempt 1: 2 incorrect answers');
assert(results1.unanswered === 5, 'Attempt 1: 5 unanswered questions');
assert(results1.accuracy === 80, 'Attempt 1: 80% accuracy on attempted questions');

const profile1 = analyzePerformance(results1, MockExamQuestions, state1.answers);
assert(profile1.accuracy === 80, 'Profile 1 captures 80% accuracy');
const recs1 = generateRecommendations(profile1, []);
assert(recs1.length > 0, `Profile 1 produces ${recs1.length} recommendations`);

// Attempt 2: 12 answered (11 correct, 1 incorrect), 3 unanswered
const answersAttempt2: Record<string, string> = {};
for (let i = 0; i < 11; i++) {
  answersAttempt2[MockExamQuestions[i].id] = MockExamQuestions[i].correctAnswerId;
}
const incorrectOpt = MockExamQuestions[11].options.find(
  (o) => o.id !== MockExamQuestions[11].correctAnswerId
)!.id;
answersAttempt2[MockExamQuestions[11].id] = incorrectOpt;

const state2: ExamState = {
  currentQuestionIndex: 14,
  answers: answersAttempt2,
  flagged: new Set(),
  timeRemaining: 800,
  isSubmitted: true,
};

const results2 = calculateResults(MockExamQuestions, state2, 1200);
assert(results2.correct === 11, 'Attempt 2: 11 correct answers');
assert(results2.accuracy === 92, 'Attempt 2: 92% accuracy on attempted questions');

const profile2 = analyzePerformance(results2, MockExamQuestions, state2.answers);
const history = [profile1]; // previous attempt
const recs2 = generateRecommendations(profile2, history);
assert(recs2.length > 0, 'Generates valid recommendations with historical context');

// Verify historical trend calculation
const accuracyDiff = profile2.accuracy - profile1.accuracy;
assert(accuracyDiff === 12, `Accuracy improved by ${accuracyDiff} percentage points (80% -> 92%)`);

// 9. Practice Route Query String Matching
console.log('\n--- 9. PRACTICE URL FILTER ROUTING AUDIT ---');
const practiceCode = fs.readFileSync(path.resolve('src/app/practice/page.tsx'), 'utf8');
assert(practiceCode.includes('searchParams?.get("subject")'), 'Reads subject filter from query parameter');
assert(practiceCode.includes('searchParams?.get("topic")'), 'Reads topic filter from query parameter');
assert(practiceCode.includes('searchParams?.get("difficulty")'), 'Reads difficulty filter from query parameter');

console.log('\n' + '='.repeat(70));
if (failures === 0) {
  console.log('   ALL PHASE 6 CROSS-PRODUCT AUDIT CHECKS PASSED (100%)    ');
} else {
  console.error(`   ${failures} CHECKS FAILED IN PHASE 6 AUDIT   `);
}
console.log('='.repeat(70));

process.exit(failures > 0 ? 1 : 0);
