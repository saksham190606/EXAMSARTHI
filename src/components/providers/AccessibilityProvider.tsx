"use client"

import React, { useEffect } from 'react'
import { useAccessibilityStore } from '@/store/useAccessibilityStore'

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const { textSize, contrast, reducedMotion } = useAccessibilityStore()

  useEffect(() => {
    const html = document.documentElement

    // Handle Text Size
    html.classList.remove('text-large', 'text-xlarge')
    if (textSize === 'large') {
      html.classList.add('text-large')
    } else if (textSize === 'xlarge') {
      html.classList.add('text-xlarge')
    }

    // Handle Contrast
    if (contrast === 'high') {
      html.classList.add('high-contrast')
    } else {
      html.classList.remove('high-contrast')
    }

    // Handle Reduced Motion
    if (reducedMotion) {
      html.classList.add('reduced-motion')
    } else {
      html.classList.remove('reduced-motion')
    }

  }, [textSize, contrast, reducedMotion])

  return <>{children}</>
}
