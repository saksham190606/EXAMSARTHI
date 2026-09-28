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
import { getHighFidelityVoice, sanitizeExamTextForSpeech } from '@/lib/voice/speech-synthesis';
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
  const recognitionRef = useRef<any>(null);

  // 1. Global Speaking Guard (Strict Audio Mutex Ref)
  const isSystemSpeakingRef = useRef(false);
  const isVoiceModeActiveRef = useRef(false);
  const lastCommandTimeRef = useRef(0);

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
    } else if (t) {
      router.push(`/exam?exam=${t}`);
    } else {
      router.push('/exam');
    }
  }, [router]);

  // 2. Hard-Stop Microphone Before Speech with Global Window Mutex
  const speakText = useCallback((text: string, lang?: string, onComplete?: () => void) => {
    if (typeof window === 'undefined') return;

    // 1. ENGAGE GLOBAL LOCK
    (window as any).isSystemSpeaking = true;
    isSystemSpeakingRef.current = true;

    // 2. HARD KILL MIC
    if ((window as any).globalRecognitionInstance) {
      try {
        (window as any).globalRecognitionInstance.onend = null;
        (window as any).globalRecognitionInstance.abort();
      } catch (e) {}
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
    }

    window.speechSynthesis.cancel();
    const targetLang = lang || (isHindi ? 'hi-IN' : 'en-US');
    const sanitized = sanitizeExamTextForSpeech(text, targetLang);
    const utterance = new SpeechSynthesisUtterance(sanitized);
    utterance.lang = targetLang;
    const store = useAccessibilityStore.getState();
    utterance.rate = Math.min(1.5, Math.max(0.7, store.speechRate || 1.0));
    const voice = getHighFidelityVoice(targetLang, store.selectedVoiceURI);
    if (voice) {
      utterance.voice = voice;
    }

    const handleRecognitionEnd = () => {
      if ((window as any).isSystemSpeaking === true) return;
      if (isVoiceModeActiveRef.current) {
        setTimeout(() => {
          if ((window as any).isSystemSpeaking === true) return;
          try {
            (window as any).globalRecognitionInstance?.start();
          } catch (e) {}
        }, 150);
      } else {
        setIsListening(false);
      }
    };

    utterance.onend = () => {
      // 3. WAIT 500MS FOR ROOM ECHO TO FADE, THEN UNLOCK
      setTimeout(() => {
        (window as any).isSystemSpeaking = false;
        isSystemSpeakingRef.current = false;
        if ((window as any).globalRecognitionInstance && isVoiceModeActiveRef.current) {
          // Reattach auto-restart and boot mic
          (window as any).globalRecognitionInstance.onend = handleRecognitionEnd;
          try {
            (window as any).globalRecognitionInstance.start();
          } catch (e) {}
        }
        if (onComplete) onComplete();
      }, 500);
    };

    utterance.onerror = utterance.onend;
    (window as any).__currentUtterance = utterance; // GC fix

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      (window as any).isSystemSpeaking = false;
      isSystemSpeakingRef.current = false;
    }
  }, [isHindi]);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speakText(isHindi ? "वॉइस पहचान समर्थित नहीं है।" : "Speech recognition is not supported in this browser.");
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    } catch (_) {}

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      // Store the instance globally so speakText can reach it
      (window as any).globalRecognitionInstance = recognition;
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = isHindi ? 'hi-IN' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      // 3. AI-Driven Intent Router Listener (with Mutex & Debounce Guard)
      recognition.onresult = async (event: any) => {
        if (!event.results || !event.results[0] || !event.results[0][0]) return;
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        if (!transcript) return;

        // 1. Mutex Guard
        if ((window as any).isSystemSpeaking === true) return;

        // 2. Debounce Guard
        const now = Date.now();
        if (now - lastCommandTimeRef.current < 1500) return;
        lastCommandTimeRef.current = now;

        setStatusMessage(transcript);

        // 3. Pause listening while AI thinks
        if ((window as any).globalRecognitionInstance) {
          try {
            (window as any).globalRecognitionInstance.stop();
          } catch (_) {}
        }

        // 4. Fetch AI Intent
        try {
          const res = await fetch('/api/intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript }),
          });
          const data = await res.json();

          // 5. Execute Action based on AI's structured response
          if (data.intent === 'NAVIGATE') {
            const dest = data.target || '/dashboard';
            const pageName = dest.replace('/', '');
            speakText(isHindi ? `${pageName} पर जाया जा रहा है` : `Navigating to ${pageName}`);
            router.push(dest);
          } else if (data.intent === 'EXAM_LAUNCH') {
            speakText(isHindi ? 'परीक्षा शुरू की जा रही है' : `Launching exam`);
            launchExam(data.target);
          } else if (data.intent === 'CONTROL') {
            if (data.target === 'NEXT') {
              speakText(isHindi ? 'अगला' : 'Next');
            } else if (data.target === 'PREVIOUS') {
              speakText(isHindi ? 'पिछला' : 'Previous');
            } else if (data.target === 'SUBMIT') {
              speakText(isHindi ? 'सबमिट किया जा रहा है' : 'Submitting');
            }
          } else if (data.intent === 'ANSWER') {
            speakText(isHindi ? `विकल्प ${data.target} चुना गया` : `Option ${data.target} selected`);
          } else {
            // UNKNOWN or unrecognized: check local navigation fallback
            const fallback = matchIntent(transcript);
            if (fallback !== 'UNKNOWN') {
              const pathMap: Record<string, string> = {
                DASHBOARD: '/dashboard',
                EXAMS: '/exam',
                PRACTICE: '/practice',
                SETTINGS: '/settings',
                LOGIN: '/login',
              };
              const fallbackPath = pathMap[fallback];
              if (fallbackPath) {
                speakText(isHindi ? `${fallback.toLowerCase()} पर जाया जा रहा है` : `Navigating to ${fallback.toLowerCase()}`);
                router.push(fallbackPath);
                return;
              }
            }
            speakText(isHindi ? "क्षमा करें, मुझे समझ नहीं आया। क्या आप दोहरा सकते हैं?" : "I didn't quite catch that. Could you repeat?");
          }
        } catch (err) {
          console.error("AI Routing failed", err);
          speakText(isHindi ? "क्षमा करें, मुझे समझ नहीं आया। क्या आप दोहरा सकते हैं?" : "I didn't quite catch that. Could you repeat?");
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'aborted' || event.error === 'no-speech') return;
        console.warn('[Landing Voice Recognition Error]', event.error);
      };

      const handleRecognitionEnd = () => {
        if ((window as any).isSystemSpeaking === true) return;
        if (isVoiceModeActiveRef.current) {
          setTimeout(() => {
            if ((window as any).isSystemSpeaking === true) return;
            try {
              (window as any).globalRecognitionInstance?.start();
            } catch (e) {}
          }, 150);
        } else if (!isVoiceModeActiveRef.current) {
          setIsListening(false);
        }
      };

      // 4. Handle the onend Auto-Restart Safely:
      recognition.onend = handleRecognitionEnd;

      isVoiceModeActiveRef.current = true;
      recognition.start();
      setIsListening(true);
    } catch (err) {
      console.warn('[Landing Voice Recognition Start Error]', err);
    }
  }, [isHindi, launchExam, router, speakText]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      isVoiceModeActiveRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }
      setIsListening(false);
    } else {
      requestMicPermission();
      startListening();
    }
  }, [isListening, startListening]);

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
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }
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
