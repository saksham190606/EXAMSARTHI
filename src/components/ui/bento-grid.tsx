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
        "grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
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
  children,
  ...props
}: BentoCardProps) {
  const cardTitle = title || name || ""

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 text-card-foreground shadow-sm transition-all duration-200 hover:border-primary/40 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20",
        className
      )}
      {...props}
    >
      {/* Background decoration */}
      {background && (
        <div
          className="absolute inset-0 pointer-events-none select-none overflow-hidden"
          aria-hidden="true"
        >
          {background}
        </div>
      )}

      {/* Card Content */}
      <div className="relative z-10 flex flex-col h-full justify-between gap-6">
        <div className="space-y-4">
          {/* Feature Icon */}
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-focus-within:bg-primary group-focus-within:text-primary-foreground">
            <Icon className="size-6" aria-hidden="true" />
          </div>

          {/* Heading and Description */}
          <div className="space-y-2">
            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              {cardTitle}
            </h3>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
              {description}
            </p>
          </div>

          {/* Optional Interactive / Visual Elements */}
          {children && (
            <div className="pt-1">
              {children}
            </div>
          )}
        </div>

        {/* CTA Action */}
        {cta && (
          <div className="pt-2">
            {href ? (
              <Link
                href={href}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "group/btn h-9 px-4 gap-2 font-medium border-border hover:border-primary/50 hover:bg-primary hover:text-primary-foreground transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary"
                )}
              >
                <span>{cta}</span>
                <ArrowRight
                  className="size-4 transition-transform motion-safe:group-hover/btn:translate-x-1 motion-safe:group-focus-within/btn:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                <span>{cta}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
