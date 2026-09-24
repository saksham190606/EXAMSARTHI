import * as fs from 'fs';

console.log('================================================================');
console.log('    EXAMSARTHI — EXAM EXPERIENCE PHASE 4 VERIFICATION SUITE     ');
console.log('================================================================\n');

let allPassed = true;
function assert(desc: string, condition: boolean, details?: string) {
  if (condition) {
    console.log(`[PASS] ${desc}`);
  } else {
    console.error(`[FAIL] ${desc}`);
    if (details) console.error(`       Detail: ${details}`);
    allPassed = false;
  }
}

const examPageFile = 'c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/app/exam/page.tsx';
const questionDisplayFile = 'c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/components/exam/QuestionDisplay.tsx';
const questionPaletteFile = 'c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/components/exam/QuestionPalette.tsx';
const examTimerFile = 'c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/components/exam/ExamTimer.tsx';
const submitDialogFile = 'c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/components/exam/SubmitDialog.tsx';
const voicePanelFile = 'c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/components/voice/VoiceExamPanel.tsx';

assert('exam/page.tsx exists', fs.existsSync(examPageFile));
assert('QuestionDisplay.tsx exists', fs.existsSync(questionDisplayFile));
assert('QuestionPalette.tsx exists', fs.existsSync(questionPaletteFile));
assert('ExamTimer.tsx exists', fs.existsSync(examTimerFile));
assert('SubmitDialog.tsx exists', fs.existsSync(submitDialogFile));
assert('VoiceExamPanel.tsx exists', fs.existsSync(voicePanelFile));

const examPageSrc = fs.readFileSync(examPageFile, 'utf-8');
const questionDisplaySrc = fs.readFileSync(questionDisplayFile, 'utf-8');
const questionPaletteSrc = fs.readFileSync(questionPaletteFile, 'utf-8');
const examTimerSrc = fs.readFileSync(examTimerFile, 'utf-8');
const submitDialogSrc = fs.readFileSync(submitDialogFile, 'utf-8');
const voicePanelSrc = fs.readFileSync(voicePanelFile, 'utf-8');

// 1. Engine & Logic Preservation
console.log('\n--- 1. ENGINE & LOGIC PRESERVATION ---');
assert('Preserves useExamEngine hook', examPageSrc.includes('useExamEngine('));
assert('Preserves MockExamQuestions import', examPageSrc.includes('MockExamQuestions'));
assert('Preserves sessionStorage result persistence', examPageSrc.includes("sessionStorage.setItem('examResultState'"));
assert('Preserves results routing (/results)', examPageSrc.includes("router.push('/results')"));
assert('Preserves useVoiceMode hook', examPageSrc.includes('useVoiceMode('));
assert('Preserves actions (selectAnswer, goToNext, goToPrevious, toggleFlag, submitExam)',
  examPageSrc.includes('actions.selectAnswer') &&
  examPageSrc.includes('actions.goToNext') &&
  examPageSrc.includes('actions.goToPrevious') &&
  examPageSrc.includes('actions.toggleFlag') &&
  examPageSrc.includes('actions.submitExam'));

// 2. Exam Header & Progress
console.log('\n--- 2. EXAM HEADER & PROGRESS ---');
assert('Header contains semantic h1 exam title', examPageSrc.includes('<h1') && examPageSrc.includes('Full Mock Examination'));
assert('Header communicates textual question progress (Question X of Y)', examPageSrc.includes('Question {state.currentQuestionIndex + 1} of {totalQuestions}'));
assert('Header includes Progress bar with accessible label', examPageSrc.includes('<Progress') && examPageSrc.includes('aria-label='));
assert('Header displays ExamTimer', examPageSrc.includes('<ExamTimer'));
assert('Header includes desktop Submit Exam button', examPageSrc.includes('Submit Exam') && examPageSrc.includes('setIsSubmitDialogOpen(true)'));

// 3. Question Display & Options
console.log('\n--- 3. QUESTION DISPLAY & OPTIONS ---');
assert('QuestionDisplay uses semantic fieldset and legend', 
  questionDisplaySrc.includes('<fieldset') && questionDisplaySrc.includes('<legend'));
assert('QuestionDisplay uses RadioGroup with value and onValueChange', 
  questionDisplaySrc.includes('<RadioGroup') && questionDisplaySrc.includes('onValueChange'));
assert('QuestionDisplay options have large interactive targets', 
  questionDisplaySrc.includes('p-4 sm:p-5 rounded-xl border'));
assert('QuestionDisplay options feature distinct letter badge (A, B, C, D)', 
  questionDisplaySrc.includes('{letter}') && questionDisplaySrc.includes('size-9 rounded-lg font-bold'));
assert('QuestionDisplay options show checkmark when selected', 
  questionDisplaySrc.includes('Check className="size-3.5"'));
assert('QuestionDisplay options have focus-within rings for keyboard navigation', 
  questionDisplaySrc.includes('focus-within:ring-2 focus-within:ring-primary'));

