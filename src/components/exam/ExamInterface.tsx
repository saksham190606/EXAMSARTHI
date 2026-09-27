"use client";

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QuestionDisplay } from '@/components/exam/QuestionDisplay';
import { VoiceExamPanel } from '@/components/voice/VoiceExamPanel';
import { useVoiceMode } from '@/hooks/useVoiceMode';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { CandidateQuestion } from '@/types/question';
import { ExamActions, ExamState } from '@/lib/useExamEngine';
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
    lastCommand,
    lastActionFeedback,
    errorMessage,
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

  // Synchronize Keyboard Shortcuts: Alt+N (Next), Alt+P (Prev), 1-4 (Options)
  useEffect(() => {
    const handleExamKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
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
  }, [actions, currentQuestion]);

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="flex flex-col space-y-6 w-full relative">
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

      {/* Main Question Card with Voice Assistive Panel */}
      <Card className="border-2 border-border/90 bg-card rounded-none overflow-hidden ring-1 ring-border/50">
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
