"use client"

import React, { useEffect, useRef, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { animate, motion, useReducedMotion } from "framer-motion"
import { ArrowUp, CircleCheck, Check } from "lucide-react"
import { useAccessibilityStore } from "@/store/useAccessibilityStore"
import { cn } from "@/lib/utils"

export type OrbitRing = "outer" | "inner"

interface OrbitBase {
  ring: OrbitRing
  angle: number
}

export interface OrbitAvatarItem extends OrbitBase {
  kind: "avatar"
  src: string
  alt?: string
  color: string
  size?: number
}

export interface OrbitPillItem extends OrbitBase {
  kind: "pill"
  icon: ReactNode
  label: string
}

export interface OrbitCardItem extends OrbitBase {
  kind: "card"
  emoji: string
  badge?: string | number
}

export interface OrbitStatusItem extends OrbitBase {
  kind: "status"
  label: string
}

export interface OrbitCheckItem extends OrbitBase {
  kind: "check"
}

export type OrbitItem =
  | OrbitAvatarItem
  | OrbitPillItem
  | OrbitCardItem
  | OrbitStatusItem
  | OrbitCheckItem

export interface OrbitStat {
  value: string
  label: string
}

export interface OrbitTag {
  icon: ReactNode
  label: string
  href?: string
  onClick?: () => void
}

export interface CommunityOrbitProps {
  items: OrbitItem[]
  stats: OrbitStat[]
  headline: ReactNode
  tags?: OrbitTag[]
  minScale?: number
  className?: string
}

const STAGE_W = 1200
const STAGE_H = 490
const CENTER = { x: 600, y: 620 }
const RADIUS: Record<OrbitRing, number> = { outer: 492, inner: 404 }

function positionOnRing(ring: OrbitRing, angle: number): CSSProperties {
  const rad = (angle * Math.PI) / 180
  const r = RADIUS[ring]
  const left = Math.round((CENTER.x + r * Math.cos(rad)) * 100) / 100
  const top = Math.round((CENTER.y - r * Math.sin(rad)) * 100) / 100
  return {
    left: `${left}px`,
    top: `${top}px`,
  }
}

function arcPath(r: number) {
  const dy = CENTER.y - STAGE_H
  const dx = Math.round(Math.sqrt(r * r - dy * dy) * 100) / 100
  return `M ${CENTER.x - dx} ${STAGE_H} A ${r} ${r} 0 0 1 ${CENTER.x + dx} ${STAGE_H}`
}

function OrbitAvatar({ src, alt, color, size = 68 }: OrbitAvatarItem) {
  return (
    <div
      className="rounded-[2px] border border-black/20 bg-white p-0.5 shadow-none dark:border-white/20 dark:bg-black"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div
        className="h-full w-full overflow-hidden rounded-[1px] flex items-center justify-center font-heading font-bold text-xs"
        style={{ backgroundColor: color }}
      >
        {src ? (
          <img
            src={src}
            alt={alt ?? ""}
            draggable={false}
            className="h-full w-full select-none object-cover object-top"
          />
        ) : (
          <span className="text-black font-bold uppercase">{alt?.slice(0, 2) || "EX"}</span>
        )}
      </div>
    </div>
  )
}

function OrbitPill({ icon, label }: OrbitPillItem) {
  return (
    <div
      className="flex min-h-[30px] items-center gap-2 whitespace-nowrap rounded-[46px] border border-black bg-white py-1 px-3 text-xs font-bold text-black tracking-[0.13px] shadow-none dark:border-white/30 dark:bg-neutral-950 dark:text-white"
      aria-hidden="true"
    >
      <span className="flex shrink-0 items-center text-primary dark:text-primary leading-none">
        {icon}
      </span>
      <span className="leading-none">{label}</span>
    </div>
  )
}

function OrbitCard({ emoji, badge }: OrbitCardItem) {
  return (
    <div
      className="relative flex h-[50px] w-[50px] items-center justify-center rounded-[2px] border border-black bg-neutral-100 text-xl leading-none shadow-none dark:border-white/20 dark:bg-neutral-900"
      aria-hidden="true"
    >
      <span className="select-none">{emoji}</span>
      {badge !== undefined && (
        <span className="absolute -bottom-2 -right-2 flex h-5 items-center gap-0.5 rounded-[2px] border border-black bg-primary px-1.5 text-[10px] font-bold leading-none text-black shadow-none">
          <ArrowUp className="size-2.5 stroke-[2.5]" aria-hidden="true" />
          {badge}
        </span>
      )}
    </div>
  )
}

function OrbitStatus({ label }: OrbitStatusItem) {
  return (
    <div
      className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[46px] border border-black bg-primary px-3 text-xs font-bold text-black tracking-[0.13px] shadow-none"
      aria-hidden="true"
    >
      <CircleCheck className="size-3.5 fill-black text-primary shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

function OrbitCheck() {
  return (
    <div
      className="flex size-11 items-center justify-center rounded-[46px] border border-black bg-primary text-black shadow-none"
      aria-hidden="true"
    >
      <Check className="size-5 stroke-[2.5]" aria-hidden="true" />
    </div>
  )
}

function renderItem(item: OrbitItem) {
  switch (item.kind) {
    case "avatar":
      return <OrbitAvatar {...item} />
    case "pill":
      return <OrbitPill {...item} />
    case "card":
      return <OrbitCard {...item} />
    case "status":
      return <OrbitStatus {...item} />
    case "check":
      return <OrbitCheck />
  }
}

function splitValue(value: string) {
  const m = value.match(/^([^\d]*)([\d.,]+)(.*)$/)
  if (!m) return null
  const raw = m[2].replace(/,/g, "")
  const decimals = (raw.split(".")[1] ?? "").length
  return { prefix: m[1], target: parseFloat(raw), decimals, suffix: m[3] }
}

function CountUp({
  value,
  delay,
  disabled = false,
}: {
  value: string
  delay: number
  disabled?: boolean
}) {
  const parts = splitValue(value)
  const [mounted, setMounted] = useState(false)
  const [n, setN] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
    if (!parts || disabled) return
    const controls = animate(0, parts.target, {
      delay,
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setN(v),
    })
    return () => controls.stop()
  }, [value, delay, disabled, parts?.target])

  if (!parts || !mounted || disabled || n === null) {
    return <>{value}</>
  }

  return (
    <>
      {parts.prefix}
      {n.toFixed(parts.decimals)}
      {parts.suffix}
    </>
  )
}

const revealVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

const staticRevealVariants = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
}

