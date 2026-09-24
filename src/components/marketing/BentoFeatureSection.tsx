import * as React from "react"
import {
  AudioLines,
  Ear,
  Keyboard,
  Brain,
  ChartNoAxesCombined,
  Sparkles,
} from "lucide-react"

import { BentoGrid, BentoCard } from "@/components/ui/bento-grid"

export function BentoFeatureSection() {
  return (
    <section
      aria-labelledby="bento-features-heading"
      className="py-20 md:py-28 px-4 md:px-8 max-w-7xl mx-auto w-full"
    >
      {/* Section Header */}
      <div className="text-center mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
          <span>Complete Accessibility Ecosystem</span>
        </div>
        <h2
          id="bento-features-heading"
          className="text-3xl md:text-5xl font-bold tracking-tight text-foreground"
        >
          Engineered for Total Independence
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Every tool, control, and analytical insight in EXAMSARTHI is purpose-built to eliminate examination barriers for visually impaired aspirants.
        </p>
      </div>

      {/* 5-Card Bento Grid */}
      <BentoGrid>
        
        {/* Card 1: Voice Examination Mode (Large 2-column card) */}
        <BentoCard
          className="lg:col-span-2 md:col-span-2"
          Icon={AudioLines}
          title="Voice Examination Mode"
          description="Answer exam questions using natural voice commands while preserving complete keyboard and visual synchrony. Speak to select options, navigate questions, check timer, or submit."
          cta="Try Voice Mode"
          href="/exam"
          background={
            <svg
              className="absolute -right-12 -top-12 size-72 text-primary/10 dark:text-primary/15"
              fill="none"
              viewBox="0 0 200 200"
              stroke="currentColor"
              aria-hidden="true"
            >
              <circle cx="100" cy="100" r="30" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="100" cy="100" r="55" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="80" strokeWidth="1.5" strokeDasharray="4 4" />
              <circle cx="100" cy="100" r="105" strokeWidth="1.5" />
              <path
                d="M70 100 L70 85 M85 100 L85 70 M100 100 L100 55 M115 100 L115 70 M130 100 L130 85"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          }
        >
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
              <span className="size-2 rounded-full bg-primary motion-safe:animate-pulse" aria-hidden="true" />
              Hands-Free Interaction
            </span>
            <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2.5 py-1 rounded-md border border-border/50">
              &quot;Select Option 2&quot;
            </span>
            <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2.5 py-1 rounded-md border border-border/50">
              &quot;Next Question&quot;
            </span>
          </div>
        </BentoCard>

        {/* Card 2: Screen Reader Ready */}
        <BentoCard
          className="lg:col-span-1 md:col-span-1"
          Icon={Ear}
          title="Screen Reader Ready"
          description="Semantic interfaces, meaningful ARIA labels, live regions, and audio feedback tailored for NVDA, JAWS, and TalkBack users."
          cta="Accessibility Settings"
          href="/settings"
          background={
            <svg
              className="absolute -right-6 -bottom-6 size-44 text-primary/10 dark:text-primary/15"
              fill="none"
              viewBox="0 0 160 160"
              stroke="currentColor"
              aria-hidden="true"
            >
              <rect x="20" y="20" width="120" height="120" rx="16" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="50" cy="50" r="5" fill="currentColor" />
              <circle cx="80" cy="50" r="5" fill="currentColor" />
              <circle cx="110" cy="50" r="5" fill="currentColor" />
              <circle cx="50" cy="80" r="5" fill="currentColor" />
              <circle cx="80" cy="80" r="5" fill="currentColor" />
              <circle cx="110" cy="80" r="5" fill="currentColor" />
              <circle cx="50" cy="110" r="5" fill="currentColor" />
              <circle cx="80" cy="110" r="5" fill="currentColor" />
              <circle cx="110" cy="110" r="5" fill="currentColor" />
            </svg>
          }
        >
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground text-xs font-medium border border-border/50">
              Aligned with WCAG 2.1 AA Principles
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground text-xs font-medium border border-border/50">
              Live Announcements
            </span>
          </div>
        </BentoCard>

        {/* Card 3: Keyboard-First Exams */}
        <BentoCard
          className="lg:col-span-1 md:col-span-1"
          Icon={Keyboard}
          title="Keyboard-First Exams"
          description="Navigate questions, select choices, flag items for review, and submit exams without touching a mouse."
          cta="Start Exam"
          href="/exam"
          background={
            <svg
              className="absolute -right-6 -bottom-6 size-44 text-primary/10 dark:text-primary/15"
              fill="none"
              viewBox="0 0 160 160"
              stroke="currentColor"
              aria-hidden="true"
            >
              <rect x="25" y="30" width="40" height="35" rx="6" strokeWidth="1.5" />
              <rect x="75" y="30" width="40" height="35" rx="6" strokeWidth="1.5" />
              <rect x="25" y="75" width="40" height="35" rx="6" strokeWidth="1.5" />
              <rect x="75" y="75" width="60" height="35" rx="6" strokeWidth="1.5" />
              <path d="M45 48 L45 42 M95 48 L95 42 M45 93 L45 87 M105 93 L105 87" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
        >
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <kbd className="px-2 py-0.5 text-xs font-mono font-medium rounded bg-muted border border-border shadow-xs">Tab</kbd>
            <span className="text-xs text-muted-foreground">nav</span>
            <kbd className="px-2 py-0.5 text-xs font-mono font-medium rounded bg-muted border border-border shadow-xs">1-4</kbd>
            <span className="text-xs text-muted-foreground">ans</span>
            <kbd className="px-2 py-0.5 text-xs font-mono font-medium rounded bg-muted border border-border shadow-xs">F</kbd>
            <span className="text-xs text-muted-foreground">flag</span>
          </div>
        </BentoCard>

        {/* Card 4: Personalized Learning */}
        <BentoCard
          className="lg:col-span-1 md:col-span-1"
          Icon={Brain}
          title="Personalized Learning"
          description="Recommendations are derived deterministically from your actual performance, weakest topics, and historical attempts."
          cta="View Dashboard"
          href="/dashboard"
          background={
            <svg
              className="absolute -right-8 -top-8 size-48 text-primary/10 dark:text-primary/15"
              fill="none"
              viewBox="0 0 160 160"
              stroke="currentColor"
              aria-hidden="true"
            >
              <circle cx="50" cy="50" r="7" strokeWidth="1.5" />
              <circle cx="110" cy="40" r="9" strokeWidth="1.5" />
              <circle cx="80" cy="90" r="8" strokeWidth="1.5" />
              <circle cx="120" cy="120" r="6" strokeWidth="1.5" />
              <circle cx="40" cy="120" r="7" strokeWidth="1.5" />
              <line x1="56" y1="53" x2="102" y2="43" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="54" y1="56" x2="74" y2="84" strokeWidth="1" />
              <line x1="104" y1="46" x2="86" y2="84" strokeWidth="1" />
              <line x1="86" y1="95" x2="115" y2="116" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="74" y1="95" x2="46" y2="115" strokeWidth="1" />
            </svg>
          }
        >
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
              <Sparkles className="size-3" aria-hidden="true" />
              Real Performance Data
            </span>
            <span className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md border border-border/50">
              Adaptive Practice Routing
            </span>
          </div>
        </BentoCard>

        {/* Card 5: Accessible Analytics */}
        <BentoCard
          className="lg:col-span-1 md:col-span-2 lg:col-span-1"
          Icon={ChartNoAxesCombined}
          title="Accessible Analytics"
          description="Understand your competitive exam readiness with high-contrast scorecards, subject accuracy breakdowns, and improvement logs."
          cta="View Results"
          href="/results"
          background={
            <svg
              className="absolute -right-4 -bottom-4 size-44 text-primary/10 dark:text-primary/15"
              fill="none"
              viewBox="0 0 160 160"
              stroke="currentColor"
              aria-hidden="true"
            >
              <line x1="20" y1="130" x2="140" y2="130" strokeWidth="1.5" />
              <rect x="35" y="85" width="18" height="45" rx="3" strokeWidth="1.5" />
              <rect x="65" y="60" width="18" height="70" rx="3" strokeWidth="1.5" />
              <rect x="95" y="40" width="18" height="90" rx="3" strokeWidth="1.5" />
              <path d="M44 80 L74 55 L104 35" strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" />
            </svg>
          }
        >
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground text-xs font-medium border border-border/50">
              Subject Accuracy Metrics
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground text-xs font-medium border border-border/50">
              Color-Independent Cues
            </span>
          </div>
        </BentoCard>

      </BentoGrid>
    </section>
  )
}
