'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Volume2, ShieldCheck, Sparkles, Mic, Keyboard } from 'lucide-react';
import { useAccessibilityStore } from '@/lib/store/accessibility';
import ExamSelectorModal from '@/components/exam/ExamSelectorModal';
import { requestMicPermission } from '@/lib/accessibility/mic-permission';
import { voiceEngine, speak, forceSpeak, stopSpeech, unlockAudioContext } from '@/lib/accessibility/voice-companion';
import { subscribe } from '@/lib/voice/useVoiceEngine';
import { cn } from '@/lib/utils';

import { 
  matchNavigationIntent, 
  DASHBOARD_KEYWORDS, 
  EXAMS_KEYWORDS, 
  PRACTICE_KEYWORDS, 
  SETTINGS_KEYWORDS, 
  LOGIN_KEYWORDS 
} from '@/components/layout/VoiceNavigation';

export { DASHBOARD_KEYWORDS, EXAMS_KEYWORDS, PRACTICE_KEYWORDS, SETTINGS_KEYWORDS, LOGIN_KEYWORDS };

export const matchIntent = (text: string): 'DASHBOARD' | 'EXAMS' | 'PRACTICE' | 'PRACTICE_GK' | 'SETTINGS' | 'LOGIN' | 'UNKNOWN' => {
  const match = matchNavigationIntent(text);
  return match ? match.target : 'UNKNOWN';
};

interface ExamBadge {
  name: string;
  tag: string;
}

const EXAM_BODIES: ExamBadge[] = [
  { name: 'UPSC Civil Services', tag: 'CSE / Prelims' },
  { name: 'Staff Selection Commission', tag: 'SSC CGL / CHSL' },
  { name: 'IBPS Banking', tag: 'PO / Clerk / SO' },
  { name: 'Railway Recruitment Board', tag: 'RRB NTPC / Group D' },
  { name: 'State Public Service', tag: 'State PSC / PCS' },
];

const STUDENT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80',
];

