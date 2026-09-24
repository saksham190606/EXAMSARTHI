/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import React, { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ArrowRight,
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  Target, 
  Clock, 
  AlertTriangle, 
  BookOpen, 
  RotateCcw,
  Sparkles,
  TrendingUp,
  History,
  Award
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

import { MockExamQuestions } from '@/lib/examData';
import { ExamState } from '@/lib/useExamEngine';
import { calculateResults, ExamResults } from '@/lib/resultsUtils';
import { SubjectPerformance } from '@/components/results/SubjectPerformance';

import { analyzePerformance, generateRecommendations } from '@/lib/personalization/engine';
import { getPerformanceHistory, savePerformanceProfile } from '@/lib/personalization/history';
import { PerformanceProfile, Recommendation } from '@/lib/personalization/types';
import { useTranslation } from '@/lib/i18n';

interface WeakTopicItem {
  subject: string;
  topic: string;
  accuracy: number;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  actionUrl: string;
}

export default function ResultsPage() {
  const [finalState, setFinalState] = useState<ExamState | null>(null);
  const [results, setResults] = useState<ExamResults | null>(null);
  const [profile, setProfile] = useState<PerformanceProfile | null>(null);
  const [previousAttempt, setPreviousAttempt] = useState<PerformanceProfile | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('examResultState');
      if (stored) {
        try {
          setFinalState(JSON.parse(stored) as ExamState);
        } catch (e) {
          console.error("Failed to parse exam state", e);
        }
      } else {
        // Safe fallback for direct navigation
        setFinalState({
          currentQuestionIndex: 14,
          answers: { "q1": "o2", "q2": "o3", "q3": "o1" },
          flagged: new Set(),
          timeRemaining: 1200,
          isSubmitted: true,
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!finalState) return;

    const stateToProcess = {
      ...finalState,
      flagged: new Set(finalState.flagged || [])
    };
    
    const calculated = calculateResults(MockExamQuestions, stateToProcess, 1200);
    setResults(calculated);

    // Personalization & History Pipeline
    const newProfile = analyzePerformance(calculated, MockExamQuestions, stateToProcess.answers);
    setProfile(newProfile);

    const history = getPerformanceHistory();
    // Record the immediate previous attempt if one exists
    if (history.length > 0) {
      setPreviousAttempt(history[0]);
    } else {
      setPreviousAttempt(null);
    }

    // Save profile to history if not duplicate within 5s
    if (history.length === 0 || history[0].timestamp < newProfile.timestamp - 5000) {
      savePerformanceProfile(newProfile);
    }
    
    const recs = generateRecommendations(newProfile, history);
    setRecommendations(recs);

  }, [finalState]);

  // Extract weak topics directly from profile
  const weakTopics = useMemo<WeakTopicItem[]>(() => {
    if (!profile) return [];
    const items: WeakTopicItem[] = [];
    profile.subjects.forEach((sub) => {
      sub.topics.forEach((t) => {
        if (t.attempted > 0 && t.accuracy < 70) {
          const s = sub.subject.toLowerCase();
          const slugSub = s.includes('gk') || s.includes('general') ? 'gk'
            : s.includes('quant') ? 'quant'
            : s.includes('reason') ? 'reasoning'
            : s.includes('english') ? 'english' : 'all';
          const slugTopic = t.topic.toLowerCase().replace(/\s+/g, '-');
          items.push({
            subject: sub.subject,
            topic: t.topic,
            accuracy: t.accuracy,
            totalQuestions: t.totalQuestions,
            attempted: t.attempted,
            correct: t.correct,
            incorrect: t.incorrect,
            actionUrl: `/practice?subject=${slugSub}&topic=${slugTopic}`,
          });
        }
      });
    });
    return items.sort((a, b) => a.accuracy - b.accuracy);
  }, [profile]);

  if (!results) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4" role="status" aria-live="polite">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em]" />
          <p className="text-muted-foreground text-sm font-medium">Loading evaluation and performance analysis...</p>
        </div>
      </div>
    );
  }

  const formattedTime = `${Math.floor(results.timeUsed / 60)}m ${results.timeUsed % 60}s`;

  // Factual status determination without judgmental vocabulary
  const getOverallStatus = () => {
    if (results.percentage >= 80) {
      return { label: 'Strong Performance', variant: 'secondary' as const, icon: Award };
    }
    if (results.percentage >= 60) {
      return { label: 'Progressing Well', variant: 'outline' as const, icon: CheckCircle2 };
    }
    if (results.percentage >= 40) {
      return { label: 'Focus Area', variant: 'outline' as const, icon: Target };
    }
    return { label: 'Needs More Practice', variant: 'destructive' as const, icon: BookOpen };
  };

  const overallStatus = getOverallStatus();
  const StatusIcon = overallStatus.icon;

  // Primary action recommendation URL
  const primaryRecommendationUrl = recommendations.length > 0 && recommendations[0].id !== 'no-data'
    ? recommendations[0].actionUrl
    : '/practice';

  return (
    <div className="min-h-screen bg-background text-foreground py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-8">
      
      {/* Top Navigation & Breadcrumb */}
      <nav aria-label="Results navigation" className="flex items-center justify-between">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{t('backToDashboard')}</span>
        </Link>
        <Badge variant="outline" className="gap-1 font-semibold text-xs py-1">
          <History className="h-3 w-3" aria-hidden="true" />
          <span>{t('evalSession')}</span>
        </Badge>
      </nav>

      {/* SECTION A — RESULT HEADER */}
      <header className="space-y-3 border-b border-border/80 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1 px-2.5 py-1 text-xs font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>{t('examComplete')}</span>
          </Badge>
          <span className="text-xs text-muted-foreground" aria-hidden="true">•</span>
          <span className="text-xs text-muted-foreground font-medium">
            {t('questionsEvaluated', { count: results.totalQuestions })}
          </span>
          <span className="text-xs text-muted-foreground" aria-hidden="true">•</span>
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {formattedTime} Taken
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
          {t('examinationResults')}
        </h1>
        <p className="text-base text-muted-foreground font-medium">
          {t('examName')}
        </p>
      </header>

      {/* SECTION B — OVERALL PERFORMANCE */}
      <section aria-labelledby="overall-performance-heading" className="space-y-4">
        <h2 id="overall-performance-heading" className="sr-only">
          {t('performanceSummary')}
        </h2>

        <div className="grid gap-6 md:grid-cols-12 items-stretch">
          
          {/* Main Score Card (7 columns on desktop) */}
          <Card className="md:col-span-7 border border-border/80 shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t('overallScore')}
                </span>
                <Badge variant={overallStatus.variant} className="gap-1 text-xs font-medium">
                  <StatusIcon className="h-3 w-3" aria-hidden="true" />
                  <span>{overallStatus.label}</span>
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold">{t('performanceSummary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="flex flex-col sm:flex-row items-baseline sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-foreground tracking-tight">
                      {results.score}
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-muted-foreground">
                      / {results.totalQuestions}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium mt-1">
                    Score: {results.score} out of {results.totalQuestions} ({results.percentage}%)
                  </p>
                </div>

                <div className="text-right sm:text-right">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {t('accuracyRate')}
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground">
                    {results.accuracy}%
                  </div>
                </div>
              </div>

              {/* Accessible Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                  <span>Score Progress</span>
                  <span>{results.percentage}%</span>
                </div>
                <Progress 
                  value={results.percentage} 
                  className="h-3.5 bg-muted" 
                  aria-label={`Score: ${results.score} out of ${results.totalQuestions}, representing ${results.percentage} percent.`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Question Outcome Breakdown Cards (5 columns on desktop) */}
          <Card className="md:col-span-5 border border-border/80 shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Question Breakdown
              </span>
              <CardTitle className="text-lg font-bold">{t('attemptOutcomes')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t('correctAnswers')}</div>
                    <div className="text-xs text-muted-foreground">{t('correctDesc')}</div>
                  </div>
                </div>
                <span className="text-xl font-bold text-foreground">{results.correct}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                <div className="flex items-center gap-2.5">
                  <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t('incorrectAnswers')}</div>
                    <div className="text-xs text-muted-foreground">{t('incorrectDesc')}</div>
                  </div>
                </div>
                <span className="text-xl font-bold text-foreground">{results.incorrect}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                <div className="flex items-center gap-2.5">
                  <MinusCircle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t('unansweredQuestions')}</div>
                    <div className="text-xs text-muted-foreground">{t('unansweredDesc')}</div>
                  </div>
                </div>
                <span className="text-xl font-bold text-foreground">{results.unanswered}</span>
              </div>
            </CardContent>
          </Card>

        </div>
      </section>

      {/* SECTION C — SUBJECT PERFORMANCE */}
      <section aria-labelledby="subject-performance-heading" className="space-y-3">
        <h2 id="subject-performance-heading" className="text-xl font-bold tracking-tight">
          {t('subjectAnalysis')}
        </h2>
        <SubjectPerformance metrics={results.subjectMetrics} />
      </section>

      {/* SECTION D — AREAS TO IMPROVE */}
      <section aria-labelledby="areas-to-improve-heading" className="space-y-4">
        <div className="space-y-1">
          <h2 id="areas-to-improve-heading" className="text-xl font-bold tracking-tight">
            {t('areasToImprove')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('areasToImproveDesc')}
          </p>
        </div>

        {weakTopics.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {weakTopics.map((item) => (
              <Card key={`${item.subject}-${item.topic}`} className="border border-border/80 shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <Badge variant="outline" className="text-xs font-semibold">
                      {item.subject}
                    </Badge>
                    <Badge variant="destructive" className="gap-1 text-xs font-medium">
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                      <span>{item.accuracy}% Accuracy</span>
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold text-foreground">
                    {item.topic}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {item.correct} correct of {item.attempted} attempted questions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <p className="text-xs text-muted-foreground">
                    Focus on solving more {item.topic}-based questions to build foundational confidence.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    render={<Link href={item.actionUrl} />} 
                    className="w-full justify-between"
                  >
                    <span>Practice Topic</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border border-border/80 shadow-sm bg-muted/20">
            <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-6">
              <div className="p-3 bg-primary/10 rounded-full text-primary shrink-0">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="space-y-1 text-center sm:text-left flex-1">
                <h3 className="text-base font-semibold text-foreground">
                  No Critical Weak Areas Detected
                </h3>
                <p className="text-sm text-muted-foreground">
                  You maintained 70% or higher accuracy across all attempted topics in this exam. Maintain your momentum with consistent practice.
                </p>
              </div>
              <Button 
                variant="outline" 
                render={<Link href="/practice" />}
                className="shrink-0"
              >
                Browse Practice Topics
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* SECTION E — WHAT SHOULD YOU PRACTICE NEXT? */}
      <section aria-labelledby="recommendations-heading" className="space-y-4">
        <div className="space-y-1">
          <h2 id="recommendations-heading" className="text-xl font-bold tracking-tight">
            What Should You Practice Next?
          </h2>
          <p className="text-sm text-muted-foreground">
            Your next steps are based on your recent performance.
          </p>
        </div>

        {recommendations.length > 0 && recommendations[0].id !== 'no-data' ? (
          <div className="grid gap-4 md:grid-cols-2">
            {recommendations.map((rec) => {
              const isCritical = rec.priority === 'CRITICAL';
              const isHigh = rec.priority === 'HIGH';
              const isStrength = rec.priority === 'MAINTAIN';

              const badgeLabel = isCritical 
                ? 'Priority Focus' 
                : isHigh 
                ? 'Focus Area' 
                : isStrength 
                ? 'Strength' 
                : 'Next Step';

              const badgeVariant = isCritical 
                ? 'destructive' as const
                : isHigh 
                ? 'outline' as const
                : isStrength 
                ? 'secondary' as const
                : 'outline' as const;

              return (
                <Card 
                  key={rec.id} 
                  className={`border shadow-sm flex flex-col justify-between ${
                    isCritical ? 'border-destructive/40 bg-destructive/5' : 'border-border/80'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge variant={badgeVariant} className="text-xs font-semibold gap-1">
                        {isCritical ? (
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        ) : isStrength ? (
                          <Sparkles className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <Target className="h-3 w-3" aria-hidden="true" />
                        )}
                        <span>{badgeLabel}</span>
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold text-foreground">
                      {rec.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                      {rec.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <Button 
                      render={<Link href={rec.actionUrl} />} 
                      className="w-full sm:w-auto gap-2"
                    >
                      <span>{rec.actionLabel}</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border border-border/80 shadow-sm bg-muted/20">
            <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-8 text-center sm:text-left">
              <div className="p-3 bg-muted rounded-full text-muted-foreground shrink-0">
                <BookOpen className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-base font-semibold text-foreground">
                  Keep Building Your Learning Profile
                </h3>
                <p className="text-sm text-muted-foreground">
                  Complete more practice sessions to unlock personalized recommendations.
                </p>
              </div>
              <Button render={<Link href="/exam" />} className="shrink-0">
                Take a Mock Exam
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* SECTION F — PERFORMANCE CONTEXT */}
      <section aria-labelledby="performance-context-heading" className="space-y-3">
        <h2 id="performance-context-heading" className="text-xl font-bold tracking-tight">
          Performance Context
        </h2>

        {previousAttempt ? (
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
                <CardTitle className="text-base font-bold">
                  Compared with Your Previous Attempt
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const diff = results.accuracy - previousAttempt.accuracy;
                let message = "";
                if (diff > 0) {
                  message = `Accuracy improved by ${diff} percentage points compared with your previous attempt.`;
                } else if (diff < 0) {
                  message = `Accuracy changed by ${diff} percentage points compared with your previous attempt.`;
                } else {
                  message = `Accuracy held steady at ${results.accuracy}% compared with your previous attempt.`;
                }

                return (
                  <>
                    <p className="text-sm text-foreground font-medium">{message}</p>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                      <div>
                        <span className="block font-medium">Previous Attempt Score:</span>
                        <span className="text-sm font-bold text-foreground">
                          {previousAttempt.correct} / {previousAttempt.totalQuestions} ({previousAttempt.accuracy}%)
                        </span>
                      </div>
                      <div>
                        <span className="block font-medium">Current Attempt Score:</span>
                        <span className="text-sm font-bold text-foreground">
                          {results.correct} / {results.totalQuestions} ({results.accuracy}%)
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-border/80 shadow-sm bg-muted/10">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <CardTitle className="text-base font-bold">
                  First Recorded Attempt
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Complete another exam to start tracking your progress over time. Your attempt has been saved for future trend comparisons.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* FINAL ACTION AREA */}
      <footer className="pt-6 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <Button 
          size="lg" 
          render={<Link href={primaryRecommendationUrl} />}
          className="gap-2 font-semibold"
        >
          <Target className="h-4 w-4" aria-hidden="true" />
          <span>{t('practiceRecommended')}</span>
        </Button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button 
            variant="outline" 
            size="lg" 
            render={<Link href="/dashboard" />}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{t('backToDashboard')}</span>
          </Button>

          <Button 
            variant="secondary" 
            size="lg" 
            render={<Link href="/exam" />}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>{t('takeAnotherMock')}</span>
          </Button>
        </div>
      </footer>

    </div>
  );
}
