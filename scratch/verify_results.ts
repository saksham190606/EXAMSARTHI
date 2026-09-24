import fs from 'fs';
import path from 'path';
import { calculateResults } from '../src/lib/resultsUtils';
import { analyzePerformance, generateRecommendations } from '../src/lib/personalization/engine';
import { MockExamQuestions } from '../src/lib/examData';
import { ExamState } from '../src/lib/useExamEngine';

console.log('='.repeat(64));
console.log('    EXAMSARTHI — RESULTS EXPERIENCE PHASE 5 VERIFICATION SUITE    ');
console.log('='.repeat(64));

let failures = 0;
function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`[PASS] ${msg}`);
  } else {
    console.error(`[FAIL] ${msg}`);
    failures++;
  }
}

// 1. File existence
const resultsPagePath = path.resolve('src/app/results/page.tsx');
const subjectPerfPath = path.resolve('src/components/results/SubjectPerformance.tsx');
assert(fs.existsSync(resultsPagePath), 'results/page.tsx exists');
assert(fs.existsSync(subjectPerfPath), 'SubjectPerformance.tsx exists');

const resultsCode = fs.readFileSync(resultsPagePath, 'utf8');
const subjectPerfCode = fs.readFileSync(subjectPerfPath, 'utf8');

// 2. Engine and data logic preservation
console.log('\n--- 1. DATA INTEGRITY & LOGIC PRESERVATION ---');
assert(resultsCode.includes('calculateResults'), 'Preserves calculateResults invocation');
assert(resultsCode.includes('analyzePerformance'), 'Preserves analyzePerformance invocation');
assert(resultsCode.includes('generateRecommendations'), 'Preserves generateRecommendations invocation');
assert(resultsCode.includes('getPerformanceHistory'), 'Preserves getPerformanceHistory invocation');
assert(resultsCode.includes('savePerformanceProfile'), 'Preserves savePerformanceProfile invocation');
assert(resultsCode.includes("sessionStorage.getItem('examResultState')"), 'Preserves sessionStorage result retrieval');

// Test actual calculation and recommendation logic
const testAnswers: Record<string, string> = {};
for (let i = 0; i < 5; i++) {
  testAnswers[MockExamQuestions[i].id] = MockExamQuestions[i].correctAnswerId;
}
for (let i = 5; i < 10; i++) {
  // Deliberately pick an incorrect option
  const incorrectOpt = MockExamQuestions[i].options.find(
    (o) => o.id !== MockExamQuestions[i].correctAnswerId
  )!.id;
  testAnswers[MockExamQuestions[i].id] = incorrectOpt;
}

const testState: ExamState = {
  currentQuestionIndex: 14,
  answers: testAnswers,
  flagged: new Set(),
  timeRemaining: 900,
  isSubmitted: true,
};

const calc = calculateResults(MockExamQuestions, testState, 1200);
assert(calc.totalQuestions === 15, `Evaluates total 15 questions (got ${calc.totalQuestions})`);
assert(calc.attempted === 10, `Evaluates 10 attempted questions (got ${calc.attempted})`);
assert(calc.correct === 5, `Evaluates 5 correct questions (got ${calc.correct})`);
assert(calc.incorrect === 5, `Evaluates 5 incorrect questions (got ${calc.incorrect})`);
assert(calc.unanswered === 5, `Evaluates 5 unanswered questions (got ${calc.unanswered})`);
assert(calc.accuracy === 50, `Evaluates 50% accuracy on attempted (got ${calc.accuracy}%)`);

const prof = analyzePerformance(calc, MockExamQuestions, testState.answers);
assert(prof.accuracy === 50, `Profile accuracy matches result accuracy (got ${prof.accuracy}%)`);
assert(prof.subjects.length > 0, `Profile contains subject breakdowns (count: ${prof.subjects.length})`);

const recs = generateRecommendations(prof, []);
assert(recs.length > 0, `Generates personalized recommendations based on actual performance (count: ${recs.length})`);
assert(recs[0].actionUrl.startsWith('/practice'), `Recommendation routes through practice URL: ${recs[0].actionUrl}`);

