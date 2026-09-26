"use client"

import React from "react"
import { useAccessibilityStore } from "@/store/useAccessibilityStore"

export default function Template({ children }: { children: React.ReactNode }) {
  const { reducedMotion } = useAccessibilityStore()

  return (
    <div
      className={
        reducedMotion
          ? "w-full flex-1 flex flex-col"
          : "w-full flex-1 flex flex-col motion-safe:animate-page-enter"
      }
    >
      {children}
    </div>
  )
}
