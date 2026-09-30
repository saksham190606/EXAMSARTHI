import { routeVoiceCommand } from '../src/lib/voice/commandRouter';

console.log('Testing Submit Voice Commands and Routing Integrity...\n');

const submitPhrasesToTest = [
  'submit',
  'submit exam',
  'submit the exam',
  'submit my exam',
  'submit final exam',
  'finish exam',
  'submit test',
  'finish test',
  'submit practice',
  'submit practice set',
  'submit practice exam',
  'end exam',
  'end test',
  'complete exam',
  'परीक्षा सबमिट',
  'सबमिट परीक्षा',
  'सबमिट एग्जाम',
  'एग्जाम सबमिट',
  'सबमिट टेस्ट',
  'टेस्ट सबमिट',
  'सबमिट करो',
  'सबमिट करें',
  'परीक्षा समाप्त',
  'pariksha submit',
];

let allPassed = true;

for (const phrase of submitPhrasesToTest) {
  const res = routeVoiceCommand(phrase, 'exam');
  const ok = res.handled && res.type === 'submit';
  console.log(`[${ok ? 'PASS' : 'FAIL'}] "${phrase}" -> type: ${res.type}, handled: ${res.handled}`);
  if (!ok) allPassed = false;
}

const confirmPhrasesToTest = [
  'yes',
  'confirm',
  'haan',
  'हाँ',
  'हां',
  'yes submit',
  'confirm submit',
  'haan submit',
  'kar do',
  'सबमिट कर दो',
  'हाँ सबमिट',
];

for (const phrase of confirmPhrasesToTest) {
  const res = routeVoiceCommand(phrase, 'exam');
  const ok = res.handled && res.type === 'confirm';
  console.log(`[${ok ? 'PASS' : 'FAIL'}] "${phrase}" -> type: ${res.type}, handled: ${res.handled}`);
  if (!ok) allPassed = false;
}

const cancelPhrasesToTest = [
  'no',
  'cancel',
  'nahin',
  'nahi',
  'नहीं',
  'रद्द',
  'cancel submit',
  'dont submit',
  "don't submit",
  'वापस',
];

for (const phrase of cancelPhrasesToTest) {
  const res = routeVoiceCommand(phrase, 'exam');
  const ok = res.handled && res.type === 'cancel';
  console.log(`[${ok ? 'PASS' : 'FAIL'}] "${phrase}" -> type: ${res.type}, handled: ${res.handled}`);
  if (!ok) allPassed = false;
}

// Ensure regular navigation commands STILL work properly
const navPhrasesToTest = [
  { phrase: 'exam', expectedPath: '/exam' },
  { phrase: 'practice', expectedPath: '/practice' },
  { phrase: 'dashboard', expectedPath: '/dashboard' },
  { phrase: 'results', expectedPath: '/results' },
  { phrase: 'settings', expectedPath: '/settings' },
];

for (const { phrase, expectedPath } of navPhrasesToTest) {
  const res = routeVoiceCommand(phrase, 'global-nav');
  const ok = res.handled && res.type === 'route' && res.path === expectedPath;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] Nav "${phrase}" -> type: ${res.type}, path: ${res.path}`);
  if (!ok) allPassed = false;
}

if (!allPassed) {
  console.error('\nSOME SUBMIT VOICE TESTS FAILED!');
  process.exit(1);
} else {
  console.log('\nALL SUBMIT VOICE INTEGRITY TESTS PASSED SUCCESSFULLY!');
}
