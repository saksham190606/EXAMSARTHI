'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, BookOpen, Clock, FileQuestion, Sparkles, Eye } from 'lucide-react';
import { useAccessibilityStore } from '@/lib/store/accessibility';
import { speak } from '@/lib/accessibility/voice-companion';

export interface ExamOption {
  id: string;
  title: string;
  category: string;
  questions: number;
  duration: string;
  badge?: string;
  param: string;
  isSet?: boolean;
}

export const AVAILABLE_MOCKS: ExamOption[] = [
  {
    id: 'ssc-cgl',
    title: 'SSC CGL Tier-1 Full Mock',
    category: 'Staff Selection Commission',
    questions: 12,
    duration: '15 mins',
    param: 'e1',
  },
  {
    id: 'upsc-prelims',
    title: 'UPSC Civil Services Prelims (CSAT)',
    category: 'Union Public Service Commission',
    questions: 9,
    duration: '15 mins',
    param: 'e3',
  },
  {
    id: 'ibps-po',
    title: 'IBPS PO Prelims (Sectional Timing Mock)',
    category: 'Banking Personnel Selection',
    questions: 12,
    duration: '15 mins',
    badge: 'Sectional Timers',
    param: 'e2',
  },
  {
    id: 'rrb-ntpc',
    title: 'RRB NTPC Stage-1 CBT Mock',
    category: 'Railway Recruitment Board',
    questions: 12,
    duration: '15 mins',
    param: 'e1',
  },
  {
    id: 'vision-ai-diagram',
    title: 'Diagram & Visual Interpretation (Vision AI Showcase)',
    category: 'Assistive Multimodal Special Set',
    questions: 4,
    duration: '10 mins',
    badge: 'Vision AI Enabled',
    param: 'p6',
    isSet: true,
  },
];

interface ExamSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExamSelectorModal({ isOpen, onClose }: ExamSelectorModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const prevFocusedElementRef = useRef<HTMLElement | null>(null);
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);
  const language = useAccessibilityStore((state) => state.language);
  const isHindi = language === 'hi';

  // Focus trap, speech announcement, and Escape key listener
  useEffect(() => {
    if (isOpen) {
      prevFocusedElementRef.current = document.activeElement as HTMLElement | null;

      speak(
        isHindi
          ? 'मॉक टेस्ट चुनें। उपलब्ध परीक्षाओं के बीच जाने के लिए Tab दबाएं, या बंद करने के लिए Escape दबाएं।'
          : 'Select an examination mock test. Use Tab to move through available exams, or press Escape to close.',
        { cancelPrevious: true, langOverride: isHindi ? 'hi' : 'en' }
      );

      // Small delay to ensure modal is mounted before focusing
      const timeout = setTimeout(() => {
        firstButtonRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
          return;
        }

        if (e.key === 'Tab' && modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timeout);
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      // Restore focus on close
      prevFocusedElementRef.current?.focus();
    }
  }, [isOpen, onClose, isHindi]);

  const handleSelectExam = (exam: ExamOption) => {
    speak(
      isHindi
        ? `${exam.title} शुरू हो रहा है। परीक्षा प्रश्न तैयार किए जा रहे हैं।`
        : `Starting ${exam.title}. Preparing examination questions.`,
      {
        cancelPrevious: true,
        langOverride: isHindi ? 'hi' : 'en',
      }
    );
    onClose();

    if (exam.isSet || exam.param.startsWith('p')) {
      router.push(`/exam?set=${exam.param}`);
    } else {
      router.push(`/exam?exam=${exam.param}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="presentation"
        >
          {/* Overlay Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.05 : 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog Container */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="exam-modal-title"
            aria-describedby="exam-modal-description"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: reducedMotion ? 0.05 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[2px] border-2 border-white/20 bg-[#0a0a0a] text-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 p-6 bg-black">
              <div>
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-none bg-[#ffed00]" aria-hidden="true" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#ffed00]">
                    Computer Based Test Cohort
                  </span>
                </div>
                <h2 id="exam-modal-title" className="mt-1 text-2xl font-bold tracking-tight text-white">
                  Select Examination Mock
                </h2>
                <p id="exam-modal-description" className="mt-1 text-xs text-white/70">
                  Select a standardized simulation. All exams feature full keyboard navigation, screen-reader TalkBack, and assistive tools.
                </p>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Close examination selection dialog"
                className="rounded-[2px] p-2 text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffed00] focus-visible:ring-offset-2 focus-visible:ring-offset-black transition"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Exam Options List */}
            <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-6 space-y-3 bg-[#0c0c0c]">
              {AVAILABLE_MOCKS.map((exam, index) => (
                <button
                  key={exam.id}
                  ref={index === 0 ? firstButtonRef : undefined}
                  type="button"
                  onClick={() => handleSelectExam(exam)}
                  className="group relative flex w-full flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[2px] border border-white/10 bg-white/[0.03] p-4 text-left hover:border-[#ffed00] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffed00] focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
                        {exam.category}
                      </span>
                      {exam.badge && (
                        <span className="inline-flex items-center gap-1 rounded-[2px] bg-[#ffed00] px-2 py-0.5 text-[10px] font-bold text-black uppercase tracking-wider">
                          {exam.badge.includes('Vision') ? (
                            <Eye className="size-3" aria-hidden="true" />
                          ) : (
                            <Sparkles className="size-3" aria-hidden="true" />
                          )}
                          {exam.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-[#ffed00] transition-colors leading-snug">
                      {exam.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-white/60">
                      <span className="flex items-center gap-1">
                        <FileQuestion className="size-3.5" aria-hidden="true" />
                        {exam.questions} Questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" aria-hidden="true" />
                        {exam.duration}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <span className="rounded-[2px] bg-white/10 px-3 py-1.5 text-xs font-bold text-white group-hover:bg-[#ffed00] group-hover:text-black transition-colors flex items-center gap-1.5">
                      Launch Mock
                      <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 bg-black text-xs text-white/60">
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-[#ffed00]" aria-hidden="true" />
                Press Tab to cycle options • Enter to start
              </span>
              <button
                type="button"
                onClick={onClose}
                className="text-white/80 hover:text-white underline font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ffed00]"
              >
                Cancel (Esc)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
