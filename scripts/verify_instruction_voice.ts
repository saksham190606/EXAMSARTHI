import { routeVoiceCommand, registerVoiceContext, unregisterVoiceContext } from '../src/lib/voice/commandRouter';

console.log('Testing Instruction Voice Isolation...');

// 1. Without instruction context active
const normalNav = routeVoiceCommand('dashboard', 'global-nav');
console.log('Normal dashboard command in global-nav:', normalNav.handled, normalNav.type, (normalNav as any).path);
if (!normalNav.handled || (normalNav as any).path !== '/dashboard') {
  console.error('FAIL: Normal dashboard command should be handled');
  process.exit(1);
}

// 2. Register instruction context
registerVoiceContext('instruction', () => {});

// Now test commands when instruction is registered
const testCases = [
  { input: 'start exam', expectHandled: true, expectType: 'continue' },
  { input: 'start test', expectHandled: true, expectType: 'continue' },
  { input: 'start mock', expectHandled: true, expectType: 'continue' },
  { input: 'परीक्षा शुरू करें', expectHandled: true, expectType: 'continue' },
  { input: 'repeat', expectHandled: true, expectType: 'repeat-question' },
  { input: 'repeat instruction', expectHandled: true, expectType: 'repeat-question' },
  { input: 'दोबारा', expectHandled: true, expectType: 'repeat-question' },
  { input: 'go back', expectHandled: true, expectType: 'route' },
  { input: 'back', expectHandled: true, expectType: 'route' },
  { input: 'वापस', expectHandled: true, expectType: 'route' },
  // These MUST be rejected while on instruction screen:
  { input: 'dashboard', expectHandled: false },
  { input: 'practice', expectHandled: false },
  { input: 'results', expectHandled: false },
  { input: 'settings', expectHandled: false },
  { input: 'ssc cgl', expectHandled: false },
  { input: 'upsc', expectHandled: false },
  { input: 'next', expectHandled: false },
  { input: 'submit', expectHandled: false },
];

let failed = 0;
for (const tc of testCases) {
  const res = routeVoiceCommand(tc.input, 'instruction');
  const passHandled = res.handled === tc.expectHandled;
  const passType = !tc.expectType || res.type === tc.expectType;
  if (passHandled && passType) {
    console.log(`[PASS] "${tc.input}" -> handled: ${res.handled}, type: ${res.type}`);
  } else {
    console.error(`[FAIL] "${tc.input}" -> expected handled=${tc.expectHandled}, type=${tc.expectType}; got handled=${res.handled}, type=${res.type}`);
    failed++;
  }
}

// 3. Unregister instruction context and verify global-nav restored
unregisterVoiceContext('instruction');
const restoredNav = routeVoiceCommand('dashboard', 'global-nav');
if (!restoredNav.handled || (restoredNav as any).path !== '/dashboard') {
  console.error('FAIL: Restored dashboard command should be handled');
  process.exit(1);
}
console.log('Restored dashboard command after unregister:', restoredNav.handled, (restoredNav as any).path);

if (failed === 0) {
  console.log('ALL INSTRUCTION VOICE TESTS PASSED!');
} else {
  console.error(`${failed} tests failed!`);
  process.exit(1);
}
