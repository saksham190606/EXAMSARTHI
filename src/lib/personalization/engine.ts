import { ExamResults } from '@/lib/resultsUtils';
import { Question } from '@/lib/examData';
import { PerformanceProfile, Recommendation, SubjectPerformanceProfile, TopicMetrics } from './types';

export const WEAK_THRESHOLD = 70;
export const PRIORITY_THRESHOLD = 50;
export const STRONG_THRESHOLD = 80;

export function analyzePerformance(
  result: ExamResults,
  questions: Question[],
  rawAnswers: Record<string, string>
): PerformanceProfile {
  const subjectMap = new Map<string, SubjectPerformanceProfile>();

  // Initialize
  for (const q of questions) {
    if (!subjectMap.has(q.subject)) {
      subjectMap.set(q.subject, {
        subject: q.subject,
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        accuracy: 0,
        topics: [],
      });
    }

    const subProfile = subjectMap.get(q.subject)!;
    subProfile.totalQuestions++;

    let topicProfile = subProfile.topics.find((t) => t.topic === q.topic);
    if (!topicProfile) {
      topicProfile = {
        topic: q.topic,
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        accuracy: 0,
      };
      subProfile.topics.push(topicProfile);
    }
    topicProfile.totalQuestions++;

    // Calculate answers
    const answer = rawAnswers[q.id];
    if (answer) {
      subProfile.attempted++;
      topicProfile.attempted++;

      if (answer === q.correctAnswerId) {
        subProfile.correct++;
        topicProfile.correct++;
      } else {
        subProfile.incorrect++;
        topicProfile.incorrect++;
      }
    }
  }

  // Calculate accuracies
  const subjects = Array.from(subjectMap.values()).map((sub) => {
    sub.accuracy = sub.attempted > 0 ? Math.round((sub.correct / sub.attempted) * 100) : 0;
    sub.topics.forEach((t) => {
      t.accuracy = t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : 0;
    });
    return sub;
  });

  return {
    examId: Date.now().toString(),
    timestamp: Date.now(),
    totalQuestions: result.totalQuestions,
    attempted: result.attempted,
    correct: result.correct,
    accuracy: result.accuracy,
    subjects,
  };
}

function getSubjectSlug(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes('general') || s.includes('gk')) return 'gk';
  if (s.includes('quant')) return 'quant';
  if (s.includes('reason')) return 'reasoning';
  if (s.includes('english')) return 'english';
  return 'all';
}

export function generateRecommendations(
  profile: PerformanceProfile | null,
  previousProfiles: PerformanceProfile[] = []
): Recommendation[] {
  if (!profile || profile.attempted === 0) {
    return [
      {
        id: 'no-data',
        priority: 'GENERAL',
        priorityScore: 0,
        title: 'Start Practicing',
        description: 'Complete your first practice exam to unlock personalized recommendations.',
        actionLabel: 'Take a Mock Exam',
        actionUrl: '/exam',
      },
    ];
  }

  const recommendations: Recommendation[] = [];

  // Evaluate subjects and topics
  profile.subjects.forEach((sub) => {
    if (sub.attempted === 0) return;

    // 1. Check for Weak Topics inside this subject
    const weakTopics = sub.topics.filter((t) => t.attempted > 0 && t.accuracy < WEAK_THRESHOLD);
    
    weakTopics.forEach((topic) => {
      const isPriority = topic.accuracy < PRIORITY_THRESHOLD;
      
      // Check for recurring weakness
      let isRecurring = false;
      if (previousProfiles.length > 0) {
        const prev = previousProfiles[0]; // most recent previous
        const prevSub = prev.subjects.find((s) => s.subject === sub.subject);
        if (prevSub) {
          const prevTopic = prevSub.topics.find((t) => t.topic === topic.topic);
          if (prevTopic && prevTopic.attempted > 0 && prevTopic.accuracy < WEAK_THRESHOLD) {
            isRecurring = true;
          }
        }
      }

      let description = `${topic.topic} is currently your weakest ${sub.subject} topic at ${topic.accuracy}%.`;
      if (isRecurring) {
        description = `${topic.topic} has remained a recurring improvement area across your recent attempts (${topic.accuracy}% accuracy).`;
      } else if (isPriority) {
        description = `You are making frequent mistakes in ${topic.topic}. Start with easier practice questions to build foundation.`;
      }

      const slugSub = getSubjectSlug(sub.subject);
      const slugTopic = topic.topic.toLowerCase().replace(/\s+/g, '-');

      recommendations.push({
        id: `topic-${topic.topic}`,
        priority: isPriority || isRecurring ? 'CRITICAL' : 'HIGH',
        priorityScore: (isRecurring ? 100 : 0) + (100 - topic.accuracy) + (100 - sub.accuracy), // Higher score = lower topic & subject accuracy
        title: `${sub.subject}: ${topic.topic}`,
        description,
        actionLabel: `Practice ${topic.topic}`,
        actionUrl: `/practice?subject=${slugSub}&topic=${slugTopic}`,
      });
    });

    // 2. Check for Subject-level Strength
    if (sub.accuracy >= STRONG_THRESHOLD && weakTopics.length === 0) {
      const slugSub = getSubjectSlug(sub.subject);
      recommendations.push({
        id: `strong-${sub.subject}`,
        priority: 'MAINTAIN',
        priorityScore: sub.accuracy * 0.1, // Low priority
        title: `${sub.subject} Mastery`,
        description: `You're performing strongly here at ${sub.accuracy}%. Maintain your current level.`,
        actionLabel: 'Practice Advanced',
        actionUrl: `/practice?subject=${slugSub}&difficulty=advanced`,
      });
    }
  });

  // Global Trend
  if (previousProfiles.length > 0) {
    const prev = previousProfiles[0];
    if (prev.attempted > 0) {
      const diff = profile.accuracy - prev.accuracy;
      if (diff >= 5) {
        recommendations.push({
          id: 'trend-improving',
          priority: 'GENERAL',
          priorityScore: 50,
          title: 'Steady Improvement',
          description: `Your overall accuracy improved by ${diff} percentage points compared with your previous attempt.`,
          actionLabel: 'Continue Mixed Practice',
          actionUrl: '/practice',
        });
      }
    }
  }

  // Fallback for balanced performance if no weaknesses found
  if (recommendations.filter((r) => r.priority === 'CRITICAL' || r.priority === 'HIGH').length === 0) {
    recommendations.push({
      id: 'balanced-perf',
      priority: 'GENERAL',
      priorityScore: 30,
      title: 'Balanced Performance',
      description: 'Your performance is relatively balanced. Continue mixed practice while gradually increasing difficulty.',
      actionLabel: 'Mixed Practice',
      actionUrl: '/practice',
    });
  }

  // Sort by priority score descending
  return recommendations.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 4);
}