export function ExamTickerBar() {
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);

  return (
    <section className="border-t border-b border-black/10 dark:border-white/10 bg-transparent py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50 mb-4">
          Curated Question Banks & Mock Patterns For
        </p>

        <div className="relative overflow-hidden w-full">
          {reducedMotion ? (
            <div className="flex flex-wrap justify-center gap-4">
              {EXAM_BODIES.map((exam, idx) => (
                <div key={idx} className="rounded-[2px] border border-black/10 dark:border-white/10 bg-white dark:bg-black px-4 py-2 text-center">
                  <span className="block text-xs font-bold text-black dark:text-white">{exam.name}</span>
                  <span className="block text-[10px] text-black/60 dark:text-white/60">{exam.tag}</span>
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              className="flex gap-6 w-max"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ repeat: Infinity, ease: 'linear', duration: 25 }}
            >
              {[...EXAM_BODIES, ...EXAM_BODIES].map((exam, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-[2px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#111111] px-5 py-2.5 shadow-sm"
                >
                  <div className="h-2 w-2 rounded-full bg-[#ffed00]" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-black dark:text-white leading-tight">{exam.name}</p>
                    <p className="text-[10px] text-black/60 dark:text-white/60">{exam.tag}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function ExamSarthiHero() {
  const router = useRouter();
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const isListening = useAccessibilityStore((state) => state.isListeningCommands);
  const language = useAccessibilityStore((state) => state.language);
  const isHindi = language === 'hi';

  const hasSpokenBriefSuccessfullyRef = useRef(false);
  const isSpeakingBriefRef = useRef(false);
  const isNavigatingToLoginRef = useRef(false);

  const toggleListening = useCallback(() => {
    voiceEngine.toggle();
  }, []);

  // 1. Initial Voice Assistant Brief on Landing Page
  const playBrief = useCallback((force: boolean = false) => {
    if (!force && hasSpokenBriefSuccessfullyRef.current) return;
    if (isSpeakingBriefRef.current) return;

    // Strictly stop microphone while the launch brief is playing so it doesn't listen to itself
    voiceEngine.stop();
    useAccessibilityStore.getState().setIsListeningCommands(false);

    const briefText = isHindi
      ? "एग्जामसारथी में आपका स्वागत है। दृष्टिबाधित अभ्यर्थियों के लिए भारत का सुलभ परीक्षा और अभ्यास मंच। क्या आप वॉइस एक्सेसिबिलिटी या कीबोर्ड और नेविगेशन के साथ आगे बढ़ना चाहते हैं? कृपया 'वॉइस एक्सेसिबिलिटी' या 'कीबोर्ड नेविगेशन' बोलें, अथवा कीबोर्ड पर V या K दबाएं।"
      : "Welcome to ExamSarthi, India's accessible examination and practice platform for visually impaired candidates. Would you like to proceed with voice accessibility or keyboard navigation? Please say 'Voice accessibility' or 'Keyboard navigation', or press V for voice or K for keyboard.";

    unlockAudioContext();
    isSpeakingBriefRef.current = true;

    forceSpeak(
      briefText,
      () => {
        isSpeakingBriefRef.current = false;
        hasSpokenBriefSuccessfullyRef.current = true;
        // ONLY AFTER completing the launch brief: open the mic for user to say their choice!
        unlockAudioContext();
        setTimeout(() => {
          voiceEngine.startAlwaysOnListening();
        }, 200);
      },
      isHindi ? 'hi-IN' : 'en-US',
      (err) => {
        console.warn("[ExamSarthiHero] Brief speech deferred until user gesture:", err);
        isSpeakingBriefRef.current = false;
      }
    );
  }, [isHindi]);

  // Mode Selection Handler: Voice or Keyboard
  const handleSelectMode = useCallback((mode: 'voice' | 'keyboard') => {
    if (isNavigatingToLoginRef.current) return;
    isNavigatingToLoginRef.current = true;

    useAccessibilityStore.getState().setAccessibilityMode(mode);

    if (mode === 'keyboard') {
      stopSpeech();
      try {
        window.speechSynthesis?.cancel();
      } catch (_) {}
      voiceEngine.stop();
      if (typeof window !== 'undefined') {
        (window as any).__alwaysListening = false;
      }
      router.push('/login');
    } else {
      unlockAudioContext();
      const confirmMsg = isHindi
        ? "वॉइस एक्सेसिबिलिटी चुनी गई। लॉगिन पृष्ठ खोला जा रहा है।"
        : "Voice accessibility selected. Opening login page.";
      speak(confirmMsg, {
        lang: isHindi ? 'hi-IN' : 'en-US',
        onEnd: () => {
          router.push('/login');
        },
      });
      setTimeout(() => {
        router.push('/login');
      }, 1200);
    }
  }, [router, isHindi]);

  // Keyboard shortcut listener on landing page (V for voice, K for keyboard, 1 or 2)
  useEffect(() => {
    const handleKeySelect = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'v' || e.key === 'V' || e.key === '1') {
        e.preventDefault();
        handleSelectMode('voice');
      } else if (e.key === 'k' || e.key === 'K' || e.key === '2') {
        e.preventDefault();
        handleSelectMode('keyboard');
      }
    };

    window.addEventListener('keydown', handleKeySelect);
    return () => window.removeEventListener('keydown', handleKeySelect);
  }, [handleSelectMode]);

  useEffect(() => {
    // Attempt automatic playback shortly after mount
    const timer = setTimeout(() => {
      playBrief(false);
    }, 400);

    // Guaranteed trigger on ANY first user gesture (touch, click, key) if browser blocked autoplay
    const handleGesture = () => {
      unlockAudioContext();
      if (!hasSpokenBriefSuccessfullyRef.current && !isSpeakingBriefRef.current) {
        playBrief(true);
      }
    };

    window.addEventListener('pointerdown', handleGesture, { passive: true });
    window.addEventListener('click', handleGesture, { passive: true });
    window.addEventListener('keydown', handleGesture, { passive: true });
    window.addEventListener('touchstart', handleGesture, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('keydown', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, [playBrief]);

  // 2. Continuous Voice Recognition Handler for Accessibility Choice
  useEffect(() => {
    let clearTimer: NodeJS.Timeout | null = null;

    return subscribe((transcript) => {
      setStatusMessage(transcript);
      if (clearTimer) clearTimeout(clearTimer);
      clearTimer = setTimeout(() => {
        setStatusMessage('');
      }, 4500);

      const lower = transcript.toLowerCase().trim();
      if (!lower) return;

      // Check for Keyboard & Navigation selection
      const isKeyboardChoice =
        lower.includes('keyboard and navigation') ||
        lower.includes('keyboard navigation') ||
        lower.includes('keyboard and navigations') ||
        lower.includes('keyboard mode') ||
        lower.includes('keyboard') ||
        lower.includes('कीबोर्ड') ||
        lower.includes('नेविगेशन') ||
        lower.includes('navigation') ||
        lower.includes('option 2') ||
        lower.includes('option two') ||
        lower.includes('विकल्प 2') ||
        lower.includes('दूसरा') ||
        lower === 'two' ||
        lower === '2';

      // Check for Voice Accessibility selection
      const isVoiceChoice =
        lower.includes('voice accessibility') ||
        lower.includes('voice mode') ||
        lower.includes('voice') ||
        lower.includes('वॉइस') ||
        lower.includes('वाइस') ||
        lower.includes('option 1') ||
        lower.includes('option one') ||
        lower.includes('विकल्प 1') ||
        lower.includes('पहला') ||
        lower === 'one' ||
        lower === '1';

      if (isKeyboardChoice) {
        handleSelectMode('keyboard');
      } else if (isVoiceChoice || lower.includes('login') || lower.includes('लॉगिन')) {
        handleSelectMode('voice');
      }
    });
  }, [handleSelectMode]);

  return (
    <div className="relative w-full overflow-hidden bg-transparent text-black dark:text-white transition-colors">
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#ffed00]/10 blur-[120px]" 
      />

      <section className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-3 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-4 py-1.5 backdrop-blur-sm"
          >
            <div className="flex -space-x-2 overflow-hidden">
              {STUDENT_AVATARS.map((src, i) => (
                <div key={i} className="relative inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-black overflow-hidden">
                  <Image 
                    alt="Aspirant community member" 
                    className="object-cover" 
                    fill 
                    sizes="24px" 
                    src={src} 
                    unoptimized 
                  />
                </div>
              ))}
            </div>
            <span className="text-xs font-medium text-black/80 dark:text-white/80">
              {isHindi ? "1,200+ अभ्यर्थी यूपीएससी, एसएससी और बैंकिंग की तैयारी में" : "1,200+ Aspirants Preparing for UPSC, SSC & Banking"}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
          >
            {isHindi ? (
              <>
                हर अभ्यर्थी के लिए सुलभ परीक्षा और{' '}
                <span className="relative whitespace-nowrap">
                  <span className="relative z-10 text-[#d4af37] dark:text-[#ffed00]">प्रैक्टिस मंच</span>
                </span>
              </>
            ) : (
              <>
                Accessible Examination & Practice for{' '}
                <span className="relative whitespace-nowrap">
                  <span className="relative z-10 text-[#d4af37] dark:text-[#ffed00]">Every Aspirant</span>
                </span>
              </>
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-2xl text-base sm:text-lg text-black/70 dark:text-white/70 leading-relaxed"
          >
            {isHindi 
              ? "उच्च-कंट्रास्ट कंप्यूटर आधारित टेस्ट, संवादात्मक द्विभाषी वॉइस नेविगेशन और दृष्टिबाधित अभ्यर्थियों के लिए मल्टीमॉडल विजन एआई स्क्राइब।"
              : "High-contrast Computer Based Tests, conversational voice navigation, and multimodal Vision AI scribes engineered for visually impaired candidates."}
          </motion.p>

          {/* Accessibility Mode Selection Prompt & Cards */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-8 w-full max-w-2xl px-2"
          >
            <div className="text-center mb-3">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#ffed00]/20 text-black dark:text-[#ffed00] border border-[#ffed00]/40">
                <Sparkles className="h-3.5 w-3.5" />
                {isHindi ? "कृपया अपनी सुलभता प्रणाली चुनें (बोलें या की दबाएं)" : "Choose Your Accessibility System (Speak or Press Key)"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Voice Accessibility */}
              <button
                type="button"
                onClick={() => handleSelectMode('voice')}
                className="group relative flex flex-col items-start p-5 rounded-xl border-2 border-[#ffed00] bg-black/5 dark:bg-[#161616] text-left transition-all hover:bg-[#ffed00]/10 hover:shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ffed00] cursor-pointer"
                aria-label={isHindi ? "वॉइस एक्सेसिबिलिटी मोड चुनें, V दबाएं या वॉइस बोलें" : "Select Voice Accessibility Mode, press V or say Voice"}
              >
                <div className="flex w-full items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-[#ffed00] text-black">
                    <Volume2 className="h-5 w-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#ffed00] text-black tracking-wide">
                    Press 'V' or Say 'Voice'
                  </span>
                </div>
                <h3 className="text-lg font-bold text-black dark:text-white group-hover:text-[#d4af37] dark:group-hover:text-[#ffed00] transition-colors">
                  {isHindi ? "वॉइस एक्सेसिबिलिटी" : "Voice Accessibility"}
                </h3>
                <p className="mt-1 text-xs text-black/70 dark:text-white/70 leading-relaxed">
                  {isHindi
                    ? "पूर्ण ऑडियो मार्गदर्शन, हैंड्स-फ्री वॉइस कमांड और विजन एआई चित्र स्क्राइब।"
                    : "Complete audio narration, hands-free spoken exam commands, and Vision AI diagram scribe."}
                </p>
                <span className="mt-3 text-xs font-semibold text-[#d4af37] dark:text-[#ffed00] flex items-center gap-1">
                  {isHindi ? "वॉइस मोड से लॉगिन करें" : "Proceed with Voice"} &rarr;
                </span>
              </button>

              {/* Option 2: Keyboard & Navigation */}
              <button
                type="button"
                onClick={() => handleSelectMode('keyboard')}
                className="group relative flex flex-col items-start p-5 rounded-xl border-2 border-black/20 dark:border-white/20 bg-black/5 dark:bg-[#161616] text-left transition-all hover:border-black/50 dark:hover:border-white/50 hover:bg-black/10 dark:hover:bg-white/5 hover:shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ffed00] cursor-pointer"
                aria-label={isHindi ? "कीबोर्ड और नेविगेशन मोड चुनें, K दबाएं या कीबोर्ड बोलें" : "Select Keyboard and Navigation Mode, press K or say Keyboard"}
              >
                <div className="flex w-full items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-black/10 dark:bg-white/10 text-black dark:text-white">
                    <Keyboard className="h-5 w-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold border border-black/30 dark:border-white/30 text-black dark:text-white tracking-wide">
                    Press 'K' or Say 'Keyboard'
                  </span>
                </div>
                <h3 className="text-lg font-bold text-black dark:text-white group-hover:underline transition-all">
                  {isHindi ? "कीबोर्ड और नेविगेशन" : "Keyboard & Navigation"}
                </h3>
                <p className="mt-1 text-xs text-black/70 dark:text-white/70 leading-relaxed">
                  {isHindi
                    ? "मानक कीबोर्ड शॉर्टकट, टैब नियंत्रण, कोई वॉइस एजेंट नहीं।"
                    : "Standard keyboard controls, Tab focus navigation, with zero voice agent prompts."}
                </p>
                <span className="mt-3 text-xs font-semibold text-black dark:text-white flex items-center gap-1">
                  {isHindi ? "कीबोर्ड मोड से लॉगिन करें" : "Proceed with Keyboard"} &rarr;
                </span>
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => playBrief(true)}
            title="Click to hear launch overview"
            className="mt-5 inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-neutral-950/90 border border-[#ffed00]/50 text-xs text-white shadow-lg backdrop-blur-md cursor-pointer hover:border-[#ffed00] transition-colors"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {statusMessage
                ? (isHindi ? `सुना: "${statusMessage}"` : `Heard: "${statusMessage}"`)
                : (isHindi 
                    ? "बोलें: 'वॉइस' (V दबाएं) अथवा 'कीबोर्ड' (K दबाएं)" 
                    : "Say: 'Voice' (Press V) or 'Keyboard' (Press K)")}
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-4"
          >
            <Link 
              className="inline-flex items-center gap-2 rounded-[2px] bg-[#ffed00] px-6 py-3 text-sm font-bold text-black shadow-sm transition hover:bg-[#e6d500] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffed00]" 
              href="/practice"
              onClick={() => { requestMicPermission(); }}
            >
              {isHindi ? "प्रैक्टिस शुरू करें (Alt+P)" : "Start Practice (Alt+P)"}
              <ArrowRight className="h-4 w-4"/>
            </Link>

            <button
              type="button"
              onClick={() => {
                requestMicPermission();
                setIsExamModalOpen(true);
              }}
              aria-haspopup="dialog"
              className="inline-flex items-center gap-2 rounded-[2px] border border-black/20 dark:border-white/20 bg-transparent px-6 py-3 text-sm font-semibold text-black dark:text-white transition hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffed00] cursor-pointer"
            >
              {isHindi ? "मॉक टेस्ट दें" : "Take Mock Exam"}
            </button>

            <button
              type="button"
              onClick={toggleListening}
              aria-label="Toggle voice navigation (Alt+V)"
              className={cn(
                "inline-flex items-center gap-2 rounded-[2px] border px-6 py-3 text-sm font-semibold transition cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffed00]",
                isListening
                  ? "bg-[#ffed00] text-black border-[#ffed00] shadow-[0_0_15px_rgba(255,237,0,0.5)] font-bold animate-pulse"
                  : "border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
              )}
            >
              <Mic className="h-4 w-4" />
              <span>
                {isListening
                  ? (isHindi ? "सुन रहे हैं..." : "Listening...")
                  : (isHindi ? "वॉइस नेविगेशन (Alt+V)" : "Voice Navigation (Alt+V)")}
              </span>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-black/60 dark:text-white/60 font-medium"
          >
            <div className="flex items-center gap-1.5">
              <Volume2 className="h-4 w-4 text-[#d4af37] dark:text-[#ffed00]"/>
              <span>{isHindi ? "पूर्ण द्विभाषी वॉइस व टॉकबैक" : "Full Voice & Screen-Reader TalkBack"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#d4af37] dark:text-[#ffed00]"/>
              <span>{isHindi ? "जेमिनी विजन एआई चित्र स्क्राइब" : "Gemini Vision AI Diagram Scribe"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#d4af37] dark:text-[#ffed00]"/>
              <span>WCAG 2.1 AA Compliant</span>
            </div>
          </motion.div>

        </div>
      </section>

      <ExamTickerBar/>

      <ExamSelectorModal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
      />
    </div>
  );
}
