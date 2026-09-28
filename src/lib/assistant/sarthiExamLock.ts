/**
 * EXAMSARTHI — Sarthi Strict Exam-Mode Lock Utility
 *
 * Determines whether a given route or current browser URL corresponds to an active examination.
 * Sarthi AI Assistant is strictly disabled during active examinations to protect examination integrity.
 */

export function isExamRoute(urlOrPath?: string | null): boolean {
  if (!urlOrPath) return false;
  try {
    let clean = urlOrPath.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      const parsed = new URL(clean);
      clean = parsed.pathname;
    } else {
      // Strip query parameters and hashes
      clean = clean.split('?')[0].split('#')[0].trim();
    }

    // Normalize trailing slash (e.g. /exam/ -> /exam)
    if (clean.endsWith('/') && clean.length > 1) {
      clean = clean.slice(0, -1);
    }

    return clean === '/exam' || clean.startsWith('/exam/');
  } catch {
    return false;
  }
}

export function isExamActiveNow(): boolean {
  if (typeof window === 'undefined') return false;
  return isExamRoute(window.location.pathname);
}
