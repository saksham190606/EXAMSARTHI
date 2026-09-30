import { PerformanceProfile, TopicMetrics } from './types';
import { AvailableExams, PracticeSets } from '@/lib/mockData';

const HISTORY_KEY = 'exam_performance_history';
const MAX_HISTORY_ITEMS = 50;

/**
 * Resolves human-readable exam title from exam/set ID or remote metadata.
 */
export function resolveExamTitle(examId?: string | null, remoteExamTitle?: string | null): string {
  if (remoteExamTitle && remoteExamTitle !== 'Offline Mock Practice') {
    return remoteExamTitle;
  }
  if (!examId) return 'Practice Examination';

  const cleanId = String(examId).trim().toLowerCase();

  const pSet = PracticeSets.find((p) => p.id.toLowerCase() === cleanId);
  if (pSet) return pSet.title;

  const exam = AvailableExams.find((e) => e.id.toLowerCase() === cleanId);
  if (exam) return exam.title;

  // Check e1..e4 patterns
  if (cleanId === 'e1') return 'SSC CGL Tier 1 Mock';
  if (cleanId === 'e2') return 'Banking Prelims';
  if (cleanId === 'e3') return 'UPSC CSAT Foundation';
  if (cleanId === 'e4' || cleanId.includes('ugc')) return 'UGC NET Paper 1 Mock';

  // Partial match by ID (e.g. 'upsc' or 'ssc')
  const examPartial = AvailableExams.find(
    (e) => cleanId.includes(e.id.toLowerCase()) || e.id.toLowerCase().includes(cleanId)
  );
  if (examPartial) return examPartial.title;

  const pSetPartial = PracticeSets.find(
    (p) => cleanId.includes(p.id.toLowerCase()) || p.id.toLowerCase().includes(cleanId)
  );
  if (pSetPartial) return pSetPartial.title;

  // Handle p1..p6 numerical patterns
  if (cleanId.startsWith('p') && parseInt(cleanId.slice(1), 10)) {
    const idx = parseInt(cleanId.slice(1), 10);
    if (idx >= 1 && idx <= PracticeSets.length) {
      return PracticeSets[idx - 1].title;
    }
  }

  // Handle purely numeric timestamp IDs
  if (/^\d{8,}$/.test(cleanId)) {
    return 'Comprehensive Practice Drill';
  }

  // Format clean human name with proper acronym capitalization
  const words = cleanId.split(/[-_ ]+/).map((w) => {
    const upper = w.toUpperCase();
    if (['UPSC', 'SSC', 'CGL', 'CSAT', 'IBPS', 'SBI', 'GK', 'GS', 'AI'].includes(upper)) {
      return upper;
    }
    return w.charAt(0).toUpperCase() + w.slice(1);
  });
  const formatted = words.join(' ');
  return formatted.includes('Exam') || formatted.includes('Mock') || formatted.includes('Drill')
    ? formatted
    : `${formatted} Mock Exam`;
}

/**
 * Resolves primary subject from exam ID or fallback.
 */
export function resolveExamSubject(examId?: string | null, fallbackSubject?: string | null): string {
  if (fallbackSubject && fallbackSubject !== 'General' && fallbackSubject !== 'mock') {
    return fallbackSubject;
  }
  if (!examId) return 'General Assessment';

  const cleanId = String(examId).trim().toLowerCase();
  const pSet = PracticeSets.find((p) => p.id.toLowerCase() === cleanId);
  if (pSet?.subject) return pSet.subject;

  const exam = AvailableExams.find((e) => e.id.toLowerCase() === cleanId);
  if (exam?.subject) return exam.subject;

  return fallbackSubject || 'General Assessment';
}

/**
 * Enriches a performance profile with guaranteed titles, subjects, scores, and topic metrics.
 */
export function enrichPerformanceProfile(profile: PerformanceProfile): PerformanceProfile {
  const resolvedTitle = resolveExamTitle(profile.examId, profile.examTitle);
  const resolvedSubject = resolveExamSubject(
    profile.examId,
    profile.subject || profile.subjects?.[0]?.subject
  );
  const score = typeof profile.score === 'number' ? profile.score : profile.correct;
  const incorrect = typeof profile.incorrect === 'number' ? profile.incorrect : Math.max(0, profile.attempted - profile.correct);
  const timeUsedSeconds = typeof profile.timeUsedSeconds === 'number' ? profile.timeUsedSeconds : 0;

  // Flatten topic metrics if not already top-level
  let topicMetrics = profile.topicMetrics;
  if (!topicMetrics || topicMetrics.length === 0) {
    const extracted: TopicMetrics[] = [];
    if (Array.isArray(profile.subjects)) {
      profile.subjects.forEach((sub) => {
        if (Array.isArray(sub.topics)) {
          sub.topics.forEach((t) => {
            extracted.push({
              ...t,
              subject: sub.subject,
            });
          });
        }
      });
    }
    topicMetrics = extracted;
  }

  return {
    ...profile,
    id: profile.id || `attempt-${profile.examId}-${profile.timestamp}`,
    examTitle: resolvedTitle,
    subject: resolvedSubject,
    score,
    incorrect,
    timeUsedSeconds,
    topicMetrics,
  };
}

/**
 * Retrieves full persisted exam performance history from localStorage.
 */
export function getPerformanceHistory(): PerformanceProfile[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(enrichPerformanceProfile);
      }
    }
  } catch (e) {
    console.error('[History] Failed to parse performance history:', e);
  }
  return [];
}

