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
  Award,
  AlertCircle,
  ShieldCheck,
} from "lucide-react"

import { AvailableExams } from "@/lib/mockData"
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
import {
  getCandidateDashboardAnalytics,
  CandidateDashboardAnalytics,
} from "@/lib/api/examRepository"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n"

function formatTimestamp(timestamp: string | number | null | undefined): string {
  if (!timestamp) return "Recent attempt"
  try {
    const d = new Date(timestamp)
    if (isNaN(d.getTime())) return "Recent attempt"
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
  const [analytics, setAnalytics] = useState<CandidateDashboardAnalytics | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const candidateName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Candidate"

  const loadAnalytics = React.useCallback(async () => {
    setIsLoaded(false)
    setFetchError(null)
    try {
      const data = await getCandidateDashboardAnalytics()
      setAnalytics(data)
      setIsLoaded(true)
    } catch (err: any) {
      console.warn("[DashboardPage] Analytics fetch error:", err)
      setFetchError(err?.message || "Failed to retrieve real-time candidate analytics")
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    loadAnalytics()
  }, [user?.id, loadAnalytics])

  const completedCount = analytics?.completedAttemptsCount ?? 0
  const hasHistory = completedCount > 0
  const averageScore = analytics?.averageScore ?? 0
  const averageAccuracy = analytics?.averageAccuracy ?? 0
  const bestScore = analytics?.bestScore ?? 0
  const totalQuestionsAttempted = analytics?.totalQuestionsAttempted ?? 0
  const subjectMetrics = analytics?.subjectMetrics ?? []
  const recentActivity = analytics?.recentActivity ?? []
  const recommendations = analytics?.recommendations ?? []
  const trend = analytics?.trend

  if (!isLoaded) {
    return (
      <div 
        className="flex-1 space-y-12 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full"
        role="status"
        aria-live="polite"
        aria-label="Loading candidate performance dashboard"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-border/40">
          <div className="space-y-2">
            <div className="h-9 w-64 bg-muted rounded animate-pulse" />
            <div className="h-5 w-80 bg-muted/60 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-11 w-36 bg-muted rounded animate-pulse" />
            <div className="h-11 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>

        {/* 4 KPI Skeletons */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl border border-border/60 bg-muted/20 animate-pulse p-5 space-y-3">
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-8 w-20 bg-muted rounded" />
              <div className="h-3 w-36 bg-muted/60 rounded" />
            </div>
          ))}
        </div>

        {/* Analytics Skeletons */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-72 rounded-xl border border-border/60 bg-muted/20 animate-pulse p-6" />
          <div className="h-72 rounded-xl border border-border/60 bg-muted/20 animate-pulse p-6" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-12 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
      {/* Error Banner if background fetch failed */}
      {fetchError && (
        <div 
          role="alert" 
          className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
            <span>{fetchError}. Showing cached performance overview.</span>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={loadAnalytics}
            className="shrink-0 border-destructive/40 hover:bg-destructive/10"
          >
            Retry Analytics
          </Button>
        </div>
      )}

      {/* SECTION A — Personalized Welcome */}
      <section
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-border/40"
        aria-labelledby="welcome-heading"
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              id="welcome-heading"
              className="text-3xl md:text-4xl font-bold tracking-tight text-foreground"
            >
              {t("welcomeBack")}, {candidateName}.
            </h1>
            <Badge
              variant="outline"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 flex items-center gap-1"
            >
              <ShieldCheck className="size-3" aria-hidden="true" />
              <span>Official Database Analytics</span>
            </Badge>
          </div>
          <p className="text-base md:text-lg text-muted-foreground">
            {t("dashboardSubtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            className="h-11 px-6 font-medium shadow-xs"
            render={<Link href="/practice" />}
            nativeButton={false}
          >
            <span>{t("continuePractice")}</span>
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
            <span>{t("accessibilitySettings")}</span>
          </Button>
        </div>
      </section>

      {/* SECTION B — Performance Snapshot */}
      <section aria-labelledby="performance-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="performance-heading"
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            {t("performanceSnapshot")}
          </h2>
          {hasHistory && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {completedCount} Official Attempt{completedCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {!isLoaded ? (
          <div className="p-8 text-center" role="status" aria-live="polite">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em]" />
            <p className="text-muted-foreground text-sm font-medium mt-3">
              Loading official performance data...
            </p>
          </div>
        ) : hasHistory ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Metric 1: Completed Attempts */}
            <Card className="border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("completedExams")}
                </CardTitle>
                <Clock className="size-4 text-primary" aria-hidden="true" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">
                  {completedCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Official completed examination sessions
                </p>
              </CardContent>
            </Card>

            {/* Metric 2: Average Score */}
            <Card className="border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Score
                </CardTitle>
                <Target className="size-4 text-primary" aria-hidden="true" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">
                  {averageScore}
                </div>
                <p className="text-xs text-muted-foreground">
                  Points per completed examination
                </p>
              </CardContent>
            </Card>

            {/* Metric 3: Average Accuracy */}
            <Card className="border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("averageAccuracy")}
                </CardTitle>
                <Trophy className="size-4 text-primary" aria-hidden="true" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">
                  {averageAccuracy}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {totalQuestionsAttempted} questions evaluated
                </p>
              </CardContent>
            </Card>

            {/* Metric 4: Best Score */}
            <Card className="border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Best Score
                </CardTitle>
                <Award className="size-4 text-primary" aria-hidden="true" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">
                  {bestScore}
                </div>
                <p className="text-xs text-muted-foreground">
                  Highest single examination score
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
              {t("firstAttemptPrompt")}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
              Complete an official practice set or mock examination to establish your baseline score, track accuracy, and unlock real performance analytics.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                render={<Link href="/exam" />}
                nativeButton={false}
                size="sm"
                className="font-medium"
              >
                {t("takeMockExam")}
              </Button>
              <Button
                render={<Link href="/practice" />}
                nativeButton={false}
                variant="outline"
                size="sm"
                className="font-medium"
              >
                <span>Explore Practice</span>
              </Button>
            </div>
          </Card>
        )}
      </section>

      {/* SECTION C — Real Subject-Wise Performance */}
      <section aria-labelledby="subject-performance-heading" className="space-y-4">
        <div className="space-y-1">
          <h2
            id="subject-performance-heading"
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            Subject Performance
          </h2>
          <p className="text-sm text-muted-foreground">
            Aggregated question resolution rate and accuracy across your official completed examination attempts.
          </p>
        </div>

        {hasHistory && subjectMetrics.length > 0 ? (
          <Card className="border border-border/80 shadow-xs">
            <CardContent className="p-0">
              <div
                className="overflow-x-auto focus-within:ring-1 focus-within:ring-ring"
                tabIndex={0}
                role="region"
                aria-label="Subject Performance Table"
              >
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                  <caption className="sr-only">
                    Subject performance summary showing total questions evaluated, attempted, correct, incorrect, accuracy, and status
                  </caption>
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                      <th scope="col" className="py-3 px-4 font-semibold">
                        Subject
                      </th>
                      <th scope="col" className="py-3 px-4 font-semibold text-center">
                        Total
                      </th>
                      <th scope="col" className="py-3 px-4 font-semibold text-center">
                        Attempted
                      </th>
                      <th scope="col" className="py-3 px-4 font-semibold text-center">
                        Correct
                      </th>
                      <th scope="col" className="py-3 px-4 font-semibold text-center">
                        Incorrect
                      </th>
                      <th scope="col" className="py-3 px-4 font-semibold w-48">
                        Accuracy
                      </th>
                      <th scope="col" className="py-3 px-4 font-semibold text-center">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {subjectMetrics.map((sm) => {
                      const getStatus = () => {
                        if (sm.attempted === 0) {
                          return {
                            label: "Not Attempted",
                            variant: "outline" as const,
                            icon: BookOpen,
                          }
                        }
                        if (sm.accuracy >= 80) {
                          return {
                            label: "Strong Area",
                            variant: "secondary" as const,
                            icon: CheckCircle2,
                          }
                        }
                        if (sm.accuracy >= 60) {
                          return {
                            label: "Progressing",
                            variant: "outline" as const,
                            icon: CheckCircle2,
                          }
                        }
                        return {
                          label: "Focus Area",
                          variant: "destructive" as const,
                          icon: AlertCircle,
                        }
                      }

                      const status = getStatus()
                      const StatusIcon = status.icon

                      return (
                        <tr
                          key={sm.subject}
                          className="hover:bg-muted/20 transition-colors"
                        >
                          <th
                            scope="row"
                            className="py-3.5 px-4 font-semibold text-foreground"
                          >
                            {sm.subject}
                          </th>
                          <td className="py-3.5 px-4 text-center text-muted-foreground">
                            {sm.totalQuestions}
                          </td>
                          <td className="py-3.5 px-4 text-center text-muted-foreground">
                            {sm.attempted}
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-foreground">
                            {sm.correct}
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-muted-foreground">
                            {sm.incorrect}
                          </td>
                          <td className="py-3.5 px-4 w-48">
                            <div className="flex items-center gap-3">
                              <span className="w-10 font-bold text-foreground text-sm">
                                {sm.accuracy}%
                              </span>
                              <div
                                className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden border border-border/50"
                                role="progressbar"
                                aria-valuenow={sm.accuracy}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${sm.subject} accuracy: ${sm.accuracy} percent`}
                              >
                                <div
                                  className="h-full bg-primary transition-all duration-300"
                                  style={{ width: `${sm.accuracy}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge
                              variant={status.variant}
                              className="gap-1 text-xs font-medium"
                            >
                              <StatusIcon className="h-3 w-3" aria-hidden="true" />
                              {status.label}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-dashed bg-muted/20 p-6 shadow-none text-center">
            <h3 className="text-base font-bold text-foreground mb-1">
              Complete an exam to see your subject-level performance
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Subject-wise question counts, accuracy percentages, and focus areas will automatically aggregate as you submit exams.
            </p>
            <Button
              render={<Link href="/practice" />}
              nativeButton={false}
              size="sm"
              variant="outline"
              className="font-medium"
            >
              Explore Practice Sets
            </Button>
          </Card>
        )}
      </section>

      {/* SECTION D — Data-Driven Focus Areas & Recommendations */}
      <section aria-labelledby="recommendations-heading" className="space-y-4">
        <div className="space-y-1">
          <h2
            id="recommendations-heading"
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            {t("recommendedForYou")}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("practiceNextDesc")}
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
                  ) : rec.priority === "MAINTAIN" ? (
                    <CheckCircle2 className="size-3.5 text-primary" aria-hidden="true" />
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

      {/* SECTION E — Progress / Learning Trend */}
      <section aria-labelledby="trend-heading" className="space-y-4">
        <h2
          id="trend-heading"
          className="text-2xl font-bold tracking-tight text-foreground"
        >
          Learning Trend
        </h2>

        {trend?.hasTrend && trend.trendDiff !== null && trend.latestAttempt && trend.previousAttempt ? (
          <Card className="border shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-lg",
                    trend.trendDiff >= 0
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {trend.trendDiff >= 0 ? (
                    <TrendingUp className="size-5" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="size-5" aria-hidden="true" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {trend.trendDiff > 0
                      ? `Accuracy improved by ${trend.trendDiff} percentage points`
                      : trend.trendDiff < 0
                      ? `Accuracy decreased by ${Math.abs(trend.trendDiff)} percentage points`
                      : "Accuracy remained steady"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Compared across your last two completed examination attempts.
                  </p>
                </div>
              </div>
              <Badge
                variant={trend.trendDiff >= 0 ? "default" : "secondary"}
                className="self-start sm:self-auto text-sm px-3 py-1"
              >
                {trend.trendDiff >= 0 ? `+${trend.trendDiff}%` : `${trend.trendDiff}%`}
              </Badge>
            </div>

            {/* Semantic comparison breakdown */}
            <div
              className="space-y-3"
              role="region"
              aria-label="Attempt comparison details"
            >
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Attempt Comparison
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted/40 border space-y-1">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground truncate max-w-[180px]">
                      {trend.latestAttempt.examTitle}
                    </span>
                    <span>{formatTimestamp(trend.latestAttempt.submittedAt)}</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {trend.latestAttempt.accuracy}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Score: {trend.latestAttempt.score} / {trend.latestAttempt.totalQuestions} ({trend.latestAttempt.correctCount} correct)
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/20 border space-y-1">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground truncate max-w-[180px]">
                      {trend.previousAttempt.examTitle}
                    </span>
                    <span>{formatTimestamp(trend.previousAttempt.submittedAt)}</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {trend.previousAttempt.accuracy}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Score: {trend.previousAttempt.score} / {trend.previousAttempt.totalQuestions} ({trend.previousAttempt.correctCount} correct)
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ) : completedCount === 1 && recentActivity.length > 0 ? (
          <Card className="border p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CheckCircle2 className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  First Attempt Recorded: {recentActivity[0].accuracy}% Accuracy
                </h3>
                <p className="text-sm text-muted-foreground">
                  {recentActivity[0].examTitle} ({recentActivity[0].score}/{recentActivity[0].totalQuestions} marks)
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pt-1">
              Complete one more examination attempt to unlock longitudinal progress trends, score comparisons, and recurring topic detection.
            </p>
          </Card>
        ) : (
          <Card className="border border-dashed bg-muted/20 p-6 shadow-none text-center">
            <h3 className="text-base font-bold text-foreground mb-1">
              No exam attempts recorded yet
            </h3>
            <p className="text-sm text-muted-foreground">
              Trend analytics will automatically display here once you complete at least two examination attempts.
            </p>
          </Card>
        )}
      </section>

      {/* SECTION F — Available Mock Exams */}
      <section aria-labelledby="mock-exams-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2
              id="mock-exams-heading"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              {t("takeMockExam")}
            </h2>
            <p className="text-sm text-muted-foreground">
              Full-length accessible simulations designed for competitive exam readiness.
            </p>
          </div>
          <Button
            variant="ghost"
            render={<Link href="/exam" />}
            nativeButton={false}
            className="hidden sm:inline-flex"
          >
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

      {/* SECTION G — Recent Activity (Official Completed Attempts) */}
      <section aria-labelledby="activity-heading" className="space-y-4">
        <div className="space-y-1">
          <h2
            id="activity-heading"
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            Recent Activity
          </h2>
          <p className="text-sm text-muted-foreground">
            Your official completed examination attempts and permanent server-graded scores.
          </p>
        </div>

        {hasHistory && recentActivity.length > 0 ? (
          <Card className="border shadow-xs overflow-hidden">
            <div className="divide-y divide-border" role="list">
              {recentActivity.map((attempt, index) => (
                <div
                  key={attempt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 hover:bg-muted/40 transition-colors"
                  role="listitem"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">
                        {attempt.examTitle}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        Attempt #{completedCount - index}
                      </Badge>
                      {attempt.subject && (
                        <Badge variant="secondary" className="text-2xs font-normal">
                          {attempt.subject}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {formatTimestamp(attempt.submittedAt)} • Evaluated across {attempt.totalQuestions} questions
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-left sm:text-right">
                      <div className="text-sm font-bold text-foreground">
                        {attempt.score} / {attempt.totalQuestions} marks
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {attempt.accuracy}% accuracy
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/results?attemptId=${attempt.id}`} />}
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
              No completed exams yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
              Complete your first practice session to start building your verified learning history.
            </p>
            <Button
              render={<Link href="/exam" />}
              nativeButton={false}
              size="sm"
              className="font-medium"
            >
              Start Practicing
            </Button>
          </Card>
        )}
      </section>
    </div>
  )
}