// 3. Section structure and accessible presentation
console.log('\n--- 2. INFORMATION ARCHITECTURE & SECTIONS ---');
assert(resultsCode.includes('<main'), 'Uses semantic <main> landmark');
assert(resultsCode.includes('Examination Results'), 'Contains Examination Results heading');
assert(resultsCode.includes('SSC CGL Tier 1 Mock Examination'), 'Contains exact mock exam title');
assert(resultsCode.includes('Subject Performance Analysis'), 'Contains Section C: Subject Performance Analysis');
assert(resultsCode.includes('Areas to Improve'), 'Contains Section D: Areas to Improve');
assert(resultsCode.includes('What Should You Practice Next?'), 'Contains Section E: What Should You Practice Next?');
assert(resultsCode.includes('Performance Context'), 'Contains Section F: Performance Context');
assert(resultsCode.includes('Practice Recommended Topics'), 'Contains primary action CTA: Practice Recommended Topics');
assert(resultsCode.includes('Back to Dashboard'), 'Contains secondary action CTA: Back to Dashboard');
assert(resultsCode.includes('Take Another Mock Exam'), 'Contains tertiary action CTA: Take Another Mock Exam');

// 4. Accessibility and non-judgmental language
console.log('\n--- 3. ACCESSIBILITY & NON-JUDGMENTAL TERMINOLOGY ---');
assert(!resultsCode.toLowerCase().includes('failure'), 'Does not use judgmental term "failure"');
assert(!resultsCode.toLowerCase().includes('bad score'), 'Does not use judgmental term "bad score"');
assert(!resultsCode.toLowerCase().includes('poor'), 'Does not use judgmental term "poor"');
assert(resultsCode.includes('Needs More Practice'), 'Uses encouraging status: "Needs More Practice"');
assert(resultsCode.includes('Focus Area'), 'Uses encouraging status: "Focus Area"');
assert(resultsCode.includes('Strong Performance'), 'Uses encouraging status: "Strong Performance"');
assert(resultsCode.includes('Progressing Well'), 'Uses encouraging status: "Progressing Well"');

// 5. Semantic Subject Table
console.log('\n--- 4. ACCESSIBLE SUBJECT TABLE ---');
assert(subjectPerfCode.includes('<table'), 'SubjectPerformance contains semantic <table>');
assert(subjectPerfCode.includes('scope="col"'), 'Table headers specify scope="col"');
assert(subjectPerfCode.includes('scope="row"'), 'Row headers specify scope="row"');
assert(subjectPerfCode.includes('role="progressbar"'), 'Accuracy indicator includes role="progressbar"');
assert(subjectPerfCode.includes('aria-valuenow'), 'Progress bar includes aria-valuenow');
assert(subjectPerfCode.includes('aria-label'), 'Progress bar includes descriptive aria-label');

// 6. Bento Grid Prohibition Check
console.log('\n--- 5. DESIGN SYSTEM RESTRICTIONS ---');
assert(!resultsCode.includes('BentoGrid'), 'Strict adherence: Does not use BentoGrid in Results');
assert(!resultsCode.includes('bento-grid'), 'Strict adherence: No Bento styling in Results');

// 7. Route and CTA Integrity
console.log('\n--- 6. ROUTE INTEGRITY ---');
assert(resultsCode.includes('/practice?subject='), 'Constructs topic-specific practice routes');
assert(resultsCode.includes('/dashboard'), 'Includes valid route to /dashboard');
assert(resultsCode.includes('/exam'), 'Includes valid route to /exam');

console.log('\n' + '='.repeat(64));
if (failures === 0) {
  console.log('   ALL RESULTS EXPERIENCE PHASE 5 CHECKS PASSED (100%)       ');
} else {
  console.error(`   ${failures} CHECKS FAILED IN RESULTS EXPERIENCE PHASE 5   `);
}
console.log('='.repeat(64));

process.exit(failures > 0 ? 1 : 0);
