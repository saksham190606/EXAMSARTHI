import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Ear,
  Eye,
  Mic,
  ShieldCheck,
  Clock,
  Award,
  Sparkles,
  ChevronRight,
  Layers,
  HelpCircle,
  Keyboard,
  BarChart3,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BentoFeatureSection } from "@/components/marketing/BentoFeatureSection"
import BuildersCommunityHero, {
  OrbitItem,
  OrbitStat,
  OrbitTag,
} from "@/components/ui/builders-community-hero"
import ExamSarthiHero from "@/components/landing/ExamSarthiHero"

const communityOrbitItems: OrbitItem[] = [
  {
    kind: "pill",
    ring: "outer",
    angle: 28,
    icon: <Mic className="size-3.5" aria-hidden="true" />,
    label: "Voice-Assisted",
  },
  {
    kind: "status",
    ring: "inner",
    angle: 50,
    label: "WCAG 2.1 AA",
  },
  {
    kind: "card",
    ring: "outer",
    angle: 75,
    emoji: "🎯",
    badge: "99.4%",
  },
  {
    kind: "check",
    ring: "inner",
    angle: 90,
  },
  {
    kind: "pill",
    ring: "outer",
    angle: 112,
    icon: <Award className="size-3.5" aria-hidden="true" />,
    label: "SSC CGL Ready",
  },
  {
    kind: "status",
    ring: "inner",
    angle: 132,
    label: "Server Scored",
  },
  {
    kind: "pill",
    ring: "outer",
    angle: 155,
    icon: <BookOpen className="size-3.5" aria-hidden="true" />,
    label: "UPSC Prelims",
  },
]

const communityStats: OrbitStat[] = [
  { value: "10K+", label: "Exams Attempted" },
  { value: "98%", label: "Screen-Reader Accuracy" },
  { value: "50+", label: "Mock Simulations" },
]

