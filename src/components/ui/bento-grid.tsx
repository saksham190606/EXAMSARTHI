import * as React from "react"
import Link from "next/link"
import { ArrowRight, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

export interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string
  title?: string
  className?: string
  background?: React.ReactNode
  Icon: LucideIcon | React.ComponentType<{ className?: string }>
  description: string
  href?: string
  cta?: string
  variant?: "light" | "dark" | "yellow"
  badge?: string
  children?: React.ReactNode
}

export function BentoGrid({
  children,
  className,
  ...props
}: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-neutral-300 dark:bg-white/16 border border-neutral-300 dark:border-white/16",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function BentoCard({
  name,
  title,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  variant = "light",
  badge,
  children,
  ...props
}: BentoCardProps) {
  const cardTitle = title || name || ""

  const variantClasses = {
    light: "bg-white text-black border-0",
    dark: "bg-black text-white border-0",
    yellow: "bg-primary text-black border-0",
  }[variant]

  const buttonStyle = {
    light: "border-black text-black hover:bg-black hover:text-white dark:border-black",
    dark: "border-white text-white hover:bg-white hover:text-black",
    yellow: "border-black bg-black text-white hover:bg-neutral-800",
  }[variant]

  const iconContainerStyle = {
    light: "bg-neutral-100 text-black border border-neutral-200",
    dark: "bg-neutral-900 text-white border border-white/20",
    yellow: "bg-black text-primary border border-black",
  }[variant]

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-none p-8 transition-colors select-none",
        variantClasses,
        className
      )}
      {...props}
    >
      {/* Background decoration */}
      {background && (
        <div
          className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-80"
          aria-hidden="true"
        >
          {background}
        </div>
      )}

      {/* Card Content */}
      <div className="relative z-10 flex flex-col h-full justify-between gap-6">
        <div className="space-y-5">
          {/* Top Row: Icon & optional Badge */}
          <div className="flex items-center justify-between">
            <div className={cn("inline-flex size-11 items-center justify-center rounded-[2px]", iconContainerStyle)}>
              <Icon className="size-5" aria-hidden="true" />
            </div>
            {badge && (
              <span className={cn(
                "px-3 py-1 rounded-[46px] text-xs font-bold tracking-[0.144px]",
                variant === "yellow" ? "bg-black text-primary" : "bg-primary text-black"
              )}>
                {badge}
              </span>
            )}
          </div>

          {/* Heading and Description */}
          <div className="space-y-2">
            <h3 className="font-heading text-2xl font-bold tracking-tight leading-[0.95]">
              {cardTitle}
            </h3>
            <p className={cn(
              "text-sm font-normal leading-relaxed max-w-xl",
              variant === "light" ? "text-neutral-600" : variant === "dark" ? "text-neutral-300" : "text-black/85"
            )}>
              {description}
            </p>
          </div>

          {/* Optional Interactive / Visual Elements */}
          {children && (
            <div className="pt-2">
              {children}
            </div>
          )}
        </div>

        {/* CTA Action */}
        {cta && (
          <div className="pt-4 mt-auto">
            {href ? (
              <Link
                href={href}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "group/btn h-10 px-5 gap-2 font-bold tracking-[0.144px] rounded-[2px] transition-colors",
                  buttonStyle
                )}
              >
                <span>{cta}</span>
                <ArrowRight
                  className="size-4 transition-transform motion-safe:group-hover/btn:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-bold">
                <span>{cta}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
