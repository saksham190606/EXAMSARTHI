"use client";

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QuestionDisplay } from '@/components/exam/QuestionDisplay';
import { VoiceExamPanel } from '@/components/voice/VoiceExamPanel';
import { ExamMicStatusBar } from '@/components/exam/ExamMicStatusBar';
import { ExamVoiceDebugVisualizer } from '@/components/exam/ExamVoiceDebugVisualizer';
import { useVoiceMode } from '@/hooks/useVoiceMode';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { CandidateQuestion } from '@/types/question';
import { ExamState } from '@/lib/useExamEngine';
import { ArrowLeft, ArrowRight, Flag, Trash2 } from 'lucide-react';

export interface ExamInterfaceActions {
  selectAnswer: (qId: string, oId: string) => void;
  setAnswer?: (qId: string, answer: any) => void;
  toggleOption?: (qId: string, oId: string) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  goToQuestion: (idx: number) => void;
  submitExam: () => void;
  toggleFlag?: (qId: string) => void;
  goToNextSection?: () => void;
}

export interface ExamInterfaceProps {
  questions: CandidateQuestion[];
  currentQuestion: CandidateQuestion;
  state: ExamState;
  actions: ExamInterfaceActions;
  totalQuestions: number;
  onOpenSubmitDialog: () => void;
  onCloseSubmitDialog?: () => void;
  isSubmitting?: boolean;
}

