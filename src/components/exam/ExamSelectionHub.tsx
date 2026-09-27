'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, HelpCircle, ArrowRight, Sparkles, BookOpen, Volume2, Mic, MicOff } from 'lucide-react';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { speak, getNaturalFemaleVoice } from '@/lib/accessibility/voice-companion';
import { requestMicPermission } from '@/lib/accessibility/mic-permission';
import { EXAM_VOICE_ROUTES, matchExamVoiceRoute, ExamVoiceRoute } from '@/lib/voice/exam-router';
import { cn } from '@/lib/utils';

export interface ExamCatalogItem {
  id: string;
  param: string;
  title: string;
  authority: string;
  questionsCount: number;
  durationMinutes: number;
  description: string;
  badge?: string;
  subjects: string[];
}

export const EXAM_CATALOG: ExamCatalogItem[] = [
  {
    id: 'ssc-cgl',
    param: 'cgl-mock-1',
    title: 'SSC CGL Tier-I Full Mock',
    authority: 'Staff Selection Commission',
    questionsCount: 12,
    durationMinutes: 15,
    description: 'Comprehensive test covering Quantitative Aptitude, General Intelligence, English, and General Awareness.',
    subjects: ['Quant', 'Reasoning', 'English', 'GK'],
  },
  {
    id: 'upsc-prelims',
    param: 'upsc-mock-1',
    title: 'UPSC CSE Prelims General Studies',
    authority: 'Union Public Service Commission',
    questionsCount: 9,
    durationMinutes: 15,
    description: 'High-yield conceptual questions across Indian Polity, History, Economy, and Current Events.',
    subjects: ['Polity', 'History', 'Economy', 'Science'],
  },
  {
    id: 'ibps-po',
    param: 'ibps-mock-1',
    title: 'IBPS PO Prelims Speed Mock',
    authority: 'Institute of Banking Personnel Selection',
    questionsCount: 12,
    durationMinutes: 15,
    badge: 'Sectional Timers',
    description: 'Focused sectional aptitude, logical puzzles, data interpretation, and verbal ability with dedicated sectional timing.',
    subjects: ['Reasoning', 'Quantitative', 'English'],
  },
  {
    id: 'rrb-ntpc',
    param: 'rrb-mock-1',
    title: 'RRB NTPC Stage-I CBT',
    authority: 'Railway Recruitment Board',
    questionsCount: 12,
    durationMinutes: 15,
    description: 'Railway recruitment computer-based examination pattern with adaptive pacing.',
    subjects: ['General Awareness', 'Mathematics', 'General Intelligence'],
  },
  {
    id: 'vision-ai-diagram',
    param: 'p6',
    title: 'Diagram & Visual Interpretation (Vision AI)',
    authority: 'Multimodal Assistive Scribe Test',
    questionsCount: 4,
    durationMinutes: 10,
    badge: 'Vision AI Scribe Enabled',
    description: 'Special assistive set featuring diagrams, flowcharts, circuits, and geometry described using Gemini Vision AI (Alt+D).',
    subjects: ['Geometry', 'Bar Charts', 'Circuits', 'Flowcharts'],
  },
];