const communityTags: OrbitTag[] = [
  {
    icon: <Keyboard className="size-3.5" aria-hidden="true" />,
    label: "Keyboard-First",
    href: "/practice",
  },
  {
    icon: <Clock className="size-3.5" aria-hidden="true" />,
    label: "Timed Mocks",
    href: "/exam",
  },
  {
    icon: <BarChart3 className="size-3.5" aria-hidden="true" />,
    label: "Subject Analytics",
    href: "/dashboard",
  },
  {
    icon: <Ear className="size-3.5" aria-hidden="true" />,
    label: "Screen-Reader Tested",
    href: "/settings",
  },
  {
    icon: <Mic className="size-3.5" aria-hidden="true" />,
    label: "Hands-Free Voice Mode",
    href: "/exam",
  },
]

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-transparent text-foreground">
      
      {/* SECTION 1 — Animated Hero & Exam Ticker */}
      <ExamSarthiHero />

      {/* SECTION 2 — Candidate Intelligence & Readiness Preview Card */}
      <section className="bg-transparent text-white px-4 py-12 md:py-16 border-b border-white/16">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
          <div className="w-full max-w-4xl text-left">
            <div 
              role="region"
              aria-label="Candidate performance and recommendation overview"
              className="rounded-[2px] border border-[rgba(255,255,255,0.16)] bg-black/60 backdrop-blur-sm p-6 sm:p-8 space-y-6 shadow-none"
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[rgba(255,255,255,0.16)]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#ffed00]">
                    CANDIDATE INTELLIGENCE ENGINE
                  </span>
                  <span className="text-white/40 hidden sm:inline" aria-hidden="true">•</span>
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20">
                    Target Exam: SSC CGL Tier 1
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#ffed00] text-black">
                  <ShieldCheck className="size-3.5 stroke-[2.5]" aria-hidden="true" />
                  <span>Authoritative Server-Graded</span>
                </span>
              </div>

              {/* 3-Column Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 py-1">
                {/* Column 1: Overall Accuracy */}
                <div className="rounded-[2px] border border-white/10 bg-white/[0.03] p-4 sm:p-5 flex flex-col justify-between space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[rgba(255,255,255,0.72)]">
                      OVERALL ACCURACY
                    </p>
                    <p className="font-heading font-bold text-3xl sm:text-4xl text-white tabular-nums tracking-tight mt-1.5">
                      84.2%
                    </p>
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#ffed00] bg-[#ffed00]/15 border border-[#ffed00]/30 px-2 py-0.5 rounded-[2px]">
                      +4.1% vs last week
                    </span>
                  </div>
                </div>

                {/* Column 2: Completed Mocks */}
                <div className="rounded-[2px] border border-white/10 bg-white/[0.03] p-4 sm:p-5 flex flex-col justify-between space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[rgba(255,255,255,0.72)]">
                      COMPLETED MOCKS
                    </p>
                    <p className="font-heading font-bold text-3xl sm:text-4xl text-white tabular-nums tracking-tight mt-1.5">
                      12
                    </p>
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#8dc572] bg-[#8dc572]/15 border border-[#8dc572]/30 px-2 py-0.5 rounded-[2px]">
                      100% Persisted
                    </span>
                  </div>
                </div>

                {/* Column 3: Average Pace */}
                <div className="rounded-[2px] border border-white/10 bg-white/[0.03] p-4 sm:p-5 flex flex-col justify-between space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[rgba(255,255,255,0.72)]">
                      AVG TIME / QUESTION
                    </p>
                    <p className="font-heading font-bold text-3xl sm:text-4xl text-white tabular-nums tracking-tight mt-1.5">
                      48s
                    </p>
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-white/10 border border-white/20 px-2 py-0.5 rounded-[2px]">
                      Optimal pace
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommendation / Insight Banner */}
              <div className="bg-white/5 border border-white/10 rounded-[2px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-none bg-[#ffed00] shrink-0" aria-hidden="true" />
                    <h4 className="font-heading text-sm sm:text-base font-bold text-white tracking-tight">
                      Weak Area Identified: Quantitative Aptitude (Ratio &amp; Proportion)
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm text-[rgba(255,255,255,0.72)] leading-relaxed pl-4">
                    Accuracy dipped to 62% in the latest attempt. Recommended: 10-Question Targeted Practice Sprint.
                  </p>
                </div>
                <Link
                  href="/practice?subject=quant"
                  className="shrink-0 inline-flex items-center gap-1.5 bg-[#ffed00] text-black font-bold px-4 py-2 text-xs rounded-[2px] hover:bg-[#e6d200] transition-colors motion-safe:active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffed00] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  <span>Start Targeted Practice →</span>
                </Link>
              </div>

              {/* Footer Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[rgba(255,255,255,0.72)] pt-4 border-t border-[rgba(255,255,255,0.16)]">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-[#ffed00] shrink-0" aria-hidden="true" />
                  <span>WCAG 2.1 AA Compliant • Keyboard Navigable • High Contrast</span>
                </div>
                <span className="font-mono text-xs text-[rgba(255,255,255,0.72)]">
                  Synced with Supabase Backend
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SUB-NAVIGATION PILL RAIL (Between Hero and Content Body) */}
      <section className="border-b border-neutral-200 dark:border-white/16 bg-transparent py-4 px-4 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center gap-3 justify-center sm:justify-start">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 mr-2 hidden md:inline">Quick Access</span>
          <Link href="/practice" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[46px] border border-black bg-white text-black hover:bg-black hover:text-white dark:border-white dark:bg-black dark:text-white dark:hover:bg-white dark:hover:text-black text-xs font-bold tracking-[0.13px] whitespace-nowrap transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.98]">
            Full Mock Exams
          </Link>
          <Link href="/practice?subject=quant" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[46px] border border-black bg-white text-black hover:bg-black hover:text-white dark:border-white dark:bg-black dark:text-white dark:hover:bg-white dark:hover:text-black text-xs font-bold tracking-[0.13px] whitespace-nowrap transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.98]">
            Quantitative Aptitude
          </Link>
          <Link href="/practice?subject=reasoning" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[46px] border border-black bg-white text-black hover:bg-black hover:text-white dark:border-white dark:bg-black dark:text-white dark:hover:bg-white dark:hover:text-black text-xs font-bold tracking-[0.13px] whitespace-nowrap transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.98]">
            General Intelligence
          </Link>
          <Link href="/exam" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[46px] border border-black bg-white text-black hover:bg-black hover:text-white dark:border-white dark:bg-black dark:text-white dark:hover:bg-white dark:hover:text-black text-xs font-bold tracking-[0.13px] whitespace-nowrap transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.98]">
            Voice Examination
          </Link>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[46px] border border-black bg-white text-black hover:bg-black hover:text-white dark:border-white dark:bg-black dark:text-white dark:hover:bg-white dark:hover:text-black text-xs font-bold tracking-[0.13px] whitespace-nowrap transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.98]">
            Diagnostic Profile
          </Link>
        </div>
      </section>

      {/* SECTION 2 — Accessible Orbit Highlights & Community Metrics */}
      <BuildersCommunityHero
        headline={
          <span>
            Accessible Examination &amp; Practice.{" "}
            <span className="text-foreground underline decoration-primary decoration-4 underline-offset-8">
              Real Results
            </span>{" "}
            for Every Aspirant.
          </span>
        }
        stats={communityStats}
        items={communityOrbitItems}
        tags={communityTags}
      />

      {/* SECTION 3 — Pure White Canvas Browsing Mode (Square Tiles with Crisp Dividers) */}
      <section className="py-20 md:py-28 px-4 md:px-8 max-w-7xl mx-auto w-full bg-transparent">
        <div className="text-center mb-16 space-y-4">
          <h2 className="font-heading text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-[0.95]">
            Built for Accessibility First
          </h2>
          <p className="text-base md:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-normal">
            Every feature complies with international accessibility standards so candidates can focus on examination mastery without friction.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-px bg-neutral-300 dark:bg-white/16 border border-neutral-300 dark:border-white/16">
          
          {/* Feature 1 */}
          <div className="p-8 bg-white dark:bg-neutral-950 text-foreground flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="size-11 rounded-[2px] bg-neutral-100 dark:bg-neutral-900 text-foreground border border-neutral-200 dark:border-white/20 flex items-center justify-center">
                <Ear className="size-5 text-foreground" aria-hidden="true" />
              </div>
              <h3 className="font-heading text-2xl font-bold leading-[0.95] text-foreground">Screen-Reader Optimized</h3>
              <p className="text-sm font-normal text-neutral-600 dark:text-neutral-400 leading-normal">
                Clean semantic HTML5 structure, ARIA landmarks, unskipped headings, and non-spamming live regions for timer countdowns.
              </p>
            </div>
            <div className="pt-2">
              <Link href="/settings" className="inline-flex items-center text-xs font-bold text-foreground hover:underline gap-1">
                <span>View Screen Reader Guide</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>
          
          {/* Feature 2 */}
          <div className="p-8 bg-white dark:bg-neutral-950 text-foreground flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="size-11 rounded-[2px] bg-neutral-100 dark:bg-neutral-900 text-foreground border border-neutral-200 dark:border-white/20 flex items-center justify-center">
                <Eye className="size-5 text-foreground" aria-hidden="true" />
              </div>
              <h3 className="font-heading text-2xl font-bold leading-[0.95] text-foreground">High-Contrast &amp; Text Scaling</h3>
              <p className="text-sm font-normal text-neutral-600 dark:text-neutral-400 leading-normal">
                High-contrast monochrome canvases, Sunlight Yellow highlights, and dynamic text scaling (16px, 18px, 20px) without layout overflow.
              </p>
            </div>
            <div className="pt-2">
              <Link href="/settings" className="inline-flex items-center text-xs font-bold text-foreground hover:underline gap-1">
                <span>Configure Contrast</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-8 bg-white dark:bg-neutral-950 text-foreground flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="size-11 rounded-[2px] bg-neutral-100 dark:bg-neutral-900 text-foreground border border-neutral-200 dark:border-white/20 flex items-center justify-center">
                <BookOpen className="size-5 text-foreground" aria-hidden="true" />
              </div>
              <h3 className="font-heading text-2xl font-bold leading-[0.95] text-foreground">Keyboard &amp; Voice Navigable</h3>
              <p className="text-sm font-normal text-neutral-600 dark:text-neutral-400 leading-normal">
                Complete hands-free voice command participation with immediate keyboard fallback (`Tab`, Arrow keys, `1-4`, `Enter`).
              </p>
            </div>
            <div className="pt-2">
              <Link href="/exam" className="inline-flex items-center text-xs font-bold text-foreground hover:underline gap-1">
                <span>Test Voice Controls</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 3 — Accessible Bento Feature Grid (With Signature Yellow Accent Tile) */}
      <BentoFeatureSection />

      {/* SECTION 4 — Institutional Quality Band (Deep Black Canvas #111111) */}
      <section className="py-20 md:py-28 bg-transparent text-white border-t border-white/16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Institutional Standard</span>
              <h2 className="font-heading text-3xl md:text-5xl font-bold tracking-tight text-white leading-[0.95]">
                Tamper-Resistant Examination Integrity
              </h2>
              <p className="text-base text-white/70 leading-normal">
                EXAMSARTHI guarantees total exam security. Raw answer keys are never sent to candidate browsers, while section time limits are enforced server-side.
              </p>
            </div>
            <ul className="space-y-3.5">
              {[
                "Server-evaluated scoring with zero answer keys in client bundles",
                "Per-section duration limits with automatic section-locking",
                "Real-time diagnostic analytics identifying subject weak areas (<70%)",
                "Bilingual examination support in English and Hindi"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="size-5 text-primary shrink-0" aria-hidden="true" />
                  <span className="text-sm md:text-base font-normal text-white">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Diagnostic Metric Preview Card (Square 0px radius, 1px border) */}
          <div className="bg-black/60 backdrop-blur-sm rounded-none p-6 sm:p-8 border border-white/16 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/16">
              <h3 className="font-heading font-bold text-lg text-white">Diagnostic Candidate Profile</h3>
              <span className="text-xs font-bold text-primary border border-primary/40 px-2.5 py-0.5 rounded-[46px]">
                Live Supabase Sync
              </span>
            </div>
            <div className="space-y-3">
              {[
                { subject: "Quantitative Aptitude", score: "88%", state: "Strong Area", color: "bg-primary text-black" },
                { subject: "General Intelligence & Reasoning", score: "84%", state: "Strong Area", color: "bg-primary text-black" },
                { subject: "English Language & Comprehension", score: "62%", state: "Needs Practice", color: "bg-neutral-700 text-white" },
                { subject: "General Awareness", score: "54%", state: "Needs Practice", color: "bg-neutral-800 text-white border border-white/20" },
              ].map((sub, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 rounded-none bg-neutral-900 border border-white/10 text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="size-2 rounded-none bg-primary" aria-hidden="true" />
                    <span className="font-normal text-white">{sub.subject}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white">{sub.score}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-[2px] font-bold ${sub.color}`}>
                      {sub.state}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/50 text-center pt-2 border-t border-white/10">
              Personalized practice recommendations are algorithmically generated after every official attempt.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 5 — Global Footer (Pure Black Canvas #000000, 64px padding, 3-column layout) */}
      <footer className="py-16 bg-black/70 backdrop-blur-sm text-white border-t border-white/16 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Column 1: Brand & Mission */}
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="size-6 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="size-6 text-white" fill="currentColor">
                    <path d="M12 2L2 12l10 10 10-10L12 2zm0 3.8L18.2 12 12 18.2 5.8 12 12 5.8z" />
                  </svg>
                </div>
                <span className="font-heading font-bold text-xl tracking-tight text-white">EXAMSARTHI</span>
              </div>
              <p className="text-sm text-white/70 max-w-md font-normal leading-relaxed">
                Accessibility-first examination and practice platform designed to empower visually impaired candidates to independently prepare for and participate in competitive examinations.
              </p>
            </div>

            {/* Column 2: Navigation */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Platform Modules</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li><Link href="/dashboard" className="hover:text-white">Candidate Dashboard</Link></li>
                <li><Link href="/practice" className="hover:text-white">Practice Sets</Link></li>
                <li><Link href="/exam" className="hover:text-white">Active Examination</Link></li>
                <li><Link href="/results" className="hover:text-white">Performance Analytics</Link></li>
              </ul>
            </div>

            {/* Column 3: Accessibility */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Accessibility Standards</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li><Link href="/settings" className="hover:text-white">High-Contrast Modes</Link></li>
                <li><Link href="/settings" className="hover:text-white">Screen Reader Keys</Link></li>
                <li><Link href="/settings" className="hover:text-white">Voice Calibration</Link></li>
                <li><Link href="/settings" className="hover:text-white">Font Scaling</Link></li>
              </ul>
            </div>

          </div>

          {/* Bottom Copyright Row separated by hairline divider */}
          <div className="pt-8 border-t border-white/16 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
            <p>© {new Date().getFullYear()} EXAMSARTHI. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span>Strict Two-Tone Accessibility Design System</span>
              <span className="text-primary font-bold">Sunlight Yellow Verified</span>
            </div>
          </div>
        </div>
      </footer>
      
    </div>
  )
}
