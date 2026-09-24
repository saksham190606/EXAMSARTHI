import { PerformanceProfile } from './types';

const HISTORY_KEY = 'exam_performance_history';

export function getPerformanceHistory(): PerformanceProfile[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      return JSON.parse(raw) as PerformanceProfile[];
    }
  } catch (e) {
    console.error('Failed to parse performance history', e);
  }
  return [];
}

export function savePerformanceProfile(profile: PerformanceProfile): void {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getPerformanceHistory();
    // Keep max 10 recent exams to avoid huge local storage blobs
    const newHistory = [profile, ...history].slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  } catch (e) {
    console.error('Failed to save performance profile', e);
  }
}
