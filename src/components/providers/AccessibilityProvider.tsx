"use client"

import React, { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAccessibilityStore } from '@/store/useAccessibilityStore'
import { 
  initFocusTalkBack, 
  voiceEngine,
  stopSpeech,
  speak,
  forceSpeak,
  unlockAudioContext,
  WELCOME_TOUR_TEXT_EN,
  WELCOME_TOUR_TEXT_HI,
} from '@/lib/accessibility/voice-companion'
import { playVoiceFeedbackChime } from '@/lib/voice/intent-parser'
import { isExamSessionActive } from '@/lib/assistant/sarthiExamLock'
import { useVoiceEngine } from '@/lib/voice/useVoiceEngine'
import { Mic, MicOff, Volume2, ShieldAlert } from 'lucide-react'

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const { textSize, contrast, colorTheme, reducedMotion, language, accessibilityMode } = useAccessibilityStore()
  const router = useRouter()
  const pathname = usePathname()
  const [showKeyWarning, setShowKeyWarning] = useState(false)
  const lastKeyWarningTimeRef = useRef<number>(0)
  const keyWarningTimerRef = useRef<NodeJS.Timeout | null>(null)

  const { isListening, isSpeaking } = useVoiceEngine()

  // Handle visual accessibility tokens (Text scaling, Contrast, Color Theme, Reduced Motion)
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

    // Handle Color Blindness / Vision Themes
    html.classList.remove('theme-deuteranopia', 'theme-tritanopia', 'theme-monochrome', 'theme-sepia')
    if (colorTheme && colorTheme !== 'default') {
      html.classList.add(`theme-${colorTheme}`)
    }

    // Handle Reduced Motion
    if (reducedMotion) {
      html.classList.add('reduced-motion')
    } else {
      html.classList.remove('reduced-motion')
    }
  }, [textSize, contrast, colorTheme, reducedMotion])

  // STRICT GLOBAL KEYBOARD BLOCKING (Active ONLY in Voice Accessibility mode outside auth)
  useEffect(() => {
    // If candidate selected Keyboard & Navigation Mode, NEVER intercept or block keyboard
    if (accessibilityMode === 'keyboard') {
      return;
    }

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

      // 2. Allow keyboard input when user is logging in / signing up, or on landing page to choose accessibility mode
      const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
      const isLanding = currentPath === '/' || currentPath === '' || currentPath.endsWith(':3000/');
      if (isLanding) {
        // Landing page allows keyboard navigation & hotkeys (V, K, 1, 2, Enter, Tab, etc.)
        return;
      }

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

        const isHi = useAccessibilityStore.getState().language === 'hi';
        playVoiceFeedbackChime();
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
  }, [pathname, accessibilityMode]);

  // Initialize Continuous Audio Companion & Always-On Voice Navigation
  useEffect(() => {
    // If in keyboard mode: stop continuous voice recognition engine, but activate focus talk-back for partially visually impaired users
    if (accessibilityMode === 'keyboard') {
      voiceEngine.stop();
      if (typeof window !== 'undefined') {
        (window as any).__alwaysListening = false;
      }
      const cleanupFocus = initFocusTalkBack();
      return () => {
        cleanupFocus();
      };
    }

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

    // Start continuous always-on voice recognition immediately (except on landing page where it opens after brief)
    unlockAudioContext();
    const isLanding = typeof window !== 'undefined' && (window.location.pathname === '/' || window.location.pathname === '');
    if (!isLanding) {
      voiceEngine.startAlwaysOnListening();
    }

    // Browser interaction listener to guarantee mic activation if autoplay policy restricted initial start
    const handleUserGesture = () => {
      if (useAccessibilityStore.getState().accessibilityMode === 'keyboard') return;
      unlockAudioContext();
      const onLanding = typeof window !== 'undefined' && (window.location.pathname === '/' || window.location.pathname === '');
      if (!onLanding) {
        voiceEngine.startAlwaysOnListening();
      }
    };

    window.addEventListener('pointerdown', handleUserGesture, { passive: true });
    window.addEventListener('click', handleUserGesture, { passive: true });

    return () => {
      cleanupFocus();
      stopSpeech();
      window.removeEventListener('pointerdown', handleUserGesture);
      window.removeEventListener('click', handleUserGesture);
    };
  }, [router, accessibilityMode]);

  // KEYBOARD NAVIGATION & AUDITORY PRONUNCIATION FOR PARTIALLY VISUALLY IMPAIRED USERS
  useEffect(() => {
    if (accessibilityMode !== 'keyboard') return;

    const handleKeyNav = (e: KeyboardEvent) => {
      // Allow developer bypasses
      if (
        e.key === 'F12' ||
        e.key === 'F5' ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'i' || e.key === 'I'))
      ) {
        return;
      }

      // Allow typing inside text inputs, textareas, and contentEditable
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.getAttribute('role') === 'textbox'
      );

      // If user is typing in a text field, do not hijack single keys unless Alt is held
      if (isInput && !e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();
      const isHi = useAccessibilityStore.getState().language === 'hi';

      // Check if inside active exam session or on exam path with query params
      const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const isExamActive = 
        currentPath.startsWith('/exam') && 
        (search.includes('exam=') || 
         search.includes('set=') || 
         isExamSessionActive() || 
         (typeof window !== 'undefined' && window.sessionStorage.getItem('examsarthi_active_session') === 'true'));

      if (isExamActive) {
        // STRICT EXAM INTEGRITY LOCKDOWN:
        // When taking an exam, DO NOT hijack keys!
        // Keys 1-4, A-D, N, P, R, O, F, C, T, Alt+S, Alt+D belong strictly to the Active Exam Engine!
        return;
      }

      // 1. Exam Hub (E or Alt+E)
      if (key === 'e' || (e.altKey && key === 'e')) {
        e.preventDefault();
        speak(isHi ? 'परीक्षा केंद्र' : 'Exam', { cancelPrevious: true, langOverride: isHi ? 'hi-IN' : 'en-US' });
        router.push('/exam');
        return;
      }

      // 2. Dashboard (D or Alt+D) - Do not hijack if Alt+D is intended for DiagramDescriber
      if ((key === 'd' && !e.altKey) || (e.altKey && key === 'd' && !document.querySelector('[data-diagram-describer]'))) {
        e.preventDefault();
        speak(isHi ? 'डैशबोर्ड' : 'Dashboard', { cancelPrevious: true, langOverride: isHi ? 'hi-IN' : 'en-US' });
        router.push('/dashboard');
        return;
      }

      // 3. Practice Section (P or Alt+P)
      if (key === 'p' || (e.altKey && key === 'p')) {
        e.preventDefault();
        speak(isHi ? 'अभ्यास' : 'Practice', { cancelPrevious: true, langOverride: isHi ? 'hi-IN' : 'en-US' });
        router.push('/practice');
        return;
      }

      // 4. Results (R or Alt+R)
      if (key === 'r' || (e.altKey && key === 'r')) {
        e.preventDefault();
        speak(isHi ? 'परिणाम' : 'Results', { cancelPrevious: true, langOverride: isHi ? 'hi-IN' : 'en-US' });
        router.push('/results');
        return;
      }

      // 5. Sarthi AI Assistant (S or Alt+S)
      if (key === 's' || (e.altKey && key === 's')) {
        const isAuthOrLanding = currentPath === '/' || currentPath === '' || currentPath.startsWith('/login') || currentPath.startsWith('/signup');
        if (isAuthOrLanding) {
          return;
        }
        e.preventDefault();
        speak(isHi ? 'सारथी सहायक' : 'Sarthi AI Assistant', { cancelPrevious: true, langOverride: isHi ? 'hi-IN' : 'en-US' });
        window.dispatchEvent(new CustomEvent('examsarthi-open-sarthi'));
        return;
      }

      // 6. Home (H or Alt+H)
      if (key === 'h' || (e.altKey && key === 'h')) {
        e.preventDefault();
        speak(isHi ? 'होम' : 'Home', { cancelPrevious: true, langOverride: isHi ? 'hi-IN' : 'en-US' });
        router.push('/');
        return;
      }

      // 7. Toggle Language (L or Alt+L)
      if (key === 'l' || (e.altKey && key === 'l')) {
        e.preventDefault();
        const currentLang = useAccessibilityStore.getState().language;
        const nextLang = currentLang === 'hi' ? 'en' : 'hi';
        useAccessibilityStore.getState().setLanguage(nextLang);
        speak(
          nextLang === 'hi' ? 'भाषा बदलकर हिंदी की गई।' : 'Language switched to English.',
          { cancelPrevious: true, langOverride: nextLang === 'hi' ? 'hi-IN' : 'en-US' }
        );
        return;
      }

      // 8. Toggle Contrast (C or Alt+C)
      if (key === 'c' || (e.altKey && key === 'c')) {
        e.preventDefault();
        const cur = useAccessibilityStore.getState().contrast;
        const next = cur === 'high' ? 'default' : 'high';
        useAccessibilityStore.getState().setContrast(next);
        speak(
          next === 'high' 
            ? (isHi ? 'उच्च कंट्रास्ट मोड सक्षम किया गया।' : 'High contrast mode enabled.')
            : (isHi ? 'सामान्य कंट्रास्ट मोड सक्षम किया गया।' : 'Standard contrast mode enabled.'),
          { cancelPrevious: true, langOverride: isHi ? 'hi-IN' : 'en-US' }
        );
        return;
      }

      // 9. Color Vision Palette Cycle (T or Alt+T)
      if (key === 't' || (e.altKey && key === 't')) {
        e.preventDefault();
        const currentTheme = useAccessibilityStore.getState().colorTheme;
        const order: ('default' | 'deuteranopia' | 'tritanopia' | 'monochrome' | 'sepia')[] = [
          'default', 'deuteranopia', 'tritanopia', 'monochrome', 'sepia'
        ];
        const nextIndex = (order.indexOf(currentTheme) + 1) % order.length;
        const next = order[nextIndex];
        useAccessibilityStore.getState().setColorTheme(next);
        const themeLabels: Record<string, { hi: string; en: string }> = {
          default: { hi: 'मानक डिफ़ॉल्ट थीम', en: 'Default standard dark amber theme' },
          deuteranopia: { hi: 'ड्यूटरेनोपिया (लाल-हरा सुरक्षित)', en: 'Deuteranopia red-green safe palette' },
          tritanopia: { hi: 'ट्रिटेनोपिया (नीला-पीला सुरक्षित)', en: 'Tritanopia blue-yellow safe palette' },
          monochrome: { hi: 'मोनोक्रोम उच्च-कंट्रास्ट', en: 'Monochrome high-contrast grayscale palette' },
          sepia: { hi: 'वार्म सेपिया कम्फर्ट', en: 'Warm sepia eye-comfort palette' },
        };
        const label = themeLabels[next] ? (isHi ? themeLabels[next].hi : themeLabels[next].en) : next;
        speak(label, { cancelPrevious: true, langOverride: isHi ? 'hi-IN' : 'en-US' });
        return;
      }

      // 10. Keyboard Shortcuts Guide (? or Shift+/)
      if (key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault();
        const help = isHi
          ? 'नेविगेशन शॉर्टकट: परीक्षा के लिए ई, डैशबोर्ड के लिए डी, अभ्यास के लिए पी, परिणाम के लिए आर, सारथी सहायक के लिए एस, रंग थीम के लिए टी, भाषा के लिए एल, कंट्रास्ट के लिए सी दबाएं। आगे बढ़ने के लिए टैब का उपयोग करें।'
          : 'Navigation shortcuts: Press E for Exam, D for Dashboard, P for Practice, R for Results, S for Sarthi Assistant, T for Color Themes, L for Language, C for Contrast. Use Tab to navigate elements.';
        speak(help, { cancelPrevious: true, langOverride: isHi ? 'hi-IN' : 'en-US' });
        return;
      }
    };

    window.addEventListener('keydown', handleKeyNav);
    return () => window.removeEventListener('keydown', handleKeyNav);
  }, [accessibilityMode, pathname, router]);

  const isLandingRoute = pathname === '/' || !pathname || pathname === '';

  return (
    <>
      {children}

      {/* Keyboard Disabled Alert Toast (only shown in voice mode when key is pressed outside auth) */}
      {showKeyWarning && accessibilityMode !== 'keyboard' && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-14 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-xl bg-amber-500/95 dark:bg-amber-600/95 text-white font-semibold shadow-2xl backdrop-blur-md border border-amber-300/40 animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          <ShieldAlert className="h-5 w-5 shrink-0 animate-bounce" />
          <div className="text-sm">
            <span className="font-bold">
              {language === 'hi'
                ? (isLandingRoute ? 'एग्जामसारथी में आपका स्वागत है:' : 'कीबोर्ड अक्षम है (100% वॉइस मोड):')
                : (isLandingRoute ? 'Welcome to ExamSarthi:' : 'Keyboard Disabled (100% Voice Mode):')}
            </span>{' '}
            {language === 'hi'
              ? (isLandingRoute ? "लॉगिन करने के लिए 'लॉगिन' बोलें।" : "डैशबोर्ड, प्रैक्टिस, परीक्षा, परिणाम या सेटिंग्स बोलें।")
              : (isLandingRoute ? "Say 'Login' to sign in to your account." : "Speak 'Dashboard', 'Practice', 'Exams', 'Results', or 'Settings'.")}
          </div>
        </div>
      )}

      {/* Accessibility Live Status Indicator - Hidden on root landing page */}
      {!isLandingRoute && (
        accessibilityMode === 'keyboard' ? (
          <div
            aria-live="polite"
            className="fixed bottom-4 left-16 z-[9998] flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-md backdrop-blur-md border transition-all duration-300 select-none bg-background/90 text-foreground border-border/80"
          >
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            <span>
              {language === 'hi' 
                ? 'कीबोर्ड मोड (E: परीक्षा | D: डैशबोर्ड | S: सारथी | ?: मदद)' 
                : 'Keyboard Mode (E: Exam | D: Dashboard | S: Sarthi | ?: Help)'}
            </span>
          </div>
        ) : (
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
        )
      )}
    </>
  )
}