/**
 * Persists an examination or practice attempt to localStorage performance history.
 * Guarantees idempotency and deduplicates attempts matching the same ID or session window.
 */
export function savePerformanceProfile(profile: PerformanceProfile): void {
  if (typeof window === 'undefined') return;
  if (!profile || !profile.examId) return;

  try {
    const enriched = enrichPerformanceProfile(profile);
    const history = getPerformanceHistory();

    // Deduplication check:
    // 1. Exact ID match (e.g. attemptId or local-id)
    // 2. Same examId with timestamp within 30 seconds and identical score/attempted
    const existingIndex = history.findIndex((item) => {
      if (enriched.id && item.id && enriched.id === item.id) return true;
      if (
        item.examId === enriched.examId &&
        Math.abs(item.timestamp - enriched.timestamp) < 30000 &&
        item.correct === enriched.correct &&
        item.attempted === enriched.attempted
      ) {
        return true;
      }
      return false;
    });

    let newHistory: PerformanceProfile[];
    if (existingIndex >= 0) {
      newHistory = [...history];
      const existingItem = newHistory[existingIndex];
      newHistory[existingIndex] = {
        ...existingItem,
        ...enriched,
        id: existingItem.id || enriched.id,
        timeUsedSeconds:
          typeof profile.timeUsedSeconds === 'number'
            ? profile.timeUsedSeconds
            : existingItem.timeUsedSeconds ?? 0,
        answers: profile.answers || existingItem.answers,
        reviewQuestions: profile.reviewQuestions || existingItem.reviewQuestions,
      };
    } else {
      newHistory = [enriched, ...history];
    }

    // Keep up to MAX_HISTORY_ITEMS for deep multi-attempt trend tracking
    const trimmed = newHistory.slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));

    // Dispatch global event for reactive UI updates across all open views
    window.dispatchEvent(
      new CustomEvent('examsarthi_performance_updated', { detail: enriched })
    );
  } catch (e) {
    console.error('[History] Failed to save performance profile:', e);
  }
}

/**
 * Clears candidate local performance history.
 */
export function clearPerformanceHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(HISTORY_KEY);
    window.dispatchEvent(
      new CustomEvent('examsarthi_performance_updated', { detail: null })
    );
  } catch (e) {
    console.error('[History] Failed to clear performance history:', e);
  }
}

export interface CumulativeStats {
  totalAttempts: number;
  totalQuestionsAttempted: number;
  totalCorrect: number;
  totalIncorrect: number;
  overallAccuracy: number;
  averageScore: number;
  bestScore: number;
  totalTimeUsedSeconds: number;
}

/**
 * Calculates high-level cumulative statistics across all saved performance history.
 */
export function getPerformanceStats(): CumulativeStats {
  const history = getPerformanceHistory();
  if (history.length === 0) {
    return {
      totalAttempts: 0,
      totalQuestionsAttempted: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      overallAccuracy: 0,
      averageScore: 0,
      bestScore: 0,
      totalTimeUsedSeconds: 0,
    };
  }

  const totalAttempts = history.length;
  const totalQuestionsAttempted = history.reduce((acc, h) => acc + (h.attempted || 0), 0);
  const totalCorrect = history.reduce((acc, h) => acc + (h.correct || 0), 0);
  const totalIncorrect = history.reduce((acc, h) => acc + ((h.incorrect ?? (h.attempted - h.correct)) || 0), 0);
  const totalTimeUsedSeconds = history.reduce((acc, h) => acc + (h.timeUsedSeconds || 0), 0);

  const overallAccuracy = totalQuestionsAttempted > 0
    ? Math.round((totalCorrect / totalQuestionsAttempted) * 100)
    : 0;

  const scores = history.map((h) => (typeof h.score === 'number' ? h.score : h.correct));
  const averageScore = Number((scores.reduce((a, b) => a + b, 0) / totalAttempts).toFixed(1));
  const bestScore = Math.max(...scores);

  return {
    totalAttempts,
    totalQuestionsAttempted,
    totalCorrect,
    totalIncorrect,
    overallAccuracy,
    averageScore,
    bestScore,
    totalTimeUsedSeconds,
  };
}

export interface DateSpeechFormat {
  dateStr: string;
  prefix: string;
}

/**
 * Formats a timestamp into natural speech phrasing for voice announcements.
 */
export function formatDateForSpeech(timestamp: number, isHindi: boolean): DateSpeechFormat {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) {
      return {
        dateStr: isHindi ? "हाल ही में" : "recently",
        prefix: isHindi ? "हाल ही में" : "recently",
      };
    }

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return {
        dateStr: isHindi ? "आज" : "today",
        prefix: isHindi ? "आज" : "today",
      };
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return {
        dateStr: isHindi ? "कल" : "yesterday",
        prefix: isHindi ? "कल" : "yesterday",
      };
    }

    if (isHindi) {
      const day = d.getDate();
      const monthNames = [
        "जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून",
        "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"
      ];
      const month = monthNames[d.getMonth()] || "महीने";
      return {
        dateStr: `${day} ${month}`,
        prefix: `${day} ${month} को,`,
      };
    } else {
      const formatted = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      return {
        dateStr: formatted,
        prefix: `on ${formatted},`,
      };
    }
  } catch {
    return {
      dateStr: isHindi ? "हाल ही में" : "recently",
      prefix: isHindi ? "हाल ही में" : "recently",
    };
  }
}