export function ExamInterface({
  questions,
  currentQuestion,
  state,
  actions,
  totalQuestions,
  onOpenSubmitDialog,
  onCloseSubmitDialog,
}: ExamInterfaceProps) {
  const language = useAccessibilityStore((s) => s.language);
  const isHindi = language === 'hi';

  const {
    isActive,
    status,
    isSpeaking,
    lastCommand,
    lastTranscript,
    lastActionFeedback,
    errorMessage,
    isAudioUnlocked,
    unlockAudio,
    toggleVoiceMode,
  } = useVoiceMode({
    actions,
    state,
    currentQuestion,
    totalQuestions,
    questions,
    activeSection: state.activeSection,
    sectionTimeRemaining: state.sectionTimeRemaining,
    onOpenSubmitDialog,
    onCloseSubmitDialog,
  });

  const isFlagged = currentQuestion ? state.flagged.has(currentQuestion.id) : false;

  // Synchronize Keyboard Shortcuts: Alt+N (Next), Alt+P (Prev), Alt+M (Mic Toggle), 1-4 (Options)
  useEffect(() => {
    const handleExamKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Alt+M -> Toggle Microphone On/Off
      if (e.altKey && (e.key === 'm' || e.key === 'M' || e.code === 'KeyM')) {
        e.preventDefault();
        toggleVoiceMode();
        return;
      }

      // Alt+N -> Next
      if (e.altKey && (e.key === 'n' || e.key === 'N' || e.code === 'KeyN')) {
        e.preventDefault();
        actions.goToNext();
        return;
      }

      // Alt+P -> Prev
      if (e.altKey && (e.key === 'p' || e.key === 'P' || e.code === 'KeyP')) {
        e.preventDefault();
        actions.goToPrevious();
        return;
      }

      // 1-4 -> Select Option A-D
      if (!e.altKey && !e.ctrlKey && !e.metaKey && ['1', '2', '3', '4'].includes(e.key)) {
        const optionIndex = parseInt(e.key, 10) - 1;
        if (currentQuestion && currentQuestion.options && optionIndex >= 0 && optionIndex < currentQuestion.options.length) {
          e.preventDefault();
          const opt = currentQuestion.options[optionIndex];
          if (actions.setAnswer) {
            actions.setAnswer(currentQuestion.id, opt.id);
          }
          actions.selectAnswer(currentQuestion.id, opt.id);
        }
      }
    };

    window.addEventListener('keydown', handleExamKeyDown);
    return () => {
      window.removeEventListener('keydown', handleExamKeyDown);
    };
  }, [actions, currentQuestion, toggleVoiceMode]);

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="flex flex-col space-y-6 w-full relative">
      {/* Visual Mic Status Bar with 🔴 Off, 🟡 Listening, 🟢 Recognized */}
      <ExamMicStatusBar
        isActive={isActive}
        status={status}
        isSpeaking={isSpeaking}
        lastCommand={lastCommand}
        lastTranscript={lastTranscript}
        lastActionFeedback={lastActionFeedback}
        errorMessage={errorMessage}
        onToggle={toggleVoiceMode}
      />

      {/* Header Real-time Debug Visualizer Status Pill */}
      <div className="flex items-center justify-between gap-3 px-1">
        <ExamVoiceDebugVisualizer
          status={status}
          isActive={isActive}
          isSpeaking={isSpeaking}
          lastCommand={lastCommand}
          lastTranscript={lastTranscript}
          onClick={toggleVoiceMode}
        />
      </div>

      {/* Active Glowing Sunlight Yellow Mic Indicator Floating Pulse */}
      {isActive && status === 'Listening' && (
        <div
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-neutral-950/95 border-2 border-[#ffed00] shadow-[0_0_24px_rgba(255,237,0,0.6)] backdrop-blur-md animate-pulse"
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute -inset-1.5 rounded-full bg-[#ffed00]/60 animate-ping opacity-80" />
            <span className="size-3 rounded-full bg-[#ffed00]" />
          </div>
          <span className="text-xs font-bold tracking-wider text-[#ffed00] uppercase font-mono">
            {isHindi ? 'सुन रहा है...' : 'Listening...'}
          </span>
        </div>
      )}

      {/* Main Question Card with Voice Assistive Panel & Physical Unlock Banner */}
      <Card className="border-2 border-border/90 bg-card rounded-none overflow-hidden ring-1 ring-border/50">
        {/* 4. Physical "Tap to Enable Voice" Unlock Banner */}
        {!isAudioUnlocked && (
          <button
            type="button"
            onClick={unlockAudio}
            className="w-full group relative flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-500/25 via-[#ffed00]/30 to-amber-500/25 border-b-2 border-[#ffed00] text-foreground shadow-[0_0_24px_rgba(255,237,0,0.35)] hover:bg-[#ffed00]/40 transition-all cursor-pointer text-center animate-pulse"
            aria-label="Click anywhere or press space to activate voice companion"
          >
            <span className="text-xl sm:text-2xl" aria-hidden="true">🔊</span>
            <span className="font-heading font-black text-sm sm:text-base tracking-wide text-foreground">
              [ 🔊 Click Anywhere or Press Space to Activate Voice Companion ]
            </span>
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-mono font-bold bg-black/70 text-[#ffed00] border border-[#ffed00]/50 rounded-[2px]">
              Space
            </kbd>
          </button>
        )}

        <section aria-label="Voice examination controls">
          <VoiceExamPanel
            isActive={isActive}
            status={status}
            lastCommand={lastCommand}
            lastActionFeedback={lastActionFeedback}
            errorMessage={errorMessage}
            onToggle={toggleVoiceMode}
          />
        </section>

        <CardContent className="p-6 md:p-8">
          <QuestionDisplay
            question={currentQuestion}
            currentIndex={state.currentQuestionIndex}
            totalQuestions={totalQuestions}
            userAnswer={state.answers[currentQuestion.id]}
            selectedOptionId={
              typeof state.answers[currentQuestion.id] === 'string'
                ? (state.answers[currentQuestion.id] as string)
                : undefined
            }
            onSelectOption={actions.selectAnswer}
            onToggleOption={actions.toggleOption}
            onSetAnswer={actions.setAnswer}
          />
        </CardContent>
      </Card>

      {/* Primary Action Controls Row */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border rounded-none"
        role="toolbar"
        aria-label="Question navigation actions"
      >
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="lg"
            onClick={actions.goToPrevious}
            disabled={state.currentQuestionIndex === 0}
            className="h-11 px-5 font-semibold gap-2 border-2"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>{isHindi ? 'पिछला (Alt+P)' : 'Previous (Alt+P)'}</span>
          </Button>

          <Button
            variant="default"
            size="lg"
            onClick={actions.goToNext}
            disabled={state.currentQuestionIndex === totalQuestions - 1}
            className="h-11 px-6 font-semibold gap-2"
          >
            <span>{isHindi ? 'अगला (Alt+N)' : 'Next (Alt+N)'}</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (actions.setAnswer) actions.setAnswer(currentQuestion.id, '');
              actions.selectAnswer(currentQuestion.id, '');
            }}
            className="h-9 px-3 text-xs font-medium gap-1.5"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            <span>{isHindi ? 'उत्तर हटाएं' : 'Clear Answer'}</span>
          </Button>

          <Button
            variant={isFlagged ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => actions.toggleFlag?.(currentQuestion.id)}
            className="h-9 px-3 text-xs font-medium gap-1.5"
          >
            <Flag className="size-3.5" aria-hidden="true" />
            <span>{isFlagged ? (isHindi ? 'चिह्नित हटाया' : 'Unflag') : (isHindi ? 'समीक्षा के लिए' : 'Mark for Review')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
