'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock, HelpCircle, ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import { useAccessibilityStore } from '@/lib/store/accessibility';
import { speak } from '@/lib/accessibility/voice-companion';

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
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);

  // Announce the exam selection screen upon landing
  useEffect(() => {
    speak(
      'Examination Selection Hub. Please choose an exam to begin your computer-based test. Use Tab to browse through available tests, or press Enter to launch.',
      { cancelPrevious: true }
    );
  }, []);

  const handleSelectExam = (param: string, title: string) => {
    speak(`Starting ${title}`, { cancelPrevious: true });
    router.push(`/exam?set=${param}`);
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 text-left">
          <div className="inline-flex items-center gap-2 rounded-[2px] bg-[#ffed00]/10 border border-[#ffed00]/30 px-3 py-1 text-xs font-bold text-[#ffed00] mb-3">
            <BookOpen className="h-3.5 w-3.5"/>
            <span>OFFICIAL MOCK PORTAL</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Select Mock Examination
          </h1>
          <p className="mt-2 text-sm sm:text-base text-white/70 max-w-2xl">
            Choose an examination pattern to start your proctored CBT session. All tests include screen-reader announcements, high-contrast layouts, and voice navigation.
          </p>
        </div>

        {/* Exam Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EXAM_CATALOG.map((exam) => (
            <div
              key={exam.id}
              className="flex flex-col justify-between rounded-[2px] border border-white/15 bg-[#111111] p-6 hover:border-[#ffed00] hover:bg-[#161616] transition-all group relative shadow-md"
            >
              <div>
                {/* Badge if present */}
                {exam.badge && (
                  <span className="inline-flex items-center gap-1 rounded-[2px] bg-[#ffed00] text-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-3">
                    <Sparkles className="h-3 w-3"/>
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
                    <HelpCircle className="h-3.5 w-3.5 text-[#ffed00]"/>
                    <span>{exam.questionsCount} Questions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-[#ffed00]"/>
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
                onClick={() => handleSelectExam(exam.param, exam.title)}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[2px] bg-[#ffed00] px-4 py-2.5 text-xs font-bold text-black transition hover:bg-[#e6d500] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffed00] cursor-pointer"
                aria-label={`Start ${exam.title}`}
              >
                <span>Launch Exam</span>
                <ArrowRight className="h-4 w-4"/>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ExamSelectionHub;
