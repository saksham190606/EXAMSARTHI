"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Flag, Send, CheckCircle2 } from 'lucide-react';

import { MockExamQuestions } from '@/lib/examData';
import { PracticeSets } from '@/lib/mockData';
import { useExamEngine } from '@/lib/useExamEngine';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ExamTimer } from '@/components/exam/ExamTimer';
import { QuestionDisplay } from '@/components/exam/QuestionDisplay';
import { QuestionPalette } from '@/components/exam/QuestionPalette';
import { SubmitDialog } from '@/components/exam/SubmitDialog';

import { useVoiceMode } from '@/hooks/useVoiceMode';
import { VoiceExamPanel } from '@/components/voice/VoiceExamPanel';
import { useTranslation } from '@/lib/i18n';

// Define the live region component outside so it mounts once
function LiveRegion() {
  return (
    <div 
      id="exam-live-region" 
      className="sr-only" 
      aria-live="polite" 
      aria-atomic="true"
    />
  );
}

export default function PracticeExamPage() {
  const [hasStarted, setHasStarted] = useState(false);
  const startBtnRef = useRef<HTMLButtonElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!hasStarted) {
      startBtnRef.current?.focus();
    }
  }, [hasStarted]);

  if (!hasStarted) {
    return (
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-4 md:p-8 items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md p-6 text-center shadow-lg border-2">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{t('examName') || 'Practice Session'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Please click the button below or press Enter to begin the practice session. This will also enable audio features if Voice Mode is active.
            </p>
            <Button 
              ref={startBtnRef}
              type="button"
              size="lg" 
              className="w-full text-lg h-14" 
              onClick={() => setHasStarted(true)} 
              autoFocus
            >
              Start Practice
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <PracticeExamContent />;
}

function PracticeExamContent() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  
  const practiceId = params?.id as string;
  const practiceSet = PracticeSets.find(p => p.id === practiceId);
  
  // Memoize filtered questions so it doesn't change on every render
  const questions = useMemo(() => {
    if (!practiceSet) return [];
    const filtered = MockExamQuestions.filter(q => q.subject === practiceSet.subject);
    // Fallback to all questions if none match (shouldn't happen with our mock data, but just in case)
    return filtered.length > 0 ? filtered : MockExamQuestions;
  }, [practiceSet]);

  const { state, actions, currentQuestion } = useExamEngine(
    questions.length > 0 ? questions : MockExamQuestions, // safety fallback for initialization
    (practiceSet?.duration || 20) * 60, // convert minutes to seconds
    (finalState) => {
      if (typeof window !== 'undefined') {
        const stateToSave = {
          ...finalState,
          flagged: Array.from(finalState.flagged)
        };
        sessionStorage.setItem('examResultState', JSON.stringify(stateToSave));
      }
      router.push('/results');
    }
  );

  const totalQuestions = questions.length > 0 ? questions.length : MockExamQuestions.length;

  const { isActive, status, lastCommand, toggleVoiceMode } = useVoiceMode({
    actions,
    state,
    currentQuestion,
    totalQuestions,
  });

  if (!practiceSet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Practice Set Not Found</h1>
        <p className="text-muted-foreground">The practice set you are looking for does not exist.</p>
        <Button onClick={() => router.push('/practice')}>Return to Practice</Button>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded"></div>
          <div className="h-4 w-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const isFlagged = state.flagged.has(currentQuestion.id);
  const answeredCount = Object.keys(state.answers).length;
  const progressPercent = Math.round(((state.currentQuestionIndex + 1) / totalQuestions) * 100);

  return (
    <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-4 md:p-8 space-y-6">
      <LiveRegion />
      
      <SubmitDialog 
        isOpen={isSubmitDialogOpen}
        onOpenChange={setIsSubmitDialogOpen}
        totalQuestions={totalQuestions}
        answeredCount={answeredCount}
        onConfirmSubmit={actions.submitExam}
      />

      {/* SECTION 1 — Compact Exam Header */}
      <header 
        aria-label="Exam header"
        className="flex flex-col gap-3 p-4 md:p-6 bg-card border rounded-2xl shadow-xs"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              {practiceSet.title}
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              {practiceSet.subject} · {practiceSet.difficulty}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ExamTimer 
              timeRemaining={state.timeRemaining} 
              tickTimer={actions.tickTimer} 
            />
            <Button 
              variant="default" 
              onClick={() => setIsSubmitDialogOpen(true)}
              className="hidden md:flex font-medium h-10 px-4 shadow-xs"
            >
              <span>{t('submitExam')}</span>
              <Send className="ml-2 size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Textual & Visual Progress Bar */}
        <div className="pt-2 border-t border-border/40 space-y-1.5">
          <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
            <span>{t('progress')}: {t('question')} {state.currentQuestionIndex + 1} {t('of')} {totalQuestions}</span>
            <span>{answeredCount} {t('of')} {totalQuestions} {t('answered')} ({progressPercent}%)</span>
          </div>
          <Progress 
            value={progressPercent} 
            className="h-2" 
            aria-label={`Exam progress: Question ${state.currentQuestionIndex + 1} of ${totalQuestions}, representing ${progressPercent} percent complete.`}
          />
        </div>
      </header>

      {/* SECTION 2 — Main Exam Workspace (Desktop 2-col, Mobile 1-col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        
        {/* Left/Main Column: Question Display & Navigation (8 cols on desktop) */}
        <div className="lg:col-span-8 flex flex-col space-y-6 w-full">
          
          {/* Main Question Card */}
          <Card className="border border-border bg-card shadow-xs">
            {/* Voice Examination Mode Assistive Panel */}
            <section aria-label="Voice examination controls">
              <VoiceExamPanel 
                isActive={isActive}
                status={status}
                lastCommand={lastCommand}
                onToggle={toggleVoiceMode}
              />
            </section>
            
            <CardContent className="p-6 md:p-8">
              <QuestionDisplay 
                question={currentQuestion}
                currentIndex={state.currentQuestionIndex}
                totalQuestions={totalQuestions}
                selectedOptionId={state.answers[currentQuestion.id]}
                onSelectOption={actions.selectAnswer}
              />
            </CardContent>
          </Card>

          {/* Primary Action Controls Row */}
          <div 
            className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border rounded-xl shadow-xs"
            role="toolbar"
            aria-label="Question navigation actions"
          >
            {/* Previous & Next */}
            <div className="flex items-center gap-2.5">
              <Button 
                variant="outline" 
                size="lg"
                onClick={actions.goToPrevious}
                disabled={state.currentQuestionIndex === 0}
                aria-label="Go to previous question"
                className="h-11 px-4 font-medium border-border"
              >
                <ChevronLeft className="mr-1.5 size-5" aria-hidden="true" />
                <span>{t('previous')}</span>
              </Button>
              <Button 
                variant="default" 
                size="lg"
                onClick={actions.goToNext}
                disabled={state.currentQuestionIndex === totalQuestions - 1}
                aria-label="Go to next question"
                className="h-11 px-5 font-medium shadow-xs"
              >
                <span>{t('next')}</span>
                <ChevronRight className="ml-1.5 size-5" aria-hidden="true" />
              </Button>
            </div>
            
            {/* Flag & Mobile Submit */}
            <div className="flex items-center gap-2.5">
              <Button 
                variant={isFlagged ? "secondary" : "outline"}
                size="lg"
                onClick={() => actions.toggleFlag(currentQuestion.id)}
                aria-pressed={isFlagged}
                className={`h-11 px-4 font-medium transition-all ${
                  isFlagged 
                    ? 'border-primary/50 bg-primary/10 text-primary font-semibold' 
                    : 'border-border'
                }`}
              >
                <Flag 
                  className={`mr-2 size-4 transition-colors ${
                    isFlagged ? 'text-primary fill-primary' : 'text-muted-foreground'
                  }`} 
                  aria-hidden="true"
                /> 
                <span>{isFlagged ? t('flaggedForReview') : t('flagForReview')}</span>
              </Button>

              <Button 
                variant="default"
                size="lg"
                onClick={() => setIsSubmitDialogOpen(true)}
                className="md:hidden h-11 px-4 font-medium shadow-xs"
              >
                <span>{t('submit')}</span>
                <Send className="ml-1.5 size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Question Navigation Palette (4 cols on desktop) */}
        <aside 
          aria-label="Question overview"
          className="lg:col-span-4 w-full flex flex-col space-y-6"
        >
          <Card className="border border-border bg-card shadow-xs lg:sticky lg:top-20">
            <CardHeader className="p-4 sm:p-5 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="font-bold text-lg text-foreground">
                  {t('questionPalette')}
                </CardTitle>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground border">
                  {answeredCount}/{totalQuestions}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <CheckCircle2 className="size-3.5 text-primary" aria-hidden="true" />
                <span>{answeredCount} {t('answered')} · {totalQuestions - answeredCount} {t('remaining')}</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4">
              <QuestionPalette 
                questions={questions}
                currentQuestionIndex={state.currentQuestionIndex}
                answers={state.answers}
                flagged={state.flagged}
                goToQuestion={actions.goToQuestion}
              />

              <div className="pt-2 border-t border-border/50">
                <Button 
                  onClick={() => setIsSubmitDialogOpen(true)}
                  className="w-full h-11 font-medium shadow-xs"
                >
                  <Send className="mr-2 size-4" aria-hidden="true" />
                  <span>{t('submitFinalExam')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>

      </div>
    </div>
  );
}
