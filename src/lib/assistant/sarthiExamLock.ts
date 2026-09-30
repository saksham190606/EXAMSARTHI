/**
 * EXAMSARTHI — Sarthi Strict Exam-Mode Lock Utility
 *
 * Determines whether a given route or current browser URL corresponds to an active examination.
 * Sarthi AI Assistant and external navigation are strictly disabled during active examinations
 * to protect examination integrity and prevent cheating/distraction.
 */

import * as React from 'react';

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

let examSessionActive = false;

/**
 * Sets the active status of an ongoing exam or practice session.
 * Synchronizes with sessionStorage and dispatches a window event for reactive UI updates.
 */
export function setExamSessionActive(active: boolean): void {
  examSessionActive = active;
  if (typeof window !== 'undefined') {
    if (active) {
      window.sessionStorage.setItem('examsarthi_active_session', 'true');
      window.dispatchEvent(new CustomEvent('examsarthi_session_lock_change', { detail: { active: true } }));
    } else {
      window.sessionStorage.removeItem('examsarthi_active_session');
      window.dispatchEvent(new CustomEvent('examsarthi_session_lock_change', { detail: { active: false } }));
    }
  }
}

/**
 * Checks whether an exam or practice session is currently actively in progress.
 */
export function isExamSessionActive(): boolean {
  if (typeof window === 'undefined') return false;
  if (examSessionActive) return true;

  if (window.sessionStorage.getItem('examsarthi_active_session') === 'true') {
    const pathname = window.location.pathname;
    const search = window.location.search;
    // An active session is only genuine if candidate is on /exam with a set or exam param
    if (pathname.startsWith('/exam') && (search.includes('set=') || search.includes('exam='))) {
      return true;
    }
    // Otherwise clear stale session storage
    window.sessionStorage.removeItem('examsarthi_active_session');
  }
  return false;
}

/**
 * React hook to subscribe to the exam session lock state in components.
 */
export function useExamLock(): boolean {
  const [isLocked, setIsLocked] = React.useState<boolean>(() => isExamSessionActive());

  React.useEffect(() => {
    const updateLock = () => {
      setIsLocked(isExamSessionActive());
    };
    updateLock();
    window.addEventListener('examsarthi_session_lock_change', updateLock);
    window.addEventListener('popstate', updateLock);
    return () => {
      window.removeEventListener('examsarthi_session_lock_change', updateLock);
      window.removeEventListener('popstate', updateLock);
    };
  }, []);

  return isLocked;
}

