"use client"

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Flag, Send, CheckCircle2, ShieldCheck, WifiOff } from 'lucide-react';

import { CandidateQuestion, isQuestionAnswered } from '@/types/question';
import { 
  resolveCandidateQuestions,
  startRemoteExamAttempt,
  saveCandidateAnswer,
  submitExamAttempt
} from '@/lib/api/examRepository';
import { getSafeQuestionsForContext } from '@/lib/questions/safeQuestionBank';
import { AvailableExams, PracticeSets } from '@/lib/mockData';
import { useExamEngine } from '@/lib/useExamEngine';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface ActiveExamSessionProps {
  questions: CandidateQuestion[];
  activeConfig: any;
  setId: string | null;
  examId: string | null;
  isRemote: boolean;
}

function ActiveExamSession({
  questions,
  activeConfig,
  setId,
  examId,
  isRemote
}: ActiveExamSessionProps) {
  const router = useRouter();
  const examDuration = activeConfig ? activeConfig.duration * 60 : 900;
  const { t } = useTranslation();
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize official remote attempt when in remote mode
  useEffect(() => {
    let isSubscribed = true;
    const targetExamOrSet = examId || setId;

    if (isRemote && targetExamOrSet) {
      startRemoteExamAttempt(targetExamOrSet, questions.length)
        .then((res) => {
          if (isSubscribed && res.attemptId) {
            setAttemptId(res.attemptId);
          }
        })
        .catch((err) => {
          console.warn('[ExamPage] Remote attempt initialization notice:', err);
        });
    }

    return () => {
      isSubscribed = false;
    };
  }, [isRemote, examId, setId, questions.length]);

  const { state, actions, currentQuestion } = useExamEngine(
    questions,
    examDuration,
    async (finalState) => {
      setIsSubmitting(true);
      setSubmitError(null);

      // 1. If remote attempt is active, submit securely to server endpoint
      if (attemptId) {
        try {
          const res = await submitExamAttempt(attemptId, finalState.answers, finalState.timeRemaining);
          if (res.success) {
            router.push(`/results?attemptId=${attemptId}`);
            return;
          }
          console.warn('[ExamPage] Server submission returned error, falling back:', res.error);
          setSubmitError(res.error || 'Submission failed');
        } catch (err: any) {
          console.error('[ExamPage] Submission exception:', err);
          setSubmitError(err?.message || 'Submission error');
        }
      }

      // 2. Safe local fallback if offline, unauthenticated, or server unreachable
      if (typeof window !== 'undefined') {
        const stateToSave = {
          ...finalState,
          flagged: Array.from(finalState.flagged),
          setId: setId || undefined,
          examId: examId || undefined,
          isRemote: false,
          questionIds: questions.map(q => q.id)
        };
        sessionStorage.setItem('examResultState', JSON.stringify(stateToSave));
      }
      setIsSubmitting(false);
      router.push('/results');
    },
    0,
    setId || undefined,
    examId || undefined,
    isRemote
  );

  // Persist answers non-blockingly to attempt_answers when changed
  useEffect(() => {
    if (!attemptId || !currentQuestion) return;
    const currentAns = state.answers[currentQuestion.id];
    if (currentAns !== undefined && currentAns !== null) {
      saveCandidateAnswer(attemptId, currentQuestion.id, currentAns);
    }
  }, [attemptId, currentQuestion, state.answers]);

  const totalQuestions = questions.length;

  const { isActive, status, lastCommand, lastActionFeedback, errorMessage, toggleVoiceMode } = useVoiceMode({
    actions,
    state,
    currentQuestion,
    totalQuestions,
    questions,
    onOpenSubmitDialog: () => setIsSubmitDialogOpen(true),
    onCloseSubmitDialog: () => setIsSubmitDialogOpen(false),
  });

  const isFlagged = currentQuestion ? state.flagged.has(currentQuestion.id) : false;
  const answeredCount = questions.filter(q => isQuestionAnswered(q, state.answers[q.id])).length;
  const progressPercent = totalQuestions > 0 
    ? Math.round(((state.currentQuestionIndex + 1) / totalQuestions) * 100) 
    : 0;

  if (!currentQuestion) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-8 text-center text-muted-foreground font-medium">
        Loading question...
      </div>
    );
  }

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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                {activeConfig ? activeConfig.title : t('examName')}
              </h1>
              {activeConfig && (
                <Badge variant="outline" className="text-xs font-semibold">
                  {activeConfig.subject}
                </Badge>
              )}
              {isRemote ? (
                <Badge 
                  variant="outline" 
                  className="text-xs font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 flex items-center gap-1"
                >
                  <ShieldCheck className="size-3" aria-hidden="true" />
                  <span>Secure Remote Engine</span>
                </Badge>
              ) : (
                <Badge 
                  variant="outline" 
                  className="text-xs font-medium text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 flex items-center gap-1"
                >
                  <WifiOff className="size-3" aria-hidden="true" />
                  <span>Local Safe Fallback</span>
                </Badge>
              )}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              {activeConfig
                ? `${activeConfig.description} · ${setId ? 'Practice Mode' : 'Full Exam Simulation'} (${activeConfig.difficulty})`
                : 'SSC CGL Tier 1 Practice · General Competitive Pattern'}
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
            <CardContent className="p-6 md:p-8">
              <QuestionDisplay 
                question={currentQuestion}
                currentIndex={state.currentQuestionIndex}
                totalQuestions={totalQuestions}
                userAnswer={state.answers[currentQuestion.id]}
                selectedOptionId={typeof state.answers[currentQuestion.id] === 'string' ? (state.answers[currentQuestion.id] as string) : undefined}
                onSelectOption={actions.selectAnswer}
                onToggleOption={actions.toggleOption}
                onSetAnswer={actions.setAnswer}
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

          {/* Voice Examination Mode Assistive Panel */}
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

