"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// React 19 / Next.js 16 compatibility: next-themes injects an inline script to prevent
// theme flash (FOUC), and third-party browser extensions inject DOM attributes (e.g. bis_skin_checked, bis_register, __processed_...)
if (process.env.NODE_ENV === "development") {
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    const text = args
      .map((a) => (typeof a === "string" ? a : a instanceof Error ? a.message : typeof a === "object" && a !== null ? JSON.stringify(a) : ""))
      .join(" ")

    if (
      text.includes("Encountered a script tag while rendering React component") ||
      (text.includes("[Voice Error]") && text.includes("aborted")) ||
      text.includes("bis_skin_checked") ||
      text.includes("bis_register") ||
      text.includes("__processed_") ||
      (text.includes("hydration") && (text.includes("extension") || text.includes("didn't match the client properties") || text.includes("bis_")))
    ) {
      return
    }
    originalError.apply(console, args)
  }
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
