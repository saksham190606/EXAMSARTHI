import * as React from "react"
import {
  AudioLines,
  Ear,
  Keyboard,
  Brain,
  ChartNoAxesCombined,
  ShieldCheck,
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
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-[46px] bg-primary text-black text-xs font-bold tracking-[0.144px]">
          <span>Complete Accessibility Ecosystem</span>
        </div>
        <h2
          id="bento-features-heading"
          className="font-heading text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-[0.95]"
        >
          Engineered for Total Independence
        </h2>
        <p className="text-base md:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-normal">
          Every tool, control, and analytical insight in EXAMSARTHI is purpose-built to eliminate examination barriers for visually impaired aspirants.
        </p>
      </div>

      {/* 5-Card Bento Grid */}
      <BentoGrid>
        
        {/* Card 1: Voice Examination Mode (Large 2-column card, Dark Storytelling Tile) */}
        <BentoCard
          className="lg:col-span-2 md:col-span-2"
          variant="dark"
          Icon={AudioLines}
          badge="SPEECH RECOGNITION"
          title="Voice Examination Mode"
          description="Answer exam questions using natural voice commands while preserving complete keyboard and visual synchrony. Speak to select options, navigate questions, check timer, or submit."
          cta="Try Voice Mode"
          href="/exam"
          background={
            <svg
              className="absolute -right-12 -top-12 size-72 text-white/10"
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[46px] bg-primary text-black text-xs font-bold">
              <span className="size-2 rounded-full bg-black motion-safe:animate-pulse" aria-hidden="true" />
              Hands-Free Interaction
            </span>
            <span className="text-xs text-neutral-300 font-mono bg-neutral-900 px-3 py-1 rounded-[2px] border border-white/20">
              &quot;Select Option 2&quot;
            </span>
            <span className="text-xs text-neutral-300 font-mono bg-neutral-900 px-3 py-1 rounded-[2px] border border-white/20">
              &quot;Next Question&quot;
            </span>
          </div>
        </BentoCard>

        {/* Card 2: Screen Reader Ready (Light Tile) */}
        <BentoCard
          className="lg:col-span-1 md:col-span-1"
          variant="light"
          Icon={Ear}
          title="Screen Reader Ready"
          description="Semantic interfaces, meaningful ARIA labels, live regions, and audio feedback tailored for NVDA, JAWS, and TalkBack users."
          cta="Accessibility Settings"
          href="/settings"
          background={
            <svg
              className="absolute -right-6 -bottom-6 size-44 text-black/5"
              fill="none"
              viewBox="0 0 160 160"
              stroke="currentColor"
              aria-hidden="true"
            >
              <rect x="20" y="20" width="120" height="120" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="50" cy="50" r="5" fill="currentColor" />
              <circle cx="80" cy="50" r="5" fill="currentColor" />
              <circle cx="110" cy="50" r="5" fill="currentColor" />
              <circle cx="50" cy="80" r="5" fill="currentColor" />
              <circle cx="80" cy="80" r="5" fill="currentColor" />
              <circle cx="110" cy="80" r="5" fill="currentColor" />
            </svg>
          }
        >
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[46px] bg-neutral-100 text-black text-xs font-bold border border-neutral-300">
              WCAG 2.1 AA Compliant
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[46px] bg-neutral-100 text-black text-xs font-bold border border-neutral-300">
              Live Regions
            </span>
          </div>
        </BentoCard>

        {/* Card 3: Keyboard-First Exams (Light Tile) */}
        <BentoCard
          className="lg:col-span-1 md:col-span-1"
          variant="light"
          Icon={Keyboard}
          title="Keyboard-First Workflow"
          description="Navigate questions, select choices, flag items for review, and submit exams without touching a mouse."
          cta="Start Exam"
          href="/exam"
          background={
            <svg
              className="absolute -right-6 -bottom-6 size-44 text-black/5"
              fill="none"
              viewBox="0 0 160 160"
              stroke="currentColor"
              aria-hidden="true"
            >
              <rect x="25" y="30" width="40" height="35" strokeWidth="1.5" />
              <rect x="75" y="30" width="40" height="35" strokeWidth="1.5" />
              <rect x="25" y="75" width="40" height="35" strokeWidth="1.5" />
              <rect x="75" y="75" width="60" height="35" strokeWidth="1.5" />
              <path d="M45 48 L45 42 M95 48 L95 42 M45 93 L45 87 M105 93 L105 87" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
        >
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <kbd className="px-2.5 py-1 text-xs font-mono font-bold rounded-[2px] bg-neutral-100 border border-neutral-400">Tab</kbd>
            <span className="text-xs text-neutral-600">navigate</span>
            <kbd className="px-2.5 py-1 text-xs font-mono font-bold rounded-[2px] bg-neutral-100 border border-neutral-400">1-4</kbd>
            <span className="text-xs text-neutral-600">answer</span>
            <kbd className="px-2.5 py-1 text-xs font-mono font-bold rounded-[2px] bg-neutral-100 border border-neutral-400">F</kbd>
            <span className="text-xs text-neutral-600">flag</span>
          </div>
        </BentoCard>

        {/* Card 4: Signature Sunlight Yellow Attention Tile */}
        <BentoCard
          className="lg:col-span-1 md:col-span-1"
          variant="yellow"
          Icon={ShieldCheck}
          badge="ZERO LEAKS"
          title="Server-Evaluated Integrity"
          description="Answer keys are strictly withheld from client bundles. Attempts are calculated server-side with cryptographic tamper resistance."
          cta="Explore Verification"
          href="/results"
          background={
            <svg
              className="absolute -right-6 -bottom-6 size-44 text-black/10"
              fill="none"
              viewBox="0 0 160 160"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path d="M80 20 L30 45 V90 C30 120 80 145 80 145 C80 145 130 120 130 90 V45 Z" strokeWidth="2" />
              <path d="M60 85 L75 100 L105 65" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        >
          <div className="pt-2">
            <span className="inline-block text-xs font-bold bg-black text-primary px-3 py-1 rounded-[2px]">
              Institutional Grade Security
            </span>
          </div>
        </BentoCard>

        {/* Card 5: Real-Time Diagnostic Analytics (Dark Tile) */}
        <BentoCard
          className="lg:col-span-1 md:col-span-1"
          variant="dark"
          Icon={ChartNoAxesCombined}
          title="Diagnostic Profiling"
          description="Instant analysis of subject accuracy (<70% flags) with automatic recommendations for targeted remedial practice."
          cta="Candidate Profile"
          href="/dashboard"
          background={
            <svg
              className="absolute -right-6 -bottom-6 size-44 text-white/10"
              fill="none"
              viewBox="0 0 160 160"
              stroke="currentColor"
              aria-hidden="true"
            >
              <line x1="20" y1="140" x2="140" y2="140" strokeWidth="1.5" />
              <line x1="20" y1="20" x2="20" y2="140" strokeWidth="1.5" />
              <rect x="35" y="80" width="18" height="60" strokeWidth="1" />
              <rect x="65" y="55" width="18" height="85" strokeWidth="1" />
              <rect x="95" y="95" width="18" height="45" strokeWidth="1" />
              <rect x="125" y="40" width="18" height="100" strokeWidth="1" />
            </svg>
          }
        >
          <div className="flex items-center gap-2 pt-2">
            <div className="h-2 flex-1 bg-neutral-800 rounded-none overflow-hidden">
              <div className="h-full bg-primary w-[78%]" />
            </div>
            <span className="text-xs font-bold text-white">78% Avg</span>
          </div>
        </BentoCard>

      </BentoGrid>
    </section>
  )
}