export function ExamSelectionHub() {
  const router = useRouter();
  const language = useAccessibilityStore((state) => state.language);
  const isHindi = language === 'hi';

  // Voice Router States
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(true);
  const [highlightedExamId, setHighlightedExamId] = useState<string | null>(null);
  const [launchingTitle, setLaunchingTitle] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isLaunchingRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const isVoiceActiveRef = useRef<boolean>(true);
  const isHindiRef = useRef<boolean>(isHindi);

  useEffect(() => {
    isVoiceActiveRef.current = isVoiceActive;
  }, [isVoiceActive]);

  useEffect(() => {
    isHindiRef.current = isHindi;
  }, [isHindi]);

  // Announce the exam selection screen upon landing
  useEffect(() => {
    speak(
      isHindi
        ? 'परीक्षा चयन केंद्र। कोई भी परीक्षा चुनने के लिए उसका नाम बोलें—जैसे यूपीएससी, सीजीएल, बैंक पीओ या रेलवे।'
        : 'Exam Selection Hub. Say any exam title to launch—such as UPSC, CGL, Bank PO, Railway, or Vision AI.',
      { cancelPrevious: true, langOverride: isHindi ? 'hi' : 'en' }
    );
  }, [isHindi]);

  // 3. Instant Launch & Auditory Feedback
  const launchExam = useCallback(async (route: { id: string; param: string; title: string }) => {
    if (isLaunchingRef.current) return;
    isLaunchingRef.current = true;

    // 1. Stop speech listener to avoid audio collisions
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    setLaunchingTitle(route.title);
    setHighlightedExamId(route.id);

    // 4. Smoothly focus and scroll to the exam card
    const cardEl = document.getElementById(`exam-card-${route.id}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 2. Announce immediately via speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}

      const announcement = isHindiRef.current
        ? `${route.title} शुरू किया जा रहा है...`
        : `Opening ${route.title}...`;

      const utterance = new SpeechSynthesisUtterance(announcement);
      utterance.lang = isHindiRef.current ? 'hi-IN' : 'en-US';
      utterance.rate = 1.0;

      const voice = getNaturalFemaleVoice(isHindiRef.current ? 'hi' : 'en');
      if (voice) {
        utterance.voice = voice;
      }

      utteranceRef.current = utterance;
      (window as any).__activeUtterance = utterance;
      isSpeakingRef.current = true;

      utterance.onend = async () => {
        isSpeakingRef.current = false;
        utteranceRef.current = null;
        try {
          await requestMicPermission();
        } catch (e) {}
        router.push(`/exam?set=${route.param}`);
      };

      utterance.onerror = async () => {
        isSpeakingRef.current = false;
        utteranceRef.current = null;
        try {
          await requestMicPermission();
        } catch (e) {}
        router.push(`/exam?set=${route.param}`);
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        isSpeakingRef.current = false;
        router.push(`/exam?set=${route.param}`);
      }
    } else {
      router.push(`/exam?set=${route.param}`);
    }

    // Fallback safety timeout if utterance end does not fire
    setTimeout(async () => {
      try {
        await requestMicPermission();
      } catch (e) {}
      router.push(`/exam?set=${route.param}`);
    }, 1400);
  }, [router]);

  // Safe Recognition Start
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isLaunchingRef.current || isSpeakingRef.current || !isVoiceActiveRef.current) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = isHindiRef.current ? 'hi-IN' : 'en-US';
        recognitionRef.current.start();
      } catch (e: any) {
        // Ignore InvalidStateError if already listening
      }
    }
  }, []);

  // Safe Recognition Stop
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  }, []);

  // Toggle voice recognition
  const toggleVoiceMode = useCallback(() => {
    if (isVoiceActive) {
      setIsVoiceActive(false);
      isVoiceActiveRef.current = false;
      stopListening();
    } else {
      setIsVoiceActive(true);
      isVoiceActiveRef.current = true;
      startListening();
    }
  }, [isVoiceActive, stopListening, startListening]);

  // 4. Page-Level Voice Listener Initialization
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Short discrete cycles avoid Windows Chromium dead-mic bug
    recognition.interimResults = false;
    recognition.lang = isHindi ? 'hi-IN' : 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      if (isLaunchingRef.current || isSpeakingRef.current) return;

      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) return;

      setLastTranscript(transcript);
      console.log('[ExamSelectionHub VoiceRouter] Captured speech:', transcript);

      // 2. Match via robust partial / fuzzy matching algorithm
      const matched = matchExamVoiceRoute(transcript);
      if (matched) {
        launchExam(matched);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[ExamSelectionHub VoiceRouter] Recognition notice:', event?.error);
    };

    // On recognition.onend: automatically restart listening if user remains on selection screen
    recognition.onend = () => {
      setTimeout(() => {
        if (
          isVoiceActiveRef.current && 
          !isLaunchingRef.current && 
          !isSpeakingRef.current && 
          recognitionRef.current
        ) {
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }
      }, 150);
    };

    if (isVoiceActiveRef.current && !isLaunchingRef.current) {
      try {
        recognition.start();
      } catch (e) {}
    }

    return () => {
      try {
        recognition.abort();
      } catch (e) {}
    };
  }, [isHindi, launchExam]);

  // Alt+M Keyboard Shortcut to toggle Voice Router
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.altKey && (e.key === 'm' || e.key === 'M' || e.code === 'KeyM')) {
        e.preventDefault();
        toggleVoiceMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleVoiceMode]);

  return (
    <div className="min-h-screen bg-black text-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 text-left">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div className="inline-flex items-center gap-2 rounded-[2px] bg-[#ffed00]/10 border border-[#ffed00]/30 px-3 py-1 text-xs font-bold text-[#ffed00]">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true"/>
              <span>OFFICIAL MOCK PORTAL</span>
            </div>

            {/* 4. Page-Level Voice Status Pill */}
            <div className="flex items-center gap-2">
              {isVoiceActive ? (
                <button
                  type="button"
                  onClick={toggleVoiceMode}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer select-none",
                    launchingTitle
                      ? "bg-emerald-950/90 text-emerald-300 border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse"
                      : "bg-neutral-950/90 text-[#ffed00] border-2 border-[#ffed00] shadow-[0_0_18px_rgba(255,237,0,0.35)] animate-pulse hover:bg-[#ffed00]/15"
                  )}
                  title="Intelligent Voice Router Active. Click or press Alt+M to mute"
                  aria-label="Intelligent Voice Router: Active. Say UPSC, CGL, Bank PO, Railway, or Vision AI"
                >
                  <span className="relative flex size-2.5 items-center justify-center">
                    <span className={cn(
                      "absolute -inset-1 rounded-full animate-ping opacity-75",
                      launchingTitle ? "bg-emerald-400" : "bg-[#ffed00]"
                    )} />
                    <span className={cn(
                      "size-2 rounded-full",
                      launchingTitle ? "bg-emerald-400" : "bg-[#ffed00]"
                    )} />
                  </span>
                  <span className="truncate max-w-[280px] sm:max-w-md">
                    {launchingTitle ? (
                      isHindi ? `🟢 ${launchingTitle} शुरू हो रहा है...` : `🟢 Opening ${launchingTitle}...`
                    ) : lastTranscript ? (
                      `🎙️ Heard: "${lastTranscript}" · Say 'UPSC', 'CGL', 'Bank PO', 'Railway', 'Vision AI'`
                    ) : (
                      isHindi 
                        ? "🎙️ सुन रहा है... (बोलें 'UPSC', 'CGL', 'Bank PO', 'Railway', या 'Vision AI')" 
                        : "🎙️ Listening... (Say 'UPSC', 'CGL', 'Bank PO', 'Railway', or 'Vision AI')"
                    )}
                  </span>
                  <kbd className="hidden sm:inline px-1.5 py-0.5 text-2xs bg-black/80 text-[#ffed00] border border-[#ffed00]/40 rounded font-mono">
                    Alt+M
                  </kbd>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleVoiceMode}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-semibold bg-neutral-900 text-white/70 border border-white/20 hover:text-white transition-all cursor-pointer"
                  title="Voice Router Muted. Click or press Alt+M to unmute"
                  aria-label="Voice Router: Muted. Click or press Alt+M to unmute"
                >
                  <span className="size-2 rounded-full bg-red-500" />
                  <span>{isHindi ? '🔴 वॉइस नेविगेशन म्यूट (Alt+M)' : '🔴 Voice Muted (Alt+M)'}</span>
                </button>
              )}
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Select Mock Examination
          </h1>
          <p className="mt-2 text-sm sm:text-base text-white/70 max-w-2xl">
            Choose an examination pattern to start your proctored CBT session. You can speak exam names directly (e.g. &ldquo;UPSC&rdquo;, &ldquo;CGL&rdquo;, &ldquo;Bank PO&rdquo;, &ldquo;Railway&rdquo;) to launch instantly.
          </p>
        </div>

        {/* Exam Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EXAM_CATALOG.map((exam) => {
            const isHighlighted = highlightedExamId === exam.id;
            return (
              <div
                key={exam.id}
                id={`exam-card-${exam.id}`}
                className={cn(
                  "flex flex-col justify-between rounded-[2px] border p-6 transition-all duration-300 group relative shadow-md scroll-mt-24",
                  isHighlighted
                    ? "border-2 border-[#ffed00] shadow-[0_0_30px_rgba(255,237,0,0.6)] ring-2 ring-[#ffed00]/80 bg-[#1a1a1a] scale-[1.02]"
                    : "border-white/15 bg-[#111111] hover:border-[#ffed00] hover:bg-[#161616]"
                )}
              >
                <div>
                  {/* Badge if present */}
                  {exam.badge && (
                    <span className="inline-flex items-center gap-1 rounded-[2px] bg-[#ffed00] text-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-3">
                      <Sparkles className="h-3 w-3" aria-hidden="true"/>
                      {exam.badge}
                    </span>
                  )}

                  <p className="text-xs font-semibold text-[#ffed00] uppercase tracking-wide">
                    {exam.authority}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white group-hover:text-[#ffed00] transition-colors">
                    {exam.title}
                  </h2>
                  <p className="mt-2 text-xs text-white/60 leading-relaxed">
                    {exam.description}
                  </p>

                  {/* Metadata Pills */}
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/80">
                    <div className="flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5 text-[#ffed00]" aria-hidden="true"/>
                      <span>{exam.questionsCount} Questions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-[#ffed00]" aria-hidden="true"/>
                      <span>{exam.durationMinutes} Mins</span>
                    </div>
                  </div>

                  {/* Subject tags */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {exam.subjects.map((sub, i) => (
                      <span
                        key={i}
                        className="rounded-[2px] bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-white/70"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  onClick={() => launchExam(exam)}
                  className={cn(
                    "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[2px] px-4 py-2.5 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffed00] cursor-pointer",
                    isHighlighted
                      ? "bg-[#ffed00] text-black ring-2 ring-[#ffed00] shadow-[0_0_15px_rgba(255,237,0,0.5)]"
                      : "bg-[#ffed00] text-black hover:bg-[#e6d500]"
                  )}
                  aria-label={`Launch ${exam.title}`}
                >
                  <span>{isHighlighted ? 'Opening Exam...' : 'Launch Exam'}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true"/>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ExamSelectionHub;