export default function BuildersCommunityHero({
  items,
  stats,
  headline,
  tags = [],
  minScale = 0.6,
  className,
}: CommunityOrbitProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [mounted, setMounted] = useState(false)

  // Reduced motion detection: combine OS preference and app-level accessibility store
  const systemReducedMotion = useReducedMotion()
  const { reducedMotion: storeReducedMotion } = useAccessibilityStore()
  const isReducedMotion = mounted ? Boolean(systemReducedMotion || storeReducedMotion) : false

  const activeReveal = isReducedMotion ? staticRevealVariants : revealVariants

  useEffect(() => {
    setMounted(true)
    const frame = frameRef.current
    if (!frame) return
    const measure = () => {
      setScale(Math.min(1, Math.max(minScale, frame.clientWidth / STAGE_W)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(frame)
    return () => ro.disconnect()
  }, [minScale])

  const statsSummary = stats.map((s) => `${s.value} ${s.label}`).join(", ")

  return (
    <section
      aria-label="Platform Highlights & Accessibility Performance"
      className={cn(
        "w-full flex flex-col items-center justify-center overflow-hidden bg-white px-4 pt-12 pb-16 text-foreground border-b border-border/80 dark:bg-black dark:text-white dark:border-white/16",
        className
      )}
    >
      {/* Visually hidden announcement for screen-reader users */}
      <div className="sr-only">
        <h2>Platform Highlights</h2>
        <p>Key metrics: {statsSummary}.</p>
      </div>

      <div
        ref={frameRef}
        aria-hidden="true"
        className="relative mx-auto w-full max-w-[1200px] overflow-hidden flex justify-center items-start"
        style={{ height: STAGE_H * scale }}
      >
        <div
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            flexShrink: 0,
          }}
          className="relative"
        >
          {/* Decorative Stage SVG: Arc Orbits */}
          <svg
            className="pointer-events-none absolute inset-0"
            width={STAGE_W}
            height={STAGE_H}
            viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
            fill="none"
            style={{
              maskImage: "linear-gradient(to bottom, #000 62%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, #000 62%, transparent 100%)",
            }}
          >
            <motion.path
              d={arcPath(RADIUS.outer)}
              className="stroke-[#e4e4e4] dark:stroke-white/10"
              strokeWidth={2}
              initial={isReducedMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            />
            <motion.path
              d={arcPath(RADIUS.inner)}
              className="stroke-[#dcdcdc] dark:stroke-white/[0.13]"
              strokeWidth={3}
              initial={isReducedMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, ease: "easeOut", delay: 0.1 }}
            />
          </svg>

          {/* ORBIT NODES */}
          {items.map((item, i) => (
            <motion.div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={positionOnRing(item.ring, item.angle)}
              initial={isReducedMotion ? false : { opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: isReducedMotion ? 0 : 0.5 + i * 0.07,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <motion.div
                animate={isReducedMotion ? undefined : { y: [0, -4, 0] }}
                transition={
                  isReducedMotion
                    ? undefined
                    : {
                        duration: 4 + (i % 4) * 0.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: (i * 0.4) % 2,
                      }
                }
                whileHover={isReducedMotion ? undefined : { scale: 1.06 }}
              >
                {renderItem(item)}
              </motion.div>
            </motion.div>
          ))}

          {/* STATS COUNTER */}
          <div className="absolute left-0 right-0 top-[385px] mx-auto flex items-center justify-center gap-10 sm:gap-14 text-center">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="flex flex-col items-center text-center"
                variants={activeReveal}
                initial="hidden"
                animate="show"
                transition={{
                  duration: 0.6,
                  delay: isReducedMotion ? 0 : 0.9 + i * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span className="text-[44px] sm:text-[48px] font-bold leading-none tracking-tight text-foreground tabular-nums">
                  <CountUp
                    value={s.value}
                    delay={isReducedMotion ? 0 : 0.9 + i * 0.12}
                    disabled={isReducedMotion}
                  />
                </span>
                <span className="mt-3 text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Mission Headline */}
      <motion.h2
        className="mx-auto mt-6 max-w-3xl text-center font-heading text-2xl sm:text-4xl md:text-5xl font-bold leading-[0.95] tracking-tight text-foreground"
        variants={activeReveal}
        initial="hidden"
        animate="show"
        transition={{ duration: 0.5, delay: isReducedMotion ? 0 : 0.8, ease: [0.2, 0, 0, 1] }}
      >
        {headline}
      </motion.h2>

      {/* Interactive Candidate Discovery Tags */}
      {tags.length > 0 && (
        <div
          role="toolbar"
          aria-label="Platform Feature Discovery Tags"
          className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-2.5 sm:gap-3"
        >
          {tags.map((t, i) => {
            const isLink = Boolean(t.href)
            const TagComponent = (isLink ? motion.a : motion.button) as any

            return (
              <TagComponent
                key={t.label}
                href={t.href}
                onClick={t.onClick}
                type={!isLink ? "button" : undefined}
                className={cn(
                  "group inline-flex min-h-[44px] min-w-[44px] items-center gap-2.5 rounded-[46px] border border-black bg-white px-4 py-2 text-xs md:text-sm font-bold tracking-[0.13px] text-black shadow-none transition-all duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
                  "hover:bg-black hover:text-white dark:border-white dark:bg-black dark:text-white dark:hover:bg-white dark:hover:text-black",
                  "motion-safe:active:scale-[0.98]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-[#ffed00]"
                )}
                variants={activeReveal}
                initial="hidden"
                animate="show"
                transition={{
                  duration: 0.4,
                  delay: isReducedMotion ? 0 : 0.9 + i * 0.06,
                  ease: [0.2, 0, 0, 1],
                }}
              >
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-[46px] bg-primary text-black transition-colors group-hover:bg-white group-hover:text-black dark:group-hover:bg-black dark:group-hover:text-white [&>svg]:size-3.5"
                  aria-hidden="true"
                >
                  {t.icon}
                </span>
                <span>{t.label}</span>
              </TagComponent>
            )
          })}
        </div>
      )}
    </section>
  )
}

export { BuildersCommunityHero as Component }
