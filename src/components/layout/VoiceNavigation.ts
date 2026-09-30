/**
 * EXAMSARTHI — Global Fuzzy Voice Navigation Router
 * Module 2: Substring inclusion matching across platform destinations.
 */

import { cleanVoiceTranscript } from '@/lib/voice/useVoiceEngine';

export type NavigationTarget = 'DASHBOARD' | 'EXAMS' | 'PRACTICE' | 'PRACTICE_GK' | 'SETTINGS' | 'LOGIN' | 'UNKNOWN';

export interface NavigationRouteConfig {
  target: NavigationTarget;
  path: string;
  announcementEn: string;
  announcementHi: string;
  keywords: string[];
}

export const DASHBOARD_KEYWORDS = [
  "dashboard", 
  "home", 
  "main screen", 
  "profile", 
  "डैशबोर्ड", 
  "होम", 
  "मुख्य पृष्ठ"
];

export const EXAMS_KEYWORDS = [
  "exam", 
  "exams", 
  "mock", 
  "test", 
  "test series", 
  "परीक्षा", 
  "मॉक टेस्ट", 
  "टेस्ट"
];

export const PRACTICE_GK_KEYWORDS = [
  "practice, gk and geography",
  "practice gk and geography",
  "practice gk geography",
  "open practice gk and geography",
  "open practice gk geography",
  "open gk and geography",
  "go to practice gk",
  "open geography practice",
  "open gk geography",
  "gk and geography",
  "gk & geography",
  "gk geography",
  "practice gk",
  "geography practice",
  "geography",
  "भूगोल",
  "सामान्य ज्ञान और भूगोल",
  "जीके और भूगोल",
];

export const PRACTICE_KEYWORDS = [
  "practice", 
  "learn", 
  "study", 
  "prepare", 
  "प्रैक्टिस", 
  "अभ्यास", 
  "पढ़ाई"
];

export const SETTINGS_KEYWORDS = [
  "setting", 
  "settings", 
  "preferences", 
  "accessibility", 
  "सेटिंग", 
  "विकल्प"
];

export const LOGIN_KEYWORDS = [
  "login", 
  "sign in", 
  "log in", 
  "authenticate", 
  "लॉगिन", 
  "साइन इन"
];

export const NAVIGATION_ROUTES: NavigationRouteConfig[] = [
  {
    target: 'DASHBOARD',
    path: '/dashboard',
    announcementEn: 'Navigating to your Dashboard',
    announcementHi: 'डैशबोर्ड खोला जा रहा है',
    keywords: DASHBOARD_KEYWORDS,
  },
  {
    target: 'EXAMS',
    path: '/exam',
    announcementEn: 'Opening the Exams Hub',
    announcementHi: 'परीक्षा केंद्र खोला जा रहा है',
    keywords: EXAMS_KEYWORDS,
  },
  {
    target: 'PRACTICE_GK',
    path: '/practice?subject=gk',
    announcementEn: 'Opening Practice, General Knowledge and Geography',
    announcementHi: 'सामान्य ज्ञान और भूगोल अभ्यास खोला जा रहा है',
    keywords: PRACTICE_GK_KEYWORDS,
  },
  {
    target: 'PRACTICE',
    path: '/practice',
    announcementEn: 'Opening Practice section',
    announcementHi: 'अभ्यास अनुभाग खोला जा रहा है',
    keywords: PRACTICE_KEYWORDS,
  },
  {
    target: 'SETTINGS',
    path: '/settings',
    announcementEn: 'Opening Settings',
    announcementHi: 'सेटिंग्स खोली जा रही हैं',
    keywords: SETTINGS_KEYWORDS,
  },
  {
    target: 'LOGIN',
    path: '/login',
    announcementEn: 'Opening Sign In page',
    announcementHi: 'लॉगिन पृष्ठ खोला जा रहा है',
    keywords: LOGIN_KEYWORDS,
  },
];

/**
 * Match a raw voice transcript against platform destinations using substring inclusion.
 * Always normalizes the transcript first using cleanVoiceTranscript.
 */
export function matchNavigationIntent(rawTranscript: string): NavigationRouteConfig | null {
  const text = cleanVoiceTranscript(rawTranscript);
  if (!text) return null;

  for (const route of NAVIGATION_ROUTES) {
    if (route.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      return route;
    }
  }

  return null;
}

/**
 * Handle navigation action with speech announcement and router push.
 */
export function handleVoiceNavigation(
  rawTranscript: string,
  router: { push: (path: string) => void },
  speak?: (text: string, lang: string) => void,
  isHindi: boolean = false
): boolean {
  const match = matchNavigationIntent(rawTranscript);
  if (!match) return false;

  const text = cleanVoiceTranscript(rawTranscript);
  console.log('Voice transcript:', rawTranscript);
  console.log('Normalized command:', text);
  console.log('Detected intent:', match.target);
  console.log('Action:', 'navigate');
  console.log('Navigation route:', match.path);

  const speechLang = isHindi ? 'hi-IN' : 'en-US';
  const announcement = isHindi ? match.announcementHi : match.announcementEn;

  if (speak) {
    speak(announcement, speechLang);
  }

  router.push(match.path);
  return true;
}
