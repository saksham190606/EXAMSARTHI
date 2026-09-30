"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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

import { useVoiceEngine, speakText } from "@/lib/voice/useVoiceEngine"
import { registerVoiceContext, routeVoiceCommand, unregisterVoiceContext } from "@/lib/voice/commandRouter"
import { useAccessibilityStore } from "@/store/useAccessibilityStore"

import { PracticeSets } from "@/lib/mockData"
import { matchExamTokens, matchExamVoiceRoute } from "@/lib/voice/exam-router"
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
import { getCandidateDashboardAnalytics } from "@/lib/api/examRepository"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n"

const SUBJECT_CATEGORIES = [
  { id: "all", label: "All Subjects" },
  { id: "quant", label: "Quantitative Aptitude" },
  { id: "reasoning", label: "Logical Reasoning" },
  { id: "english", label: "English" },
  { id: "gk", label: "General Knowledge" },
  { id: "diagrams", label: "Diagram & Visual" },
  { id: "showcase", label: "Multi-Format Showcase" },
]

function getSubjectDisplayName(slug: string): string {
  const found = SUBJECT_CATEGORIES.find(
    (s) => s.id === slug || s.label.toLowerCase() === slug.toLowerCase()
  )
  return found ? found.label : slug
}

function PracticeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const language = useAccessibilityStore((s) => s.language)
  const isHindi = language === 'hi'

  const urlSubject = searchParams?.get("subject") || "all"
  const urlTopic = searchParams?.get("topic") || ""
  const urlDifficulty = searchParams?.get("difficulty") || "all"

  const [searchQuery, setSearchQuery] = React.useState(urlTopic.replace(/-/g, " "))
  const [topicFilter, setTopicFilter] = React.useState(urlTopic.replace(/-/g, " "))
  const [subjectFilter, setSubjectFilter] = React.useState(urlSubject)
  const [difficultyFilter, setDifficultyFilter] = React.useState(urlDifficulty)

  const [topRecommendation, setTopRecommendation] = React.useState<Recommendation | null>(null)
  const [hasExamHistory, setHasExamHistory] = React.useState(false)
  const [loadingAnalytics, setLoadingAnalytics] = React.useState(true)
  const [analyticsError, setAnalyticsError] = React.useState<string | null>(null)

  // 1. Reset Child Filters on Subject Change
  const handleSubjectSelect = React.useCallback((newSubject: string) => {
    const foundCat = SUBJECT_CATEGORIES.find(
      (c) => c.label.toLowerCase() === newSubject.toLowerCase() || c.id === newSubject.toLowerCase()
    )
    const resolvedId = foundCat ? foundCat.id : newSubject
    setSubjectFilter(resolvedId)
    // Force clear incompatible child filters
    setTopicFilter("") 
    setSearchQuery("")
  }, [])

  const triggerPracticeLaunch = React.useCallback((setId: string) => {
    const targetId = setId === 'gk-geography' ? 'p2' : setId
    router.push(`/exam?set=${targetId}`)
  }, [router])

  // Keep state synchronized with URL search params (e.g. from recommendation clicks)
  React.useEffect(() => {
    const s = searchParams?.get("subject") || "all"
    const t = searchParams?.get("topic") || ""
    const d = searchParams?.get("difficulty") || "all"

    setSubjectFilter(s)
    setTopicFilter(t ? t.replace(/-/g, " ") : "")
    if (t) {
      setSearchQuery(t.replace(/-/g, " "))
    }
    if (d) {
      setDifficultyFilter(d)
    }
  }, [searchParams])

  // Load real personalization engine data from official database analytics
  const fetchAnalytics = React.useCallback(() => {
    let isMounted = true
    setLoadingAnalytics(true)
    setAnalyticsError(null)

    getCandidateDashboardAnalytics()
      .then((analytics) => {
        if (!isMounted) return
        const hasHistory = analytics.completedAttemptsCount > 0
        setHasExamHistory(hasHistory)
        if (analytics.recommendations.length > 0) {
          const actionable =
            analytics.recommendations.find(
              (r) => r.id !== "no-data" && r.id !== "balanced-perf"
            ) || analytics.recommendations[0]
          if (actionable && actionable.id !== "no-data") {
            setTopRecommendation(actionable as any)
          }
        }
        setLoadingAnalytics(false)
      })
      .catch((err) => {
        console.warn("[PracticePage] Failed to fetch analytics:", err)
        if (isMounted) {
          setAnalyticsError(err?.message || "Could not load personalized recommendations")
          setLoadingAnalytics(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  React.useEffect(() => {
    const cleanup = fetchAnalytics()

    const handleUpdate = () => {
      fetchAnalytics()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('examsarthi_performance_updated', handleUpdate)
      window.addEventListener('focus', handleUpdate)
    }

    return () => {
      cleanup?.()
      if (typeof window !== 'undefined') {
        window.removeEventListener('examsarthi_performance_updated', handleUpdate)
        window.removeEventListener('focus', handleUpdate)
      }
    }
  }, [fetchAnalytics])

  // 2. Safe Fallback in the Filtering Logic:
  // Ensure the data filtering function is safely checking for exact matches and handles case insensitivity
  const filteredSets = PracticeSets.filter((set) => {
    const subjectMap: Record<string, string> = {
      quant: "Quantitative Aptitude",
      gk: "General Knowledge",
      reasoning: "Logical Reasoning",
      english: "English",
      diagrams: "Diagram & Visual",
      showcase: "Multi-Format Showcase",
    }
    const resolvedSubject = subjectMap[subjectFilter] || subjectFilter

    const matchSubject =
      subjectFilter === "all" ||
      subjectFilter === "All Subjects" ||
      set.subject === subjectFilter ||
      set.subject.toLowerCase() === subjectFilter.toLowerCase() ||
      set.subject.toLowerCase() === resolvedSubject.toLowerCase() ||
      set.subject.toLowerCase().includes(subjectFilter.toLowerCase()) ||
      resolvedSubject.toLowerCase().includes(set.subject.toLowerCase())

    const currentTopic = topicFilter.toLowerCase().trim()
    const setTopic = ((set as any).topic || set.title || "").toLowerCase()
    const matchTopic =
      !topicFilter ||
      !currentTopic ||
      setTopic === currentTopic ||
      setTopic.includes(currentTopic) ||
      (Boolean((set as any).topic) && (set as any).topic.toLowerCase() === currentTopic)

    const query = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !query ||
      set.title.toLowerCase().includes(query) ||
      set.subject.toLowerCase().includes(query) ||
      set.description.toLowerCase().includes(query) ||
      setTopic.includes(query)

    const matchesDifficulty =
      difficultyFilter === "all" ||
      set.difficulty.toLowerCase() === difficultyFilter.toLowerCase()

    return matchSubject && matchTopic && matchesSearch && matchesDifficulty
  })

  const hasActiveFilters =
    Boolean(searchQuery && searchQuery.trim() !== "") ||
    Boolean(topicFilter && topicFilter.trim() !== "") ||
    (subjectFilter !== "all" && subjectFilter !== "All Subjects") ||
    difficultyFilter !== "all"

  const handleClearAllFilters = () => {
    setSearchQuery("")
    setTopicFilter("")
    setSubjectFilter("all")
    setDifficultyFilter("all")
  }

  // Ref to access live filteredSets in voice callbacks without stale closures
  const filteredSetsRef = React.useRef(filteredSets)
  React.useEffect(() => {
    filteredSetsRef.current = filteredSets
  }, [filteredSets])

  // 3. Implementation Logic (with Debounce & Mutex Guard)
  const lastCommandTimeRef = React.useRef(0)

  const handlePracticeVoiceCommand = React.useCallback((rawTranscript: string) => {
    if (typeof window !== 'undefined' && (window as any).isSystemSpeaking) return

    const now = Date.now()
    if (now - lastCommandTimeRef.current < 1500) return

    const text = rawTranscript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ").replace(/\s+/g, " ").trim()
    const hasActionWord = /\b(start|launch|take|open|begin|run|play|शुरू|खोलो|खोलें|प्रारंभ|चलाओ)\b/i.test(text)
    const isConfirmWord = /\b(yes|confirm|ok|okay|हाँ|हां)\b/i.test(text)

    // A. If user didn't say an action word (or explicitly said filter/select/subject), treat as SUBJECT FILTER
    if (!hasActionWord) {
      // 1. Quantitative Aptitude Filter
      if (["quant", "quantitative", "aptitude", "math", "maths", "mathematics", "percentages", "arithmetic", "क्वांट", "गणित", "मैथ्स"].some(k => text.includes(k))) {
        lastCommandTimeRef.current = now
        handleSubjectSelect("quant")
        speakText(isHindi ? "क्वांटिटेटिव एप्टीट्यूड चुना गया। अभ्यास शुरू करने के लिए स्टार्ट कहें।" : "Filtered by Quantitative Aptitude. Say Start to begin practice.")
        return
      }

      // 2. Logical Reasoning Filter
      if (["reasoning", "logical", "logic", "coding", "रीजनिंग", "तर्क", "तर्कशक्ति"].some(k => text.includes(k))) {
        lastCommandTimeRef.current = now
        handleSubjectSelect("reasoning")
        speakText(isHindi ? "लॉजिकल रीजनिंग चुना गया। अभ्यास शुरू करने के लिए स्टार्ट कहें।" : "Filtered by Logical Reasoning. Say Start to begin practice.")
        return
      }

      // 3. English Filter
      if (["english", "grammar", "verbal", "language", "comprehension", "अंग्रेजी", "अंग्रेज़ी", "इंग्लिश", "व्याकरण"].some(k => text.includes(k))) {
        lastCommandTimeRef.current = now
        handleSubjectSelect("english")
        speakText(isHindi ? "अंग्रेजी विषय चुना गया। अभ्यास शुरू करने के लिए स्टार्ट कहें।" : "Filtered by English. Say Start to begin practice.")
        return
      }

      // 4. General Knowledge Filter
      if (["gk", "general knowledge", "geography", "constitution", "जीके", "सामान्य ज्ञान", "भूगोल"].some(k => text.includes(k))) {
        lastCommandTimeRef.current = now
        handleSubjectSelect("gk")
        speakText(isHindi ? "सामान्य ज्ञान विषय चुना गया। अभ्यास शुरू करने के लिए स्टार्ट कहें।" : "Filtered by General Knowledge. Say Start to begin practice.")
        return
      }

      // 5. Diagram & Visual Filter
      if (["vision", "diagram", "diagrams", "visual", "डायग्राम", "विज़न", "चित्र"].some(k => text.includes(k))) {
        lastCommandTimeRef.current = now
        handleSubjectSelect("diagrams")
        speakText(isHindi ? "डायग्राम और विज़न विषय चुना गया। अभ्यास शुरू करने के लिए स्टार्ट कहें।" : "Filtered by Diagram and Visual. Say Start to begin practice.")
        return
      }

      // 6. Multi-Format Showcase Filter
      if (["multi", "multi format", "showcase", "मल्टी", "मल्टी फॉर्मेट"].some(k => text.includes(k))) {
        lastCommandTimeRef.current = now
        handleSubjectSelect("showcase")
        speakText(isHindi ? "मल्टी-फॉर्मेट विषय चुना गया। अभ्यास शुरू करने के लिए स्टार्ट कहें।" : "Filtered by Multi-Format Showcase. Say Start to begin practice.")
        return
      }

      // 7. Clear / All Subjects Filter
      if (["all", "all subjects", "everything", "clear", "clear filter", "reset", "सभी", "सब", "सारे"].some(k => text.includes(k))) {
        lastCommandTimeRef.current = now
        handleSubjectSelect("all")
        speakText(isHindi ? "सभी अभ्यास विषय दिखाए जा रहे हैं।" : "Showing all practice subjects.")
        return
      }

      // Confirmation ("yes", "confirm") to start current filtered set
      if (isConfirmWord && filteredSetsRef.current.length > 0) {
        lastCommandTimeRef.current = now
        const set = filteredSetsRef.current[0]
        speakText(isHindi ? `${set.title} अभ्यास शुरू किया जा रहा है` : `Starting ${set.title} practice`)
        triggerPracticeLaunch(set.id)
        return
      }
    }

    // B. Explicit Launch Commands (user said action word like start, begin, open, take, or confirm)
    if (["quant", "quantitative", "aptitude", "math", "maths", "mathematics", "percentages", "arithmetic", "क्वांट", "गणित", "मैथ्स"].some(k => text.includes(k))) {
      lastCommandTimeRef.current = now
      speakText(isHindi ? "गणित और क्वांटिटेटिव एप्टीट्यूड अभ्यास शुरू किया जा रहा है" : "Starting Quantitative Aptitude practice session")
      triggerPracticeLaunch('p1')
      return
    }

    if (["gk", "general knowledge", "geography", "constitution", "जीके", "सामान्य ज्ञान", "भूगोल"].some(k => text.includes(k))) {
      lastCommandTimeRef.current = now
      speakText(isHindi ? "सामान्य ज्ञान और भूगोल अभ्यास शुरू किया जा रहा है" : "Starting General Knowledge and Geography practice session")
      triggerPracticeLaunch('p2')
      return
    }

    if (["reasoning", "logical", "logic", "coding", "रीजनिंग", "तर्क", "तर्कशक्ति"].some(k => text.includes(k))) {
      lastCommandTimeRef.current = now
      speakText(isHindi ? "लॉजिकल रीजनिंग अभ्यास शुरू किया जा रहा है" : "Starting Logical Reasoning practice session")
      triggerPracticeLaunch('p3')
      return
    }

    if (["english", "grammar", "verbal", "language", "comprehension", "अंग्रेजी", "अंग्रेज़ी", "इंग्लिश", "व्याकरण"].some(k => text.includes(k))) {
      lastCommandTimeRef.current = now
      speakText(isHindi ? "अंग्रेजी व्याकरण अभ्यास शुरू किया जा रहा है" : "Starting English Grammar practice session")
      triggerPracticeLaunch('p4')
      return
    }

    if (["multi", "multi format", "showcase", "मल्टी", "मल्टी फॉर्मेट"].some(k => text.includes(k))) {
      lastCommandTimeRef.current = now
      speakText(isHindi ? "मल्टी-फॉर्मेट अभ्यास शुरू किया जा रहा है" : "Starting Multi-Format Showcase practice session")
      triggerPracticeLaunch('p5')
      return
    }

    if (["vision", "diagram", "diagrams", "visual", "डायग्राम", "विज़न", "चित्र"].some(k => text.includes(k))) {
      lastCommandTimeRef.current = now
      speakText(isHindi ? "डायग्राम और विज़न अभ्यास शुरू किया जा रहा है" : "Starting Diagram and Vision AI practice session")
      triggerPracticeLaunch('p6')
      return
    }

    // Full Mock Exam launch if explicitly requested (e.g. "open SSC CGL", "take UPSC Prelims")
    const examMatch = matchExamTokens(rawTranscript)
    if (examMatch && !examMatch.route.param.startsWith('p')) {
      lastCommandTimeRef.current = now
      speakText(isHindi ? `${examMatch.examName} परीक्षा खोली जा रही है` : `Opening ${examMatch.examName} examination portal`)
      triggerPracticeLaunch(examMatch.route.param)
      return
    }

    // Ordinal selection (e.g. "first practice", "set 2", "option 1")
    const routed = routeVoiceCommand(rawTranscript, 'practice')
    if (routed.handled) {
      lastCommandTimeRef.current = now
      if (routed.type === 'select-option' && routed.optionIndex !== undefined) {
        const availableSets = filteredSetsRef.current.length > 0 ? filteredSetsRef.current : PracticeSets
        const chosen = availableSets[routed.optionIndex] || PracticeSets[routed.optionIndex]
        if (chosen) {
          speakText(isHindi ? `${chosen.title} अभ्यास शुरू किया जा रहा है` : `Starting ${chosen.title}`)
          triggerPracticeLaunch(chosen.id)
          return
        }
      }
    }

    // Generic "start", "start practice", "begin" launches top filtered set
    if (hasActionWord) {
      lastCommandTimeRef.current = now
      const target = filteredSetsRef.current.length > 0 ? filteredSetsRef.current[0] : PracticeSets[0]
      speakText(isHindi ? `${target.title} अभ्यास शुरू किया जा रहा है` : `Starting ${target.title} practice`)
      triggerPracticeLaunch(target.id)
      return
    }
  }, [handleSubjectSelect, isHindi, router, triggerPracticeLaunch])

  React.useEffect(() => {
    registerVoiceContext('practice', handlePracticeVoiceCommand)
    return () => unregisterVoiceContext('practice')
  }, [handlePracticeVoiceCommand])

  const { isListening, isSpeaking } = useVoiceEngine({
    lang: isHindi ? 'hi-IN' : 'en-US',
    autoStart: true,
    onTranscript: handlePracticeVoiceCommand,
  });

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
            className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground"
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
            className="h-12 px-6 font-medium "
            render={<Link href="/exam" />}
            nativeButton={false}
            data-voice-prompt="Do you want to take a mock exam? Say Yes, or say No to skip."
            data-voice-confirm="Starting Mock Exam..."
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
        {loadingAnalytics ? (
          <div 
            className="h-32 rounded-none border border-border/60 bg-muted/20 animate-pulse p-6 space-y-3"
            role="status"
            aria-live="polite"
            aria-label="Loading personalized recommendations"
          >
            <div className="h-4 w-48 bg-muted rounded" />
            <div className="h-6 w-72 bg-muted rounded" />
            <div className="h-4 w-96 bg-muted/60 rounded" />
          </div>
        ) : topRecommendation ? (
          <Card className="border-primary/40 bg-primary/5 p-5 md:p-6 ">
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
                  className="font-medium h-10 px-5 "
                  render={<Link href={topRecommendation.actionUrl} />}
                  nativeButton={false}
                  data-voice-prompt={`Do you want to practice ${topRecommendation.title}? Say Yes, or say No to skip.`}
                  data-voice-confirm={`Starting ${topRecommendation.title}...`}
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
                  data-voice-prompt="Do you want to start building your learning profile with a mock exam? Say Yes, or say No to skip."
                  data-voice-confirm="Starting Mock Exam..."
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
        className="bg-card border rounded-none p-5 md:p-7  space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-5 text-primary" aria-hidden="true" />
            <h2 id="filters-heading" className="text-xl font-bold text-foreground">
              Filter Practice Sets
            </h2>
            {isListening && (
              <Badge variant="outline" className="ml-2 gap-1.5 text-2xs font-semibold text-emerald-400 border-emerald-500/40 bg-emerald-950/30">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Voice Active</span>
              </Badge>
            )}
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAllFilters}
              className="text-xs font-medium text-muted-foreground hover:text-foreground h-8 px-2.5"
              data-voice-prompt="Clear all active practice filters? Say Yes, or say No to skip."
              data-voice-confirm="Clearing all active filters."
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
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setTopicFilter(e.target.value)
                }}
                data-voice-prompt="Search practice topics by keyword? Say Yes to focus search, or say No to skip."
                data-voice-confirm="Search field focused."
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("")
                    setTopicFilter("")
                  }}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:outline-none rounded cursor-pointer"
                  aria-label="Clear search input"
                  data-voice-prompt="Clear search keyword? Say Yes, or say No to skip."
                  data-voice-confirm="Search keyword cleared."
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
              onValueChange={(val) => handleSubjectSelect(val || "all")}
            >
              <SelectTrigger
                id="filter-subject"
                className="h-10 text-sm border-border bg-background"
                data-voice-prompt="Filter practice sets by subject? Say Yes to open options, or say No to skip."
                data-voice-confirm="Opening subject options."
              >
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
              <SelectTrigger
                id="filter-difficulty"
                className="h-10 text-sm border-border bg-background"
                data-voice-prompt="Select difficulty level? Say Yes to open options, or say No to skip."
                data-voice-confirm="Opening difficulty options."
              >
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
                  onClick={() => handleSubjectSelect(cat.id)}
                  aria-pressed={isSelected}
                  data-voice-prompt={`Filter by ${cat.label}? Say Yes, or say No for next subject.`}
                  data-voice-confirm={`Filtering by ${cat.label}...`}
                  className={cn(
                    "inline-flex items-center px-4 py-2 rounded-[46px] text-xs md:text-sm font-bold tracking-[0.13px] transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-safe:active:scale-[0.98] border outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer select-none",
                    isSelected
                      ? "bg-primary text-black border-primary shadow-[0_2px_8px_rgba(255,237,0,0.3)]"
                      : "bg-white text-black border-black hover:bg-black hover:text-white dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black"
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

            {subjectFilter !== "all" && subjectFilter !== "All Subjects" && (
              <Badge
                variant="secondary"
                className="gap-1.5 py-1 px-2.5 text-xs font-medium border border-border"
              >
                <span>Subject: {getSubjectDisplayName(subjectFilter)}</span>
                <button
                  type="button"
                  onClick={() => handleSubjectSelect("all")}
                  aria-label={`Remove ${getSubjectDisplayName(subjectFilter)} filter`}
                  data-voice-prompt={`Remove ${getSubjectDisplayName(subjectFilter)} filter? Say Yes, or say No to skip.`}
                  data-voice-confirm={`Removed ${getSubjectDisplayName(subjectFilter)} filter.`}
                  className="hover:text-foreground text-muted-foreground focus-visible:ring-1 focus-visible:outline-none rounded cursor-pointer"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </Badge>
            )}

            {/* 3. Remove Orphaned Active Filter Pills: Only render for Topic if topicFilter is truthy and non-empty */}
            {Boolean(topicFilter && topicFilter.trim() !== "") && (
              <Badge
                variant="secondary"
                className="gap-1.5 py-1 px-2.5 text-xs font-medium border border-border"
              >
                <span>Topic: {topicFilter}</span>
                <button
                  type="button"
                  onClick={() => {
                    setTopicFilter("")
                    setSearchQuery("")
                  }}
                  aria-label="Remove topic filter"
                  data-voice-prompt="Remove topic filter? Say Yes, or say No to skip."
                  data-voice-confirm="Removed topic filter."
                  className="hover:text-foreground text-muted-foreground focus-visible:ring-1 focus-visible:outline-none rounded cursor-pointer"
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
                  data-voice-prompt={`Remove ${difficultyFilter} difficulty filter? Say Yes, or say No to skip.`}
                  data-voice-confirm={`Removed ${difficultyFilter} filter.`}
                  className="hover:text-foreground text-muted-foreground focus-visible:ring-1 focus-visible:outline-none rounded cursor-pointer"
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
              className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground"
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
          <div
            key={`${subjectFilter}-${difficultyFilter}-${searchQuery}`}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 motion-safe:animate-tab-enter"
          >
            {filteredSets.map((practice) => (
              <Card
                key={practice.id}
                className="flex flex-col justify-between border border-border bg-card hover:border-primary/50 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all "
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
                  <CardTitle className="font-heading text-xl font-bold text-foreground">
                    {practice.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground leading-relaxed mt-1">
                    {practice.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-2 flex-1">
                  <div className="flex items-center gap-6 text-xs sm:text-sm font-medium text-muted-foreground bg-muted/40 p-3 rounded-[2px] border border-border/40">
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
                    className="w-full h-12 text-base font-medium "
                    render={<Link href={`/exam?set=${practice.id}`} />}
                    nativeButton={false}
                    data-voice-prompt={`Start question ${practice.title}? Say Yes to begin, or say No to continue.`}
                    data-voice-confirm={`Starting ${practice.title}...`}
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
            <div className="mx-auto flex size-12 items-center justify-center rounded-none bg-muted text-muted-foreground mb-4">
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
              data-voice-prompt="No practice sets match your filter. Clear all filters? Say Yes, or say No to skip."
              data-voice-confirm="Clearing all filters."
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


