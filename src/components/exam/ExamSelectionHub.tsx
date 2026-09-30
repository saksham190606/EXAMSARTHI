'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, HelpCircle, ArrowRight, Sparkles, BookOpen, Volume2, Mic, MicOff } from 'lucide-react';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { useVoiceEngine, stopSpeaking } from '@/lib/voice/useVoiceEngine';
import { speak } from '@/lib/accessibility/voice-companion';
import { routeVoiceCommand, registerVoiceContext, unregisterVoiceContext } from '@/lib/voice/commandRouter';
import { EXAM_VOICE_ROUTES, matchExamTokens, matchExamVoiceRoute, ExamVoiceRoute } from '@/lib/voice/exam-router';
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
    id: 'ugc-net',
    param: 'ugc-mock-1',
    title: 'UGC NET Paper 1 Mock',
    authority: 'University Grants Commission (NTA)',
    questionsCount: 10,
    durationMinutes: 15,
    description: 'National Eligibility Test General Paper 1 covering Teaching & Research Aptitude, ICT, and Higher Education.',
    subjects: ['Teaching Aptitude', 'Research Aptitude', 'Reasoning', 'ICT'],
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
  const accessibilityMode = useAccessibilityStore((state) => state.accessibilityMode);
  const isKeyboardMode = accessibilityMode === 'keyboard';

  const [highlightedExamId, setHighlightedExamId] = useState<string | null>(null);
  const [launchingTitle, setLaunchingTitle] = useState<string | null>(null);
  const isLaunchingRef = useRef<boolean>(false);

  const {
    isListening,
    isSpeaking,
    transcript,
    hasMicPermission,
    startListening,
    stopListening,
    speakText,
    requestMicAccess,
  } = useVoiceEngine({
    lang: isHindi ? 'hi-IN' : 'en-US',
    autoStart: !isKeyboardMode,
    onTranscript: (capturedText) => {
      if (isKeyboardMode) return;
      handleExamHubVoiceCommand(capturedText);
    },
  });

  const launchExam = useCallback(
    (route: { id: string; param: string; title: string }, examName?: string) => {
      if (isLaunchingRef.current) return;
      isLaunchingRef.current = true;
      stopSpeaking(); // Immediately stop the welcome prompt or any ongoing speech!

      const targetName = examName || route.title;

      setLaunchingTitle(targetName);
      setHighlightedExamId(route.id);

      const cardEl = document.getElementById(`exam-card-${route.id}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      speak(
        isHindi ? `${targetName} परीक्षा शुरू की जा रही है...` : `Starting ${targetName} examination...`,
        { cancelPrevious: true, langOverride: isHindi ? 'hi-IN' : 'en-US' }
      );

      // Transition to official exam session
      setTimeout(() => {
        router.push(`/exam?exam=${route.param}`);
      }, 700);
    },
    [router, isHindi]
  );

  // Hotkey listener for Keyboard & Navigation mode (Keys 1-6 launch exams)
  useEffect(() => {
    if (!isKeyboardMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= EXAM_CATALOG.length) {
        e.preventDefault();
        const chosenExam = EXAM_CATALOG[num - 1];
        launchExam(chosenExam);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isKeyboardMode, launchExam]);



  const handleExamHubVoiceCommand = useCallback((capturedText: string) => {
    if (isLaunchingRef.current || !capturedText) return;

    // 1. Direct Exam Match (UPSC, SSC, CGL, Bank PO, Bank IPO, Railway, Vision AI, etc.)
    const match =
      matchExamTokens(capturedText) ||
      (matchExamVoiceRoute(capturedText)
        ? { route: matchExamVoiceRoute(capturedText)!, examName: matchExamVoiceRoute(capturedText)!.title }
        : null);

    if (match) {
      launchExam(match.route, match.examName);
      return;
    }

    // 2. Command Router match
    const routed = routeVoiceCommand(capturedText, 'hub');
    if (routed.handled) {
      // Check if it routes to an exam parameter (e.g. /exam?set=...)
      if (routed.type === 'route' && routed.path) {
        if (routed.path.startsWith('/exam?set=')) {
          const param = routed.path.split('set=')[1];
          const examItem = EXAM_CATALOG.find((e) => e.param === param) || EXAM_VOICE_ROUTES.find((e) => e.param === param);
          if (examItem) {
            launchExam(examItem, examItem.title);
            return;
          }
          launchExam({ id: param, param, title: 'Session' }, 'Session');
          return;
        }

        // 3. Different section navigation (Dashboard, Practice, Results, Settings)
        if (!routed.path.startsWith('/exam')) {
          speakText(routed.readback || `Navigating to ${routed.path}`, isHindi ? 'hi-IN' : 'en-US', () => {
            router.push(routed.path!);
          });
          setTimeout(() => {
            router.push(routed.path!);
          }, 1200);
          return;
        }
      }

      // 4. Ordinal / Numbered Exam selection (e.g. "first exam", "option 1", "mock 2", "पहला एग्जाम")
      if (routed.type === 'select-option' && routed.optionIndex !== undefined) {
        const examItem = EXAM_CATALOG[routed.optionIndex];
        if (examItem) {
          launchExam(examItem, examItem.title);
          return;
        }
      }
    }

    // 5. Generic "Start" triggers highlighted or first mock exam
    const lowerClean = capturedText.toLowerCase();
    if (['start exam', 'start mock', 'start test', 'take test', 'take exam', 'begin', 'start', 'शुरू करें', 'शुरू', 'स्टार्ट'].some(k => lowerClean.includes(k))) {
      const targetExam = (highlightedExamId ? EXAM_CATALOG.find(e => e.id === highlightedExamId) : null) || EXAM_CATALOG[0];
      if (targetExam) {
        launchExam(targetExam, targetExam.title);
        return;
      }
    }
  }, [isHindi, launchExam, router, speakText]);

  useEffect(() => {
    registerVoiceContext('hub', handleExamHubVoiceCommand);

    const handleExamLaunchEvent = (e: any) => {
      const { examId, param, examName, transcript: text } = e.detail || {};
      if (param) {
        const examItem = EXAM_CATALOG.find((ex) => ex.param === param || ex.id === examId) || {
          id: examId || 'exam',
          param,
          title: examName || 'Exam',
          authority: '',
          questionsCount: 10,
          durationMinutes: 15,
          description: '',
          subjects: [],
        };
        launchExam(examItem, examName);
      } else if (text) {
        handleExamHubVoiceCommand(text);
      }
    };

    window.addEventListener('examsarthi-exam-launch', handleExamLaunchEvent);

    return () => {
      unregisterVoiceContext('hub');
      window.removeEventListener('examsarthi-exam-launch', handleExamLaunchEvent);
    };
  }, [handleExamHubVoiceCommand, launchExam]);

  // Prompt the candidate with exam options upon landing on the Exams tab (Voice mode only)
  useEffect(() => {
    if (isKeyboardMode) return;

    const promptText = isHindi
      ? 'आप कौन सी परीक्षा चुनना चाहते हैं? आप यूपीएससी, एसएससी, बैंक पीओ, या रेलवे बोल सकते हैं।'
      : 'Which exam would you like to choose? You can say UPSC, SSC, Bank PO, or Railway.';

    const timer = setTimeout(() => {
      if (!isLaunchingRef.current) {
        speakText(promptText, isHindi ? 'hi-IN' : 'en-US', () => {
          startListening(isHindi ? 'hi-IN' : 'en-US');
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [isHindi, isKeyboardMode, speakText, startListening]);

  return (
    <div className="min-h-screen bg-black text-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 text-left">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div className="inline-flex items-center gap-2 rounded-[2px] bg-[#ffed00]/10 border border-[#ffed00]/30 px-3 py-1 text-xs font-bold text-[#ffed00]">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>OFFICIAL MOCK PORTAL</span>
            </div>

            {/* 4. UI Diagnostics & Manual Recovery Banner */}
            <div className="flex flex-wrap items-center gap-2.5">
              {!hasMicPermission ? (
                <button
                  type="button"
                  onClick={async () => {
                    const granted = await requestMicAccess();
                    if (granted) {
                      startListening(isHindi ? 'hi-IN' : 'en-US');
                    }
                  }}
                  className="px-4 py-2 bg-[#ffed00] hover:bg-[#e6d500] text-black font-bold rounded-lg shadow-md transition cursor-pointer text-xs sm:text-sm animate-pulse flex items-center gap-2"
                >
                  <Mic className="size-4" />
                  <span>🎙️ Tap to Enable Voice &amp; Mic</span>
                </button>
              ) : isSpeaking ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-sky-950/90 text-sky-300 border-2 border-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.35)] animate-pulse"
                >
                  <span className="size-2 rounded-full bg-sky-400 animate-ping" />
                  <span>🔊 Reading Question...</span>
                </div>
              ) : isListening ? (
                <button
                  type="button"
                  onClick={() => stopListening()}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-neutral-950/90 text-[#ffed00] border-2 border-[#ffed00] shadow-[0_0_18px_rgba(255,237,0,0.35)] animate-pulse hover:bg-[#ffed00]/15 cursor-pointer"
                  title="Click or press Alt+M to mute"
                >
                  <span className="relative flex size-2.5 items-center justify-center">
                    <span className="absolute -inset-1 rounded-full animate-ping opacity-75 bg-[#ffed00]" />
                    <span className="size-2 rounded-full bg-[#ffed00]" />
                  </span>
                  <span className="truncate max-w-[280px] sm:max-w-md">
                    🎙️ Listening | Heard: &ldquo;{transcript || '...'}&rdquo;
                  </span>
                  <kbd className="hidden sm:inline px-1.5 py-0.5 text-2xs bg-black/80 text-[#ffed00] border border-[#ffed00]/40 rounded font-mono">
                    Alt+M
                  </kbd>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startListening(isHindi ? 'hi-IN' : 'en-US')}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold bg-neutral-900 text-white/70 border border-white/20 hover:text-white transition-all cursor-pointer"
                  title="Voice Router Muted. Click to unmute"
                >
                  <span className="size-2 rounded-full bg-red-500" />
                  <span>🔴 Voice Muted (Click or Alt+M to start)</span>
                </button>
              )}
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            Select Your Examination
          </h1>
          <p className="text-base text-neutral-400 max-w-2xl">
            Choose a full simulated mock test or launch instantly with your microphone.
            Our fully accessible, voice-first engine is active across all national formats.
          </p>

          {/* Command Helper Banner */}
          {isKeyboardMode ? (
            <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-lg bg-neutral-900/80 border border-amber-400/30 px-4 py-2.5 text-xs text-neutral-300">
              <span className="font-semibold text-amber-300">Keyboard Shortcuts:</span>
              <span>Press number keys</span>
              <span className="rounded bg-black/60 px-1.5 py-0.5 font-mono text-[#ffed00] font-bold">1</span>
              <span>to</span>
              <span className="rounded bg-black/60 px-1.5 py-0.5 font-mono text-[#ffed00] font-bold">6</span>
              <span>to launch any mock exam directly, or use Tab and Enter.</span>
            </div>
          ) : (
            <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-lg bg-neutral-900/80 border border-white/10 px-4 py-2.5 text-xs text-neutral-300">
              <Volume2 className="h-4 w-4 text-[#ffed00] shrink-0" aria-hidden="true" />
              <span className="font-semibold text-white">Voice Shortcut:</span>
              <span>Say</span>
              <span className="rounded bg-black/60 px-1.5 py-0.5 font-mono text-[#ffed00] font-bold">&quot;CGL&quot;</span>,
              <span className="rounded bg-black/60 px-1.5 py-0.5 font-mono text-[#ffed00] font-bold">&quot;UPSC&quot;</span>,
              <span className="rounded bg-black/60 px-1.5 py-0.5 font-mono text-[#ffed00] font-bold">&quot;IBPS&quot;</span>,
              <span className="rounded bg-black/60 px-1.5 py-0.5 font-mono text-[#ffed00] font-bold">&quot;Railway&quot;</span>, or
              <span className="rounded bg-black/60 px-1.5 py-0.5 font-mono text-[#ffed00] font-bold">&quot;Vision AI&quot;</span>
              <span>to open any exam hands-free.</span>
            </div>
          )}
        </div>

        {/* Exam Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EXAM_CATALOG.map((exam, idx) => {
            const isHighlighted = highlightedExamId === exam.id;
            const isLaunchingThis = launchingTitle === exam.title;

            return (
              <div
                key={exam.id}
                id={`exam-card-${exam.id}`}
                className={cn(
                  "relative flex flex-col justify-between rounded-xl border p-6 transition-all duration-300 bg-neutral-950",
                  isLaunchingThis
                    ? "border-emerald-400 ring-4 ring-emerald-500/40 bg-emerald-950/20 scale-[1.02] shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                    : isHighlighted
                    ? "border-[#ffed00] ring-4 ring-[#ffed00]/30 bg-[#ffed00]/5 scale-[1.01]"
                    : "border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/60"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-2xs font-bold tracking-wider uppercase text-neutral-400">
                      {exam.authority}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-white/20 text-[#ffed00] font-mono text-[10px] font-bold" title={`Press ${idx + 1} to launch`}>
                        Key {idx + 1}
                      </span>
                      {exam.badge && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 border border-primary/30 px-2.5 py-0.5 text-2xs font-semibold text-primary">
                          <Sparkles className="h-3 w-3" aria-hidden="true" />
                          <span>{exam.badge}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <h2 className="text-xl font-bold text-white mb-2 group-hover:text-[#ffed00] transition-colors">
                    {exam.title}
                  </h2>
                  <p className="text-xs text-neutral-400 line-clamp-3 mb-4 leading-relaxed">
                    {exam.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {exam.subjects.map((sub) => (
                      <span
                        key={sub}
                        className="rounded bg-neutral-900 border border-neutral-800 px-2 py-0.5 text-2xs font-medium text-neutral-300"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-900 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-neutral-400 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
                      <span>{exam.questionsCount} Qs</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
                      <span>{exam.durationMinutes} min</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => launchExam(exam)}
                    aria-label={`Start ${exam.title} (${exam.authority}). Shortcut key ${idx + 1}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffed00]",
                      isLaunchingThis
                        ? "bg-emerald-400 text-black shadow-lg"
                        : "bg-[#ffed00] text-black hover:bg-[#e6d500]"
                    )}
                  >
                    <span>{isLaunchingThis ? 'Launching...' : 'Start Mock'}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ExamSelectionHub;
