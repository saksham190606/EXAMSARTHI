'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Volume2, ShieldCheck, Sparkles, Mic } from 'lucide-react';
import { useAccessibilityStore } from '@/lib/store/accessibility';
import ExamSelectorModal from '@/components/exam/ExamSelectorModal';
import { requestMicPermission } from '@/lib/accessibility/mic-permission';
import {
  isVoiceRecognitionSupported,
  speak as speakWithVoiceEngine,
  startListening as startVoiceRecognition,
  stopListening as stopVoiceRecognition,
} from '@/lib/voice/useVoiceEngine';
import { routeVoiceCommand } from '@/lib/voice/commandRouter';
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

export const matchIntent = (text: string): 'DASHBOARD' | 'EXAMS' | 'PRACTICE' | 'SETTINGS' | 'LOGIN' | 'UNKNOWN' => {
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
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const isVoiceModeActiveRef = useRef(false);
  const isPermissionRequestPendingRef = useRef(false);
  const lastCommandTimeRef = useRef(0);
  const transcriptHandlerRef = useRef<(transcript: string) => void>(() => {});

  const language = useAccessibilityStore((state) => state.language);
  const isHindi = language === 'hi';

  const launchExam = useCallback((target: string) => {
    const t = (target || '').toLowerCase().trim();
    if (t.includes('gk') || t.includes('geography')) {
      router.push('/exam?set=p2');
    } else if (t.includes('ssc')) {
      router.push('/exam?exam=e1');
    } else if (t.includes('upsc')) {
      router.push('/exam?exam=e3');
    } else if (t.includes('ibps')) {
      router.push('/exam?exam=e2');
    } else if (t.includes('rrb')) {
      router.push('/exam?exam=e1');
    } else if (t.includes('vision')) {
      router.push('/exam?exam=e4');
    } else if (/^(e[1-4]|p[1-6])$/.test(t)) {
      router.push(`/exam?${t.startsWith('p') ? 'set' : 'exam'}=${encodeURIComponent(t)}`);
    } else {
      router.push('/exam');
    }
  }, [router]);

  // Use the shared speech engine so all voice surfaces share one audio lifecycle.
  const speakText = useCallback((text: string, lang?: string, onComplete?: () => void) => {
    if (typeof window === 'undefined') return;
    const targetLang = lang || (isHindi ? 'hi-IN' : 'en-US');
    const store = useAccessibilityStore.getState();
    stopVoiceRecognition(false);
    speakWithVoiceEngine(text, {
      lang: targetLang,
      rate: store.speechRate || 1,
      priority: 'response',
      interrupt: true,
      onEnd: () => {
        setTimeout(() => {
          if (isVoiceModeActiveRef.current) {
            startVoiceRecognition(targetLang, transcriptHandlerRef.current, { resolveAlternatives: false });
            setIsListening(true);
          } else {
            setIsListening(false);
          }
          onComplete?.();
        }, 500);
      },
    });
  }, [isHindi]);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!isVoiceRecognitionSupported()) {
      isVoiceModeActiveRef.current = false;
      setIsListening(false);
      speakText(isHindi ? "वॉइस पहचान समर्थित नहीं है।" : "Speech recognition is not supported in this browser.");
      return;
    }

    isVoiceModeActiveRef.current = true;
    startVoiceRecognition(isHindi ? 'hi-IN' : 'en-US', transcriptHandlerRef.current, {
      resolveAlternatives: false,
    });
    setIsListening(true);
  }, [isHindi, speakText]);

  useEffect(() => {
    transcriptHandlerRef.current = async (rawTranscript) => {
      const transcript = rawTranscript.toLowerCase().trim();
      if (!transcript || !isVoiceModeActiveRef.current) return;
      const now = Date.now();
      if (now - lastCommandTimeRef.current < 1500) return;
      lastCommandTimeRef.current = now;
      setStatusMessage(transcript);
      stopVoiceRecognition(false);
      setIsListening(false);

      try {
        const res = await fetch('/api/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript }),
        });
        if (!res.ok) throw new Error(`Intent service returned ${res.status}`);
        const data = await res.json();

        if (data.intent === 'NAVIGATE') {
          const target = (data.target || 'dashboard').toLowerCase();
          const routed = routeVoiceCommand(target === 'home' ? 'dashboard' : target, 'global-nav');
          if (!routed.handled || !routed.path) {
            speakText(isHindi ? "क्षमा करें, मैं उस पृष्ठ पर नहीं जा सकती।" : "Sorry, I can't navigate to that page.");
            return;
          }
          const pageName = routed.path === '/dashboard' ? 'dashboard' : routed.path.slice(1);
          isVoiceModeActiveRef.current = false;
          setIsListening(false);
          speakText(isHindi ? `${pageName} पर जाया जा रहा है` : `Navigating to ${pageName}`);
          router.push(routed.path);
        } else if (data.intent === 'EXAM_LAUNCH') {
          isVoiceModeActiveRef.current = false;
          setIsListening(false);
          speakText(isHindi ? 'परीक्षा शुरू की जा रही है' : 'Launching exam');
          launchExam(data.target);
        } else if (data.intent === 'CONTROL') {
          const confirmation = data.target === 'NEXT'
            ? (isHindi ? 'अगला' : 'Next')
            : data.target === 'PREVIOUS'
              ? (isHindi ? 'पिछला' : 'Previous')
              : data.target === 'SUBMIT'
                ? (isHindi ? 'सबमिट किया जा रहा है' : 'Submitting')
                : '';
          speakText(confirmation || (isHindi ? "क्षमा करें, मुझे समझ नहीं आया।" : "Sorry, I didn't understand."));
        } else if (data.intent === 'ANSWER') {
          speakText(isHindi ? `विकल्प ${data.target} चुना गया` : `Option ${data.target} selected`);
        } else {
          const fallback = matchIntent(transcript);
          const pathMap: Record<string, string> = {
            DASHBOARD: '/dashboard',
            EXAMS: '/exam',
            PRACTICE: '/practice',
            SETTINGS: '/settings',
            LOGIN: '/login',
          };
          const fallbackPath = pathMap[fallback];
          if (fallbackPath) {
            isVoiceModeActiveRef.current = false;
            setIsListening(false);
            speakText(isHindi ? `${fallback.toLowerCase()} पर जाया जा रहा है` : `Navigating to ${fallback.toLowerCase()}`);
            router.push(fallbackPath);
          } else {
            speakText(isHindi ? "क्षमा करें, मुझे समझ नहीं आया। क्या आप दोहरा सकते हैं?" : "I didn't quite catch that. Could you repeat?");
          }
        }
      } catch (error) {
        console.error('[Landing Voice] Intent routing failed:', error);
        speakText(isHindi ? "क्षमा करें, मुझे समझ नहीं आया। क्या आप दोहरा सकते हैं?" : "I didn't quite catch that. Could you repeat?");
      }
    };
  }, [isHindi, launchExam, router, speakText]);

  const toggleListening = useCallback(async () => {
    if (isListening || isPermissionRequestPendingRef.current) {
      isPermissionRequestPendingRef.current = false;
      isVoiceModeActiveRef.current = false;
      stopVoiceRecognition();
      setIsListening(false);
    } else {
      isPermissionRequestPendingRef.current = true;
      isVoiceModeActiveRef.current = true;
      setStatusMessage(isHindi ? 'माइक्रोफ़ोन की अनुमति मांगी जा रही है' : 'Requesting microphone access');
      let micGranted = false;
      try {
        micGranted = await requestMicPermission();
      } finally {
        isPermissionRequestPendingRef.current = false;
      }
      if (!isVoiceModeActiveRef.current) return;
      if (micGranted) {
        startListening();
      } else {
        isVoiceModeActiveRef.current = false;
        setIsListening(false);
        speakText(isHindi ? 'कृपया माइक्रोफ़ोन की अनुमति दें।' : 'Please allow microphone access to use voice navigation.');
      }
    }
  }, [isHindi, isListening, speakText, startListening]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'v' || e.key === 'V' || e.code === 'KeyV')) {
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleListening]);

  useEffect(() => {
    return () => {
      isPermissionRequestPendingRef.current = false;
      isVoiceModeActiveRef.current = false;
      stopVoiceRecognition();
    };
  }, []);

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

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
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

          {isListening && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-neutral-950/90 border border-[#ffed00]/50 text-xs text-white shadow-lg backdrop-blur-md"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {statusMessage
                  ? (isHindi ? `सुना: "${statusMessage}"` : `Heard: "${statusMessage}"`)
                  : (isHindi ? "बोलें: 'डैशबोर्ड', 'परीक्षा', 'प्रैक्टिस', 'सेटिंग्स', या 'साइन इन'" : "Say 'Dashboard', 'Exams', 'Practice', 'Settings', or 'Sign In'")}
              </span>
            </motion.div>
          )}

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