function ExamContent() {
  const searchParams = useSearchParams();
  const setId = searchParams?.get('set') || null;
  const examId = searchParams?.get('exam') || searchParams?.get('id') || null;

  const practiceSet = setId ? PracticeSets.find(p => p.id === setId) : null;
  const selectedExam = examId ? AvailableExams.find(e => 
    e.id.toLowerCase() === examId.toLowerCase() || 
    e.title.toLowerCase().replace(/\s+/g, '-').includes(examId.toLowerCase()) ||
    examId.toLowerCase().includes(e.id.toLowerCase())
  ) : null;

  const activeConfig = practiceSet || selectedExam;

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<CandidateQuestion[]>([]);
  const [isRemote, setIsRemote] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    resolveCandidateQuestions({ setId, examId })
      .then((res) => {
        if (!isMounted) return;
        setQuestions(res.questions);
        setIsRemote(res.isRemote);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[ExamPage] Failed to load remote questions, using safe fallback:', err);
        const fallback = getSafeQuestionsForContext({ setId, examId });
        setQuestions(fallback);
        setIsRemote(false);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [setId, examId]);

  if (loading || questions.length === 0) {
    return (
      <div 
        className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4 text-center"
        role="status"
        aria-live="polite"
      >
        <div className="size-10 rounded-full border-4 border-primary border-t-transparent animate-spin" aria-hidden="true" />
        <h2 className="text-xl font-bold text-foreground">Loading examination questions...</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Retrieving candidate-safe question cohort from remote exam engine.
        </p>
      </div>
    );
  }

  return (
    <ActiveExamSession
      questions={questions}
      activeConfig={activeConfig}
      setId={setId}
      examId={examId}
      isRemote={isRemote}
    />
  );
}

export default function ExamPage() {
  return (
    <React.Suspense
      fallback={
        <div 
          className="min-h-[50vh] flex items-center justify-center p-8 text-center text-muted-foreground font-medium"
          role="status"
          aria-live="polite"
        >
          Loading examination...
        </div>
      }
    >
      <ExamContent />
    </React.Suspense>
  );
}
