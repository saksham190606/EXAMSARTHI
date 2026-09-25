"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  BookOpen,
  Clock,
  PlayCircle,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  X,
  SlidersHorizontal,
} from "lucide-react"

import { PracticeSets } from "@/lib/mockData"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Recommendation } from "@/lib/personalization/types"
import { getPerformanceHistory } from "@/lib/personalization/history"
import { generateRecommendations } from "@/lib/personalization/engine"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n"

const SUBJECT_CATEGORIES = [
  { id: "all", label: "All Subjects" },
  { id: "quant", label: "Quantitative Aptitude" },
  { id: "reasoning", label: "Reasoning" },
  { id: "english", label: "English" },
  { id: "gk", label: "General Knowledge" },
  { id: "showcase", label: "Multi-Format Showcase" },
]

function getSubjectDisplayName(slug: string): string {
  const found = SUBJECT_CATEGORIES.find((s) => s.id === slug)
  return found ? found.label : slug
}

function PracticeContent() {
  const searchParams = useSearchParams()
  const { t } = useTranslation()

  const urlSubject = searchParams?.get("subject") || "all"
  const urlTopic = searchParams?.get("topic") || ""
  const urlDifficulty = searchParams?.get("difficulty") || "all"

  const [searchQuery, setSearchQuery] = React.useState(urlTopic.replace(/-/g, " "))
  const [subjectFilter, setSubjectFilter] = React.useState(urlSubject)
  const [difficultyFilter, setDifficultyFilter] = React.useState(urlDifficulty)

  const [topRecommendation, setTopRecommendation] = React.useState<Recommendation | null>(null)
  const [hasExamHistory, setHasExamHistory] = React.useState(false)

  // Keep state synchronized with URL search params (e.g. from recommendation clicks)
  React.useEffect(() => {
    const s = searchParams?.get("subject") || "all"
    const t = searchParams?.get("topic") || ""
    const d = searchParams?.get("difficulty") || "all"

    setSubjectFilter(s)
    if (t) {
      setSearchQuery(t.replace(/-/g, " "))
    }
    if (d) {
      setDifficultyFilter(d)
    }
  }, [searchParams])

  // Load real personalization engine data
  React.useEffect(() => {
    const history = getPerformanceHistory()
    setHasExamHistory(history.length > 0)
    if (history.length > 0) {
      const recs = generateRecommendations(history[0], history.slice(1))
      const actionable =
        recs.find((r) => r.id !== "no-data" && r.id !== "balanced-perf") || recs[0]
      if (actionable && actionable.id !== "no-data") {
        setTopRecommendation(actionable)
      }
    }
  }, [])

  // Filter practice sets based on search, subject, and difficulty
  const filteredSets = PracticeSets.filter((set) => {
    const query = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !query ||
      set.title.toLowerCase().includes(query) ||
      set.subject.toLowerCase().includes(query) ||
      set.description.toLowerCase().includes(query)

    const subjectMap: Record<string, string> = {
      quant: "quant",
      gk: "general",
      reasoning: "reason",
      english: "english",
      showcase: "multi",
    }
    const target = subjectMap[subjectFilter] || subjectFilter
    const matchesSubject =
      subjectFilter === "all" || set.subject.toLowerCase().includes(target.toLowerCase())

    const matchesDifficulty =
      difficultyFilter === "all" ||
      set.difficulty.toLowerCase() === difficultyFilter.toLowerCase()

    return matchesSearch && matchesSubject && matchesDifficulty
  })

  const hasActiveFilters =
    searchQuery.trim() !== "" || subjectFilter !== "all" || difficultyFilter !== "all"

  const handleClearAllFilters = () => {
    setSearchQuery("")
    setSubjectFilter("all")
    setDifficultyFilter("all")
  }

  return (
    <div className="flex-1 space-y-10 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
      {/* SECTION A — Practice Header */}
      <section
        aria-labelledby="practice-heading"
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-border/40"
      >
        <div className="space-y-1.5">
          <h1
            id="practice-heading"
            className="text-3xl md:text-4xl font-bold tracking-tight text-foreground"
          >
            {t('practiceTitle')}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-3xl">
            {t('practiceSubtitle')}
          </p>
        </div>
        <div className="flex-shrink-0">
          <Button
            size="lg"
            className="h-11 px-6 font-medium shadow-xs"
            render={<Link href="/exam" />}
            nativeButton={false}
          >
            <span>{t('takeMockExam')}</span>
            <ArrowRight className="ml-2 size-4" aria-hidden="true" />
          </Button>
        </div>
      </section>

      {/* SECTION B — Personalized Focus */}
      <section aria-labelledby="personalized-focus-heading">
        <h2 id="personalized-focus-heading" className="sr-only">
          Personalized Practice Recommendation
        </h2>
        {topRecommendation ? (
          <Card className="border-primary/40 bg-primary/5 p-5 md:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  <span>Recommended for you · Based on recent performance</span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground">
                  {topRecommendation.title}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
                  {topRecommendation.description}
                </p>
              </div>
              <div className="flex-shrink-0">
                <Button
                  className="font-medium h-10 px-5 shadow-xs"
                  render={<Link href={topRecommendation.actionUrl} />}
                  nativeButton={false}
                >
                  <span>{topRecommendation.actionLabel}</span>
                  <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="border border-border bg-muted/20 p-5 md:p-6 shadow-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  <span>Personalized Preparation</span>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-foreground">
                  Start building your learning profile
                </h3>
                <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  Complete a practice session or mock exam to unlock personalized topic recommendations tailored to your performance.
                </p>
              </div>
              <div className="flex-shrink-0">
                <Button
                  variant="outline"
                  className="font-medium h-10 px-5 border-border"
                  render={<Link href="/exam" />}
                  nativeButton={false}
                >
                  <span>Start Practicing</span>
                  <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </Card>
        )}
      </section>

      {/* SECTION C — Search, Filters, and Discovery */}
      <section
        aria-labelledby="filters-heading"
        className="bg-card border rounded-2xl p-5 md:p-7 shadow-xs space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-5 text-primary" aria-hidden="true" />
            <h2 id="filters-heading" className="text-xl font-bold text-foreground">
              Filter Practice Sets
            </h2>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAllFilters}
              className="text-xs font-medium text-muted-foreground hover:text-foreground h-8 px-2.5"
            >
              {t('clearFilters')}
            </Button>
          )}
        </div>

        {/* Search & Select Row */}
        <div className="grid gap-4 md:grid-cols-12">
          {/* Search Input */}
          <div className="md:col-span-6 space-y-1.5">
            <Label htmlFor="search-practice" className="text-sm font-medium">
              {t('searchPlaceholder')}
            </Label>
            <div className="relative">
              <Search
                className="absolute left-3.5 top-3 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="search-practice"
                placeholder={t('searchPlaceholder')}
                className="pl-10 h-10 text-base border-border bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:outline-none rounded"
                  aria-label="Clear search input"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Subject Dropdown */}
          <div className="md:col-span-3 space-y-1.5">
            <Label htmlFor="filter-subject" className="text-sm font-medium">
              Subject
            </Label>
            <Select
              value={subjectFilter}
              onValueChange={(val) => setSubjectFilter(val || "all")}
            >
              <SelectTrigger id="filter-subject" className="h-10 text-sm border-border bg-background">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Difficulty Dropdown */}
          <div className="md:col-span-3 space-y-1.5">
            <Label htmlFor="filter-difficulty" className="text-sm font-medium">
              Difficulty
            </Label>
            <Select
              value={difficultyFilter}
              onValueChange={(val) => setDifficultyFilter(val || "all")}
            >
              <SelectTrigger id="filter-difficulty" className="h-10 text-sm border-border bg-background">
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Subject Discovery Category Chips */}
        <div className="pt-2 border-t border-border/40 space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Quick Subject Select
          </span>
          <div
            className="flex flex-wrap items-center gap-2"
            role="toolbar"
            aria-label="Subject filter options"
          >
            {SUBJECT_CATEGORIES.map((cat) => {
              const isSelected = subjectFilter === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSubjectFilter(cat.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors border outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background text-foreground border-border hover:bg-muted/60"
                  )}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {hasActiveFilters && (
          <div
            className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40"
            role="region"
            aria-label="Active filters"
          >
            <span className="text-xs font-medium text-muted-foreground mr-1">
              Active Filters:
            </span>

            {subjectFilter !== "all" && (
              <Badge
                variant="secondary"
                className="gap-1.5 py-1 px-2.5 text-xs font-medium border border-border"
              >
                <span>Subject: {getSubjectDisplayName(subjectFilter)}</span>
                <button
                  type="button"
                  onClick={() => setSubjectFilter("all")}
                  aria-label={`Remove ${getSubjectDisplayName(subjectFilter)} filter`}
                  className="hover:text-foreground text-muted-foreground focus-visible:ring-1 focus-visible:outline-none rounded"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </Badge>
            )}

            {searchQuery.trim() !== "" && (
              <Badge
                variant="secondary"
                className="gap-1.5 py-1 px-2.5 text-xs font-medium border border-border"
              >
                <span>Topic: &quot;{searchQuery}&quot;</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Remove topic search filter"
                  className="hover:text-foreground text-muted-foreground focus-visible:ring-1 focus-visible:outline-none rounded"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </Badge>
            )}

            {difficultyFilter !== "all" && (
              <Badge
                variant="secondary"
                className="gap-1.5 py-1 px-2.5 text-xs font-medium border border-border capitalize"
              >
                <span>Difficulty: {difficultyFilter}</span>
                <button
                  type="button"
                  onClick={() => setDifficultyFilter("all")}
                  aria-label={`Remove ${difficultyFilter} difficulty filter`}
                  className="hover:text-foreground text-muted-foreground focus-visible:ring-1 focus-visible:outline-none rounded"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </section>

      {/* SECTION D — Filtered Results Header & Practice Cards Grid */}
      <section aria-labelledby="practice-results-heading" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-4">
          <div>
            <h2
              id="practice-results-heading"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              {subjectFilter !== "all"
                ? `${getSubjectDisplayName(subjectFilter)} Practice`
                : "Available Practice Sets"}
            </h2>
            <p
              className="text-sm text-muted-foreground mt-0.5"
              aria-live="polite"
            >
              {filteredSets.length} practice {filteredSets.length === 1 ? "set" : "sets"} available
            </p>
          </div>
        </div>

        {filteredSets.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredSets.map((practice) => (
              <Card
                key={practice.id}
                className="flex flex-col justify-between border border-border bg-card hover:border-primary/50 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-xs"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <Badge variant="outline" className="text-xs font-medium">
                      {practice.difficulty}
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {practice.subject}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold text-foreground">
                    {practice.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground leading-relaxed mt-1">
                    {practice.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-2 flex-1">
                  <div className="flex items-center gap-6 text-xs sm:text-sm font-medium text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/40">
                    <div className="flex items-center gap-2">
                      <BookOpen className="size-4 text-primary" aria-hidden="true" />
                      <span>{practice.questions} Questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-primary" aria-hidden="true" />
                      <span>{practice.duration} Mins</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-3">
                  <Button
                    className="w-full h-11 text-base font-medium shadow-xs"
                    render={<Link href={`/exam?set=${practice.id}`} />}
                    nativeButton={false}
                  >
                    <PlayCircle className="mr-2 size-5" aria-hidden="true" />
                    <span>{t('startPractice')}</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border border-dashed bg-muted/20 p-12 text-center shadow-none">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-4">
              <Filter className="size-6" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">
              {t('noPracticeFound')}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
              {t('noPracticeFoundDesc')}
            </p>
            <Button
              variant="outline"
              onClick={handleClearAllFilters}
              className="font-medium border-border"
            >
              {t('clearFilters')}
            </Button>
          </Card>
        )}
      </section>
    </div>
  )
}

export default function PracticePage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-12 text-center text-muted-foreground font-medium">
          Loading practice sets...
        </div>
      }
    >
      <PracticeContent />
    </React.Suspense>
  )
}
