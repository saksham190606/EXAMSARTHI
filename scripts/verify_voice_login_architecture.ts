/**
 * EXAMSARTHI — Voice Login & Landing Page Navigation Verification Script
 */

import { isDemoCredentials, createDemoUser, createDemoSession, createDemoProfile } from '../src/components/providers/AuthProvider';
import { matchNavigationIntent, LOGIN_KEYWORDS } from '../src/components/layout/VoiceNavigation';

function parseSpokenUserId(rawText: string): string | null {
  const clean = rawText.toLowerCase().trim();
  if (!clean) return null;

  // Ignore prompts or echo of "user id", "id", etc.
  if (/^(user\s*id|id|username|user|my\s*user\s*id|please\s*say\s*your\s*user\s*id|यूजर\s*आईडी|आईडी)$/i.test(clean)) {
    return null;
  }

  const normalized = clean
    .replace(/\bzero\s+one\b/g, '01')
    .replace(/\bzero\s+1\b/g, '01')
    .replace(/\b0\s+1\b/g, '01')
    .replace(/\bzero\b/g, '0')
    .replace(/\bone\b/g, '1')
    .replace(/\s+/g, '');

  if (
    normalized.includes('priyansh01') ||
    normalized.includes('priyansh1') ||
    normalized.includes('priyansh') ||
    normalized.includes('priyanshh')
  ) {
    return 'priyansh01';
  }

  if (normalized.includes('demo')) {
    return 'demo';
  }

  const stripped = clean
    .replace(/^.*?(?:user\s*id\s*(?:is)?|id\s*(?:is)?)\s*/i, '')
    .trim()
    .replace(/\s+/g, '');

  if (
    stripped.includes('priyansh01') ||
    stripped.includes('priyansh')
  ) {
    return 'priyansh01';
  }

  if (stripped.length >= 3 && stripped !== 'userid') {
    return stripped;
  }

  return null;
}