// 4. Question Navigation Controls
console.log('\n--- 4. NAVIGATION & ACTIONS ---');
assert('Previous button with disabled state on question 0', 
  examPageSrc.includes('disabled={state.currentQuestionIndex === 0}'));
assert('Next button with disabled state on final question', 
  examPageSrc.includes('disabled={state.currentQuestionIndex === totalQuestions - 1}'));
assert('Flag button toggles flag with aria-pressed', 
  examPageSrc.includes('aria-pressed={isFlagged}') && examPageSrc.includes('actions.toggleFlag'));
assert('Flag button updates label text (Flagged for Review / Flag for Review)', 
  examPageSrc.includes("isFlagged ? 'Flagged for Review' : 'Flag for Review'"));

// 5. Question Palette
console.log('\n--- 5. QUESTION PALETTE ---');
assert('QuestionPalette has role="navigation" and aria-label', 
  questionPaletteSrc.includes('role="navigation"') && questionPaletteSrc.includes('aria-label="Question palette"'));
assert('QuestionPalette buttons have aria-current for current question', 
  questionPaletteSrc.includes('aria-current={isCurrent ? "true" : undefined}'));
assert('QuestionPalette buttons have comprehensive aria-label describing state', 
  questionPaletteSrc.includes('aria-label={`Question ${index + 1}: ${stateDescription}}'));
assert('QuestionPalette has multi-modal flag indicator (Flag icon)', 
  questionPaletteSrc.includes('<Flag className='));
assert('QuestionPalette has multi-modal answered indicator (Check icon)', 
  questionPaletteSrc.includes('<Check className='));
assert('QuestionPalette includes multi-modal status legend', 
  questionPaletteSrc.includes('Palette status legend') && questionPaletteSrc.includes('Answered') && questionPaletteSrc.includes('Flagged'));

// 6. Timer & Screen Reader Behavior
console.log('\n--- 6. TIMER & SCREEN READER BEHAVIOR ---');
assert('Timer interval set to 1000ms', examTimerSrc.includes('1000'));
assert('Timer has aria-live="off" to prevent per-second announcement spam', examTimerSrc.includes('aria-live="off"'));
assert('Timer has milestone announcements at 10m, 5m, 1m', 
  examTimerSrc.includes('10 minutes remaining') && examTimerSrc.includes('5 minutes remaining') && examTimerSrc.includes('1 minute remaining'));
assert('Timer displays time label (Time Left / Low Time)', 
  examTimerSrc.includes('Time Left:') && examTimerSrc.includes('Low Time:'));
assert('Exam page has dedicated polite live region', 
  examPageSrc.includes('id="exam-live-region"') && examPageSrc.includes('aria-live="polite"'));

// 7. Voice Examination Mode
console.log('\n--- 7. VOICE EXAMINATION MODE ---');
assert('Voice panel displays active/inactive status', 
  voicePanelSrc.includes('Voice Mode: Active') && voicePanelSrc.includes('Enable Voice Mode'));
assert('Voice panel supports multi-modal status badges (Listening, Speaking, Processing, Ready)', 
  voicePanelSrc.includes('Listening...') && voicePanelSrc.includes('Speaking...') && voicePanelSrc.includes('Processing...'));
assert('Voice panel presents last heard command', 
  voicePanelSrc.includes('Last Command:'));
assert('Voice panel includes clear guide of supported voice commands', 
  voicePanelSrc.includes('Supported Voice Commands') && 
  voicePanelSrc.includes('"Option A"') && 
  voicePanelSrc.includes('"Next"') && 
  voicePanelSrc.includes('"Submit Exam"'));

// 8. Submit Dialog
console.log('\n--- 8. SUBMIT DIALOG ---');
assert('SubmitDialog preserves confirmation flow', submitDialogSrc.includes('onConfirmSubmit'));
assert('SubmitDialog displays answered count', submitDialogSrc.includes('{answeredCount}'));
assert('SubmitDialog displays unanswered count', submitDialogSrc.includes('{unansweredCount}'));
assert('SubmitDialog provides cancellation action (Return to Exam)', submitDialogSrc.includes('Return to Exam'));
assert('SubmitDialog provides confirm submission action', submitDialogSrc.includes('Confirm & Submit'));

// 9. Responsive Layout
console.log('\n--- 9. RESPONSIVE LAYOUT ---');
assert('Desktop uses 12-column grid (lg:col-span-8 and lg:col-span-4)', 
  examPageSrc.includes('grid-cols-1 lg:grid-cols-12') && examPageSrc.includes('lg:col-span-8') && examPageSrc.includes('lg:col-span-4'));
assert('Mobile displays prominent in-flow submit action', examPageSrc.includes('md:hidden') && examPageSrc.includes('Submit'));

console.log('\n================================================================');
if (allPassed) {
  console.log('   ALL EXAM EXPERIENCE PHASE 4 CHECKS PASSED (100%)            ');
} else {
  console.log('   SOME CHECKS FAILED — REVIEW OUTPUT ABOVE                    ');
}
console.log('================================================================\n');

process.exit(allPassed ? 0 : 1);
