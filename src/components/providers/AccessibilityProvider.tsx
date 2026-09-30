"use client"

import React, { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAccessibilityStore } from '@/store/useAccessibilityStore'
import { 
  initFocusTalkBack, 
  voiceEngine,
  stopSpeech,
  speak,
  unlockAudioContext,
} from '@/lib/accessibility/voice-companion'
import { playVoiceFeedbackChime } from '@/lib/voice/intent-parser'
import { useVoiceEngine } from '@/lib/voice/useVoiceEngine'
import { Mic, MicOff, Volume2, ShieldAlert } from 'lucide-react'

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const { textSize, contrast, reducedMotion, language } = useAccessibilityStore()
  const router = useRouter()
  const pathname = usePathname()
  const [showKeyWarning, setShowKeyWarning] = useState(false)
  const lastKeyWarningTimeRef = useRef<number>(0)
  const keyWarningTimerRef = useRef<NodeJS.Timeout | null>(null)

  const { isListening, isSpeaking } = useVoiceEngine()

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

  // STRICT GLOBAL KEYBOARD BLOCKING (100% Voice-Based Platform, Enabled ONLY during Login / Auth)
  useEffect(() => {
    const handleKeyBlock = (e: KeyboardEvent) => {
      // 1. Allow developer bypasses for DevTools and page refresh
      if (
        e.key === 'F12' ||
        e.key === 'F5' ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'i' || e.key === 'I'))
      ) {
        return;
      }

      // 2. Allow keyboard input ONLY when user is logging in / signing up
      const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
      const isAuthRoute = 
        currentPath.startsWith('/login') || 
        currentPath.startsWith('/signup') || 
        currentPath.startsWith('/auth');

      const target = e.target as HTMLElement | null;
      const isAuthInput = Boolean(
        target && (
          target.closest('form')?.getAttribute('action')?.includes('auth') ||
          target.closest('form')?.getAttribute('action')?.includes('login') ||
          target.closest('[data-auth-container]') ||
          (isAuthRoute && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.isContentEditable))
        )
      );

      if (isAuthRoute || isAuthInput) {
        return;
      }

      // 3. Everywhere else across the platform, intercept and completely disable keyboard input
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const now = Date.now();
      if (now - lastKeyWarningTimeRef.current > 3500) {
        lastKeyWarningTimeRef.current = now;
        setShowKeyWarning(true);
        if (keyWarningTimerRef.current) clearTimeout(keyWarningTimerRef.current);
        keyWarningTimerRef.current = setTimeout(() => {
          setShowKeyWarning(false);
        }, 3200);

        playVoiceFeedbackChime();
        const isHi = useAccessibilityStore.getState().language === 'hi';
        speak(
          isHi 
            ? "कीबोर्ड केवल लॉगिन के समय सक्षम है। यह प्लेटफॉर्म पूरी तरह से आवाज द्वारा संचालित है। कृपया अपनी कमांड बोलें।"
            : "Keyboard is enabled only for logging in. This platform is voice operated. Please speak your command."
        );
      }
    };

    window.addEventListener('keydown', handleKeyBlock, { capture: true });
    window.addEventListener('keyup', handleKeyBlock, { capture: true });
    window.addEventListener('keypress', handleKeyBlock, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyBlock, { capture: true });
      window.removeEventListener('keyup', handleKeyBlock, { capture: true });
      window.removeEventListener('keypress', handleKeyBlock, { capture: true });
      if (keyWarningTimerRef.current) clearTimeout(keyWarningTimerRef.current);
    };
  }, [pathname]);

  // Initialize Continuous Audio Companion & Always-On Voice Navigation
  useEffect(() => {
    // Eagerly prime Chromium SpeechSynthesis engine voices
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.getVoices();
      } catch (_) {}
    }

    // Connect Next.js router to voice navigation engine
    voiceEngine.setRouter((path) => router.push(path));

    // Global Talk-Back Engine for element focus
    const cleanupFocus = initFocusTalkBack();

    // Start continuous always-on voice recognition immediately
    unlockAudioContext();
    voiceEngine.startAlwaysOnListening();

    // Browser interaction listener to guarantee mic activation if autoplay policy restricted initial start
    const handleUserGesture = () => {
      unlockAudioContext();
      voiceEngine.startAlwaysOnListening();
    };

    window.addEventListener('pointerdown', handleUserGesture, { passive: true });
    window.addEventListener('click', handleUserGesture, { passive: true });

    return () => {
      cleanupFocus();
      stopSpeech();
      window.removeEventListener('pointerdown', handleUserGesture);
      window.removeEventListener('click', handleUserGesture);
    };
  }, [router]);

  return (
    <>
      {children}

      {/* Keyboard Disabled Alert Toast */}
      {showKeyWarning && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-14 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-xl bg-amber-500/95 dark:bg-amber-600/95 text-white font-semibold shadow-2xl backdrop-blur-md border border-amber-300/40 animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          <ShieldAlert className="h-5 w-5 shrink-0 animate-bounce" />
          <div className="text-sm">
            <span className="font-bold">
              {language === 'hi' ? 'कीबोर्ड अक्षम है (100% वॉइस मोड):' : 'Keyboard Disabled (100% Voice Mode):'}
            </span>{' '}
            {language === 'hi'
              ? "डैशबोर्ड, प्रैक्टिस, परीक्षा, परिणाम या सेटिंग्स बोलें।"
              : "Speak 'Dashboard', 'Practice', 'Exams', 'Results', or 'Settings'."}
          </div>
        </div>
      )}

      {/* 100% Voice Mode Live Status Indicator */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[9998] flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-md border transition-all duration-300 pointer-events-none select-none bg-background/90 text-foreground border-border/80"
      >
        {isSpeaking ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
            <Volume2 className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              {language === 'hi' ? 'साथी बोल रहा है (माइक रुका हुआ)' : 'Companion Speaking (Mic Paused)'}
            </span>
          </>
        ) : isListening ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <Mic className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {language === 'hi' ? 'माइक सक्रिय (सुन रहा है)' : 'Mic Live (Listening Always)'}
            </span>
          </>
        ) : (
          <>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            <MicOff className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-muted-foreground font-semibold">
              {language === 'hi' ? 'वॉइस कनेक्ट हो रहा है...' : 'Voice Connecting...'}
            </span>
          </>
        )}
      </div>
    </>
  )
}