function parseSpokenPassword(rawText: string): string | null {
  const clean = rawText.toLowerCase().trim();
  if (!clean) return null;

  // Convert Hindi & English number words to digits
  const converted = clean
    .replace(/(?:\b|^)zero(?:\b|$)/g, '0')
    .replace(/(?:\b|^)one(?:\b|$)/g, '1')
    .replace(/(?:\b|^)two(?:\b|$)/g, '2')
    .replace(/(?:\b|^)three(?:\b|$)/g, '3')
    .replace(/(?:\b|^)four(?:\b|$)/g, '4')
    .replace(/(?:\b|^)five(?:\b|$)/g, '5')
    .replace(/(?:\b|^)six(?:\b|$)/g, '6')
    .replace(/(?:\b|^)seven(?:\b|$)/g, '7')
    .replace(/(?:\b|^)eight(?:\b|$)/g, '8')
    .replace(/(?:\b|^)nine(?:\b|$)/g, '9')
    .replace(/शून्य/g, '0')
    .replace(/एक/g, '1')
    .replace(/दो/g, '2')
    .replace(/तीन/g, '3')
    .replace(/चार/g, '4')
    .replace(/(?:पाँच|पांच)/g, '5')
    .replace(/छह/g, '6')
    .replace(/सात/g, '7')
    .replace(/आठ/g, '8')
    .replace(/नौ/g, '9')
    .replace(/[१]/g, '1')
    .replace(/[२]/g, '2')
    .replace(/[३]/g, '3')
    .replace(/[४]/g, '4')
    .replace(/[५]/g, '5');

  const digitsOnly = converted.replace(/\D/g, '');

  if (digitsOnly.includes('12345')) {
    return '12345';
  }

  return digitsOnly.length >= 4 ? digitsOnly : null;
}

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}`, details || '');
    process.exitCode = 1;
  }
}

console.log('================================================================');
console.log('  VOICE LOGIN & LANDING ARCHITECTURE VERIFICATION TEST          ');
console.log('================================================================\n');

// 1. Spoken User ID Normalization Tests
const spokenUserIdCases = [
  { input: 'priyansh01', expected: 'priyansh01' },
  { input: 'priyansh 01', expected: 'priyansh01' },
  { input: 'priyansh zero one', expected: 'priyansh01' },
  { input: 'Priyansh 01', expected: 'priyansh01' },
  { input: 'priyansh 1', expected: 'priyansh01' },
  { input: 'priyansh', expected: 'priyansh01' },
  { input: 'my user id is priyansh 01', expected: 'priyansh01' },
  { input: 'demo', expected: 'demo' },
  { input: 'user id', expected: null },
  { input: 'my user id', expected: null },
];

for (const testCase of spokenUserIdCases) {
  const parsed = parseSpokenUserId(testCase.input);
  assert(parsed === testCase.expected, `Spoken User ID: "${testCase.input}" -> "${parsed}"`);
}

// 2. Spoken Password Normalization Tests
const spokenPasswordCases = [
  { input: '12345', expected: '12345' },
  { input: '1 2 3 4 5', expected: '12345' },
  { input: 'one two three four five', expected: '12345' },
  { input: 'one 2 3 4 5', expected: '12345' },
  { input: 'password 1 2 3 4 5', expected: '12345' },
  { input: 'password is 12345', expected: '12345' },
  { input: 'एक दो तीन चार पांच', expected: '12345' },
  { input: '१२३४५', expected: '12345' },
];

for (const testCase of spokenPasswordCases) {
  const parsed = parseSpokenPassword(testCase.input);
  assert(parsed === testCase.expected, `Spoken Password: "${testCase.input}" -> "${parsed}"`);
}

// 3. Demo Credentials Validator Tests
assert(isDemoCredentials('priyansh01', '12345'), 'isDemoCredentials: priyansh01 + 12345 is valid');
assert(isDemoCredentials('priyansh', '12345'), 'isDemoCredentials: priyansh + 12345 is valid');
assert(isDemoCredentials('priyansh 01', '1 2 3 4 5'), 'isDemoCredentials: priyansh 01 + 1 2 3 4 5 is valid');
assert(isDemoCredentials('priyansh01@examsarthi.in', '12345'), 'isDemoCredentials: priyansh01@examsarthi.in + 12345 is valid');
assert(isDemoCredentials('demo', '12345'), 'isDemoCredentials: demo + 12345 is valid');
assert(!isDemoCredentials('priyansh01', 'wrong_pass'), 'isDemoCredentials: wrong password rejected');
assert(!isDemoCredentials('random_user', '12345'), 'isDemoCredentials: wrong user rejected');

// 4. Demo Profile and User Data Integrity
const demoUser = createDemoUser();
assert(demoUser.email === 'priyansh01@examsarthi.in', 'Demo User email matches priyansh01@examsarthi.in');
assert(demoUser.user_metadata?.full_name === 'Priyansh Gupta', 'Demo User name matches Priyansh Gupta');

const demoProfile = createDemoProfile(demoUser.id);
assert(demoProfile.full_name === 'Priyansh Gupta', 'Demo Profile full_name matches Priyansh Gupta');

const demoSession = createDemoSession(demoUser);
assert(Boolean(demoSession.access_token), 'Demo Session has access_token');
assert(demoSession.user.id === demoUser.id, 'Demo Session references correct user ID');

// 5. Landing Page Navigation Tests ("Login" voice command)
const loginVoicePhrases = [
  'login',
  'log in',
  'please login',
  'open login',
  'sign in',
  'लॉगिन',
  'साइन इन',
];

for (const phrase of loginVoicePhrases) {
  const match = matchNavigationIntent(phrase);
  assert(match !== null && match.target === 'LOGIN' && match.path === '/login', `Landing voice command: "${phrase}" -> /login`);
}

console.log('\n================================================================');
console.log(`TOTAL: ${passedTests} PASSED, ${totalTests - passedTests} FAILED across ${totalTests} tests.`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  console.log('ALL VOICE LOGIN & LANDING ARCHITECTURE TESTS PASSED SUCCESSFULLY!');
} else {
  process.exit(1);
}
