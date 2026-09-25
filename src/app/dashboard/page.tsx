"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Clock,
  PlayCircle,
  Trophy,
  Target,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Sliders,
  Sparkles,
  CheckCircle2,
} from "lucide-react"

import { AvailableExams, UserProfile } from "@/lib/mockData"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { Recommendation, PerformanceProfile } from "@/lib/personalization/types"
import { getPerformanceHistory } from "@/lib/personalization/history"
import { generateRecommendations } from "@/lib/personalization/engine"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n"

function formatTimestamp(timestamp: number): string {
  try {
    const d = new Date(timestamp)
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "Recent attempt"
  }
}

export default function DashboardPage() {
  const [history, setHistory] = useState<PerformanceProfile[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const candidateName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Candidate'

  useEffect(() => {
    const storedHistory = getPerformanceHistory()
    setHistory(storedHistory)
    const profile = storedHistory.length > 0 ? storedHistory[0] : null
    const recs = generateRecommendations(profile, storedHistory.slice(1))
    setRecommendations(recs)
    setIsLoaded(true)
  }, [])

  // Derived real performance metrics
  const hasHistory = history.length > 0
  const latestProfile = hasHistory ? history[0] : null
  const previousProfile = history.length > 1 ? history[1] : null
  const examsCompleted = history.length
  const totalQuestionsAttempted = history.reduce((sum, h) => sum + h.attempted, 0)
  const averageAccuracy = hasHistory
    ? Math.round(history.reduce((sum, h) => sum + h.accuracy, 0) / history.length)
    : 0
  const latestAccuracy = latestProfile ? latestProfile.accuracy : 0
  const trendDiff =
    hasHistory && previousProfile ? latestAccuracy - previousProfile.accuracy : null

  return (
    <div className="flex-1 space-y-12 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
      {/* SECTION A — Personalized Welcome */}
      <section
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-border/40"
        aria-labelledby="welcome-heading"
      >
        <div className="space-y-1.5">
          <h1
            id="welcome-heading"
            className="text-3xl md:text-4xl font-bold tracking-tight text-foreground"
          >
            {t('welcomeBack')}, {candidateName}.
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            {t('dashboardSubtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            className="h-11 px-6 font-medium shadow-xs"
            render={<Link href="/practice" />}
            nativeButton={false}
          >
            <span>{t('continuePractice')}</span>
            <ArrowRight className="ml-2 size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-11 px-5 font-medium gap-2 border-border"
            render={<Link href="/settings" />}
            nativeButton={false}
          >
            <Sliders className="size-4" aria-hidden="true" />
            <span>{t('accessibilitySettings')}</span>
          </Button>
        </div>
      </section>

      {/* SECTION B — Performance Snapshot */}
      <section aria-labelledby="performance-heading" className="space-y-4">
        <h2
          id="performance-heading"
          className="text-2xl font-bold tracking-tight text-foreground"
        >
          {t('performanceSnapshot')}
        </h2>

        {hasHistory ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Metric 1: Latest Exam Accuracy */}
            <Card className="border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('latestScore')}
                </CardTitle>
                <Target className="size-4 text-primary" aria-hidden="true" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">
                  {latestAccuracy}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {latestProfile?.correct} of {latestProfile?.attempted} correct in last attempt
                </p>
              </CardContent>
            </Card>

            {/* Metric 2: Average Accuracy */}
            <Card className="border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('averageAccuracy')}
                </CardTitle>
                <Trophy className="size-4 text-primary" aria-hidden="true" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">
                  {averageAccuracy}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {examsCompleted} recorded attempt{examsCompleted > 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            {/* Metric 3: Total Questions Attempted */}
            <Card className="border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('totalAttempted')}
                </CardTitle>
                <BookOpen className="size-4 text-primary" aria-hidden="true" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">
                  {totalQuestionsAttempted}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total questions evaluated
                </p>
              </CardContent>
            </Card>

            {/* Metric 4: Total Exams Completed */}
            <Card className="border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('completedExams')}
                </CardTitle>
                <Clock className="size-4 text-primary" aria-hidden="true" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">
                  {examsCompleted}
                </div>
                <p className="text-xs text-muted-foreground">
                  Full examination sessions
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Empty State for Performance Snapshot */
          <Card className="border border-dashed bg-muted/20 p-8 text-center shadow-none">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
              <Target className="size-6" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">
              {t('firstAttemptPrompt')}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
              {t('dashboardSubtitle')}
            </p>
            <Button render={<Link href="/exam" />} nativeButton={false} size="sm" className="font-medium">
              {t('takeMockExam')}
            </Button>
          </Card>
        )}
      </section>

      {/* SECTION C — Personalized Learning */}
      <section aria-labelledby="recommendations-heading" className="space-y-4">
        <div className="space-y-1">
          <h2
            id="recommendations-heading"
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            {t('recommendedForYou')}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            {t('practiceNextDesc')}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {recommendations.map((rec) => (
            <Card
              key={rec.id}
              className={cn(
                "border transition-all flex flex-col justify-between focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20",
                rec.priority === "CRITICAL"
                  ? "border-primary/40 bg-primary/5 shadow-xs"
                  : "border-border shadow-xs"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {rec.priority === "CRITICAL" || rec.priority === "HIGH" ? (
                    <AlertTriangle className="size-3.5 text-primary" aria-hidden="true" />
                  ) : (
                    <Target className="size-3.5 text-primary" aria-hidden="true" />
                  )}
                  <span>
                    {rec.id === "no-data"
                      ? "Getting Started"
                      : rec.priority === "MAINTAIN"
                      ? "Strength"
                      : "Focus Area"}
                  </span>
                </div>
                <CardTitle className="text-lg md:text-xl font-bold text-foreground">
                  {rec.title}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed mt-1">
                  {rec.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Button
                  render={<Link href={rec.actionUrl} />}
                  nativeButton={false}
                  size="sm"
                  variant={rec.priority === "CRITICAL" ? "default" : "outline"}
                  className="w-full sm:w-auto font-medium"
                >
                  <span>{rec.actionLabel}</span>
                  <ArrowRight className="size-4 ml-1.5" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* SECTION D — Progress / Learning Trend */}
      <section aria-labelledby="trend-heading" className="space-y-4">
        <h2
          id="trend-heading"
          className="text-2xl font-bold tracking-tight text-foreground"
        >
          Learning Trend
        </h2>

        {history.length >= 2 && trendDiff !== null ? (
          <Card className="border shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-lg",
                    trendDiff >= 0
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {trendDiff >= 0 ? (
                    <TrendingUp className="size-5" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="size-5" aria-hidden="true" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {trendDiff > 0
                      ? `Accuracy improved by ${trendDiff} percentage points`
                      : trendDiff < 0
                      ? `Accuracy decreased by ${Math.abs(trendDiff)} percentage points`
                      : "Accuracy remained steady"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Compared across your last two completed examination attempts.
                  </p>
                </div>
              </div>
              <Badge variant={trendDiff >= 0 ? "default" : "secondary"} className="self-start sm:self-auto text-sm px-3 py-1">
                {trendDiff >= 0 ? `+${trendDiff}%` : `${trendDiff}%`}
              </Badge>
            </div>

            {/* Semantic comparison breakdown */}
            <div className="space-y-3" role="region" aria-label="Attempt comparison details">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider text-xs">
                Attempt Comparison
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted/40 border space-y-1">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Latest Attempt</span>
                    <span>{formatTimestamp(latestProfile!.timestamp)}</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {latestProfile!.accuracy}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {latestProfile!.correct} / {latestProfile!.totalQuestions} questions correct
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/20 border space-y-1">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Previous Attempt</span>
                    <span>{formatTimestamp(previousProfile!.timestamp)}</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {previousProfile!.accuracy}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {previousProfile!.correct} / {previousProfile!.totalQuestions} questions correct
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ) : history.length === 1 ? (
          <Card className="border p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CheckCircle2 className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  First Attempt Recorded: {latestAccuracy}% Accuracy
                </h3>
                <p className="text-sm text-muted-foreground">
                  Keep practicing to unlock your performance trend.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pt-1">
              Complete one more examination attempt to enable longitudinal tracking, progress trend lines, and recurring topic weakness detection.
            </p>
          </Card>
        ) : (
          <Card className="border border-dashed bg-muted/20 p-6 shadow-none text-center">
            <h3 className="text-base font-bold text-foreground mb-1">
              Keep practicing to unlock your performance trend.
            </h3>
            <p className="text-sm text-muted-foreground">
              Trend analytics will automatically display here once you complete at least two examination attempts.
            </p>
          </Card>
        )}
      </section>

      {/* SECTION E — Available Mock Exams */}
      <section aria-labelledby="mock-exams-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2
              id="mock-exams-heading"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              {t('takeMockExam')}
            </h2>
            <p className="text-sm text-muted-foreground">
              Full-length accessible simulations designed for competitive exam readiness.
            </p>
          </div>
          <Button variant="ghost" render={<Link href="/exam" />} nativeButton={false} className="hidden sm:inline-flex">
            <span>View All</span>
            <ArrowRight className="ml-2 size-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {AvailableExams.map((exam) => (
            <Card
              key={exam.id}
              className="flex flex-col justify-between border hover:border-primary/50 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-colors shadow-xs"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {exam.difficulty}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {exam.subject}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold text-foreground">
                  {exam.title}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {exam.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="py-2">
                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="size-3.5" aria-hidden="true" />
                    <span>{exam.questions} Questions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5" aria-hidden="true" />
                    <span>{exam.duration} mins</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-3">
                <Button
                  className="w-full font-medium"
                  render={<Link href={`/exam?exam=${exam.id}`} />}
                  nativeButton={false}
                >
                  <PlayCircle className="mr-2 size-4" aria-hidden="true" />
                  <span>Start Exam</span>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* SECTION F — Recent Activity */}
      <section aria-labelledby="activity-heading" className="space-y-4">
        <div className="space-y-1">
          <h2
            id="activity-heading"
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            Recent Activity
          </h2>
          <p className="text-sm text-muted-foreground">
            Your recent exam submissions and evaluated practice history.
          </p>
        </div>

        {hasHistory ? (
          <Card className="border shadow-xs overflow-hidden">
            <div className="divide-y divide-border" role="list">
              {history.slice(0, 5).map((attempt, index) => (
                <div
                  key={attempt.examId || index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 hover:bg-muted/40 transition-colors"
                  role="listitem"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">
                        SSC CGL Tier 1 Mock Test
                      </p>
                      <Badge variant="outline" className="text-xs">
                        Attempt #{history.length - index}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {formatTimestamp(attempt.timestamp)} • Evaluated across {attempt.totalQuestions} questions
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-left sm:text-right">
                      <div className="text-sm font-bold text-foreground">
                        {attempt.correct} / {attempt.totalQuestions}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {attempt.accuracy}% accuracy
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href="/results" />}
                      nativeButton={false}
                      className="font-medium text-xs h-8 px-3"
                    >
                      View Results
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="border border-dashed bg-muted/20 p-8 text-center shadow-none">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-4">
              <Clock className="size-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold mb-1 text-foreground">
              No activity yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
              Complete your first practice session to start building your learning history.
            </p>
            <Button render={<Link href="/exam" />} nativeButton={false} size="sm" className="font-medium">
              Start Practicing
            </Button>
          </Card>
        )}
      </section>
    </div>
  )
}
