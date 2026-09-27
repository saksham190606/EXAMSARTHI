"use client"

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccessibilityStore } from '@/store/useAccessibilityStore'
import { 
  initGestureTrigger, 
  initFocusTalkBack, 
  initVoiceCommandHotkey, 
  voiceEngine,
  stopSpeech 
} from '@/lib/accessibility/voice-companion'

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const { textSize, contrast, reducedMotion } = useAccessibilityStore()
  const router = useRouter()

  // Handle visual accessibility tokens (Text scaling, Contrast, Reduced Motion)
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

  // Initialize Audio Companion & Voice Navigation Systems
  useEffect(() => {
    // Eagerly prime Chromium SpeechSynthesis engine voices
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.getVoices()
      } catch (_) {}
    }

    // Connect Next.js router to voice navigation engine
    voiceEngine.setRouter((path) => router.push(path))

    // Step 1: Automated Gesture Trigger (Tab or Space activates voice mode & spoken welcome tour)
    const cleanupGesture = initGestureTrigger()

    // Step 2: Global Tab Talk-Back Engine (focusin listener with clean speech cancellation)
    const cleanupFocus = initFocusTalkBack()

    // Step 3: Natural Voice Commands listener (Alt + V toggle)
    const cleanupHotkey = initVoiceCommandHotkey()

    return () => {
      cleanupGesture()
      cleanupFocus()
      cleanupHotkey()
      stopSpeech()
    }
  }, [router])

  return <>{children}</>
}
