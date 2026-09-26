"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Flag, Send, CheckCircle2, ShieldCheck, WifiOff, AlertTriangle, ArrowRight, Layers } from 'lucide-react';

import { CandidateQuestion, isQuestionAnswered } from '@/types/question';
import { ExamSectionConfig } from '@/types/section';
import { 
  resolveCandidateQuestions,
  startRemoteExamAttempt,
  saveCandidateAnswer,
  submitExamAttempt,
  updateSectionProgress
} from '@/lib/api/examRepository';
import { getSafeQuestionsForContext } from '@/lib/questions/safeQuestionBank';
import { AvailableExams, PracticeSets } from '@/lib/mockData';
import { useExamEngine } from '@/lib/useExamEngine';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ExamTimer } from '@/components/exam/ExamTimer';
import { QuestionDisplay } from '@/components/exam/QuestionDisplay';
import { QuestionPalette } from '@/components/exam/QuestionPalette';
import { SubmitDialog } from '@/components/exam/SubmitDialog';
import { SectionAdvanceDialog } from '@/components/exam/SectionAdvanceDialog';

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
  sections?: ExamSectionConfig[] | null;
}

function ActiveExamSession({
  questions,
  activeConfig,
  setId,
  examId,
  isRemote,
  sections
}: ActiveExamSessionProps) {
  const router = useRouter();
  const examDuration = activeConfig ? activeConfig.duration * 60 : 900;
  const { t } = useTranslation();
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isSectionAdvanceDialogOpen, setIsSectionAdvanceDialogOpen] = useState(false);
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

      // Build finalized section progress payload if exam has sections
      let sectionProgressPayload = undefined;
      if (finalState.sections && finalState.sections.length > 0) {
        sectionProgressPayload = {
          active_section_index: finalState.activeSectionIndex,
          sections: finalState.sections.map((sec, idx) => {
            const secDurationSec = (sec.duration_minutes || 5) * 60;
            const isCompleted = idx < finalState.activeSectionIndex;
            const isCurrent = idx === finalState.activeSectionIndex;
            const timeUsed = isCompleted 
              ? secDurationSec 
              : isCurrent 
                ? Math.max(0, secDurationSec - finalState.sectionTimeRemaining) 
                : 0;
            return {
              section_id: sec.id,
              name: sec.name,
              order_index: sec.order_index ?? idx,
              duration_seconds: secDurationSec,
              time_used_seconds: timeUsed,
              started_at: new Date().toISOString(),
              submitted_at: (isCompleted || isCurrent) ? new Date().toISOString() : null,
              status: (isCompleted || isCurrent ? 'completed' : 'pending') as any,
              timing_flag: 'NORMAL' as any,
            };
          })
        };
      }

      // 1. If remote attempt is active, submit securely to server endpoint
      if (attemptId) {
        try {
          const res = await submitExamAttempt(
            attemptId, 
            finalState.answers, 
            finalState.timeRemaining,
            sectionProgressPayload
          );
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
          questionIds: questions.map(q => q.id),
          sections: finalState.sections || undefined,
          activeSection: finalState.activeSection || undefined,
        };
        sessionStorage.setItem('examResultState', JSON.stringify(stateToSave));
      }
      setIsSubmitting(false);
      router.push('/results');
    },
    0,
    setId || undefined,
    examId || undefined,
    isRemote,
    sections,
    (sectionIndex, autoAdvanced) => {
      // Sync section progress non-blockingly with server
      if (attemptId && sections && sections[sectionIndex]) {
        const sec = sections[sectionIndex];
        const secAllotted = (sec.duration_minutes || 5) * 60;
        const timeUsed = autoAdvanced ? secAllotted : Math.max(0, secAllotted - state.sectionTimeRemaining);
        updateSectionProgress(attemptId, sec.id, timeUsed, true).catch(err => {
          console.warn('[ExamPage] Section progress sync notice:', err);
        });
      }
    }
  );

  // Persist answers non-blockingly with server-side sectional anti-tamper validation
  useEffect(() => {
    if (!attemptId || !currentQuestion) return;
    const currentAns = state.answers[currentQuestion.id];
    if (currentAns !== undefined && currentAns !== null) {
      saveCandidateAnswer(attemptId, currentQuestion.id, currentAns);
    }
  }, [attemptId, currentQuestion, state.answers]);

  // Handle exam edge cases: page refresh warning, tab switching, and network disconnect/reconnect
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!state.isSubmitted && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    const handleVisibilityChange = () => {
      const liveRegion = document.getElementById('exam-live-region');
      if (document.hidden) {
        if (liveRegion) {
          liveRegion.textContent = 'Exam notice: Browser tab is now in background. Exam timer is still actively running.';
        }
      } else {
        if (liveRegion) {
          liveRegion.textContent = 'Browser tab restored. Examination is in progress.';
        }
      }
    };

    const handleOnline = () => {
      const liveRegion = document.getElementById('exam-live-region');
      if (liveRegion) {
        liveRegion.textContent = 'Network connection restored. Re-syncing answers with server.';
      }
      if (attemptId && currentQuestion && state.answers[currentQuestion.id] !== undefined) {
        saveCandidateAnswer(attemptId, currentQuestion.id, state.answers[currentQuestion.id]);
      }
    };

    const handleOffline = () => {
      const liveRegion = document.getElementById('exam-live-region');
      if (liveRegion) {
        liveRegion.textContent = 'Warning: Network connection lost. Answers will be retained locally and synced when online.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state.isSubmitted, isSubmitting, attemptId, currentQuestion, state.answers]);

  const totalQuestions = questions.length;
  const hasSections = Boolean(sections && sections.length > 0);

  const { isActive, status, lastCommand, lastActionFeedback, errorMessage, toggleVoiceMode } = useVoiceMode({
    actions,
    state,
    currentQuestion,
    totalQuestions,
    questions,
    activeSection: state.activeSection,
    sectionTimeRemaining: state.sectionTimeRemaining,
    onOpenSubmitDialog: () => setIsSubmitDialogOpen(true),
    onCloseSubmitDialog: () => setIsSubmitDialogOpen(false),
  });

  const isFlagged = currentQuestion ? state.flagged.has(currentQuestion.id) : false;
  const answeredCount = questions.filter(q => isQuestionAnswered(q, state.answers[q.id])).length;
  const progressPercent = totalQuestions > 0 
    ? Math.round(((state.currentQuestionIndex + 1) / totalQuestions) * 100) 
    : 0;

  const currentSectionName = state.activeSection?.name || 'Current Section';
  const nextSectionIndex = state.activeSectionIndex + 1;
  const nextSection = (sections && nextSectionIndex < sections.length) ? sections[nextSectionIndex] : null;

  if (!currentQuestion) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-8 text-center text-muted-foreground font-medium">
        Loading question...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-4 md:p-8 space-y-6 relative">
      <LiveRegion />

      {/* Submission In-Progress Modal Overlay */}
      {isSubmitting && (
        <div 
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="status"
          aria-live="assertive"
          aria-label="Submitting and evaluating examination"
        >
          <div className="bg-card border border-border shadow-lg rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-4">
            <div className="mx-auto size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="inline-block size-6 animate-spin rounded-full border-3 border-solid border-primary border-r-transparent" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-foreground">
                Grading Examination...
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Evaluating answers securely on the server and persisting official scoring metrics. Please do not close or refresh this tab.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submission Error Banner */}
      {submitError && (
        <div 
          role="alert" 
          aria-live="assertive"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-foreground">Submission Encountered an Issue</p>
              <p className="text-xs text-muted-foreground">{submitError}. Your answers remain intact.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                setSubmitError(null);
                actions.submitExam();
              }}
              className="w-full sm:w-auto font-medium border-destructive/40 hover:bg-destructive/10"
            >
              Retry Submission
            </Button>
          </div>
        </div>
      )}
      
      {/* Whole Exam Submit Dialog */}
      <SubmitDialog 
        isOpen={isSubmitDialogOpen}
        onOpenChange={setIsSubmitDialogOpen}
        totalQuestions={totalQuestions}
        answeredCount={answeredCount}
        onConfirmSubmit={actions.submitExam}
      />

      {/* Section Advance Confirmation Dialog */}
      {nextSection && (
        <SectionAdvanceDialog
          isOpen={isSectionAdvanceDialogOpen}
          onOpenChange={setIsSectionAdvanceDialogOpen}
          currentSectionName={currentSectionName}
          nextSectionName={nextSection.name}
          onConfirmAdvance={() => {
            if (actions.goToNextSection) {
              actions.goToNextSection();
            }
          }}
        />
      )}

      {/* SECTION 1 — Exam Header */}
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
              {hasSections && (
                <Badge 
                  variant="outline" 
                  className="text-xs font-semibold text-primary border-primary/30 bg-primary/10 flex items-center gap-1"
                >
                  <Layers className="size-3" aria-hidden="true" />
                  <span>Sectional Timing Active</span>
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
              hasSections={hasSections}
              sectionTimeRemaining={state.sectionTimeRemaining}
              sectionName={state.activeSection?.name}
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

      {/* SECTION 2 — Active Section Banner (shown when sections exist) */}
      {hasSections && state.activeSection && (
        <section 
          className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 bg-muted/40 border border-primary/20 rounded-xl"
          aria-label="Active examination section details"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
              S{state.activeSectionIndex + 1}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-foreground">
                  Section {state.activeSectionIndex + 1} of {sections?.length}: {state.activeSection.name}
                </span>
                <Badge variant="outline" className="text-2xs font-semibold">
                  {state.activeSection.duration_minutes} min limit
                </Badge>
              </div>
              <p className="text-2xs sm:text-xs text-muted-foreground">
                Navigation is restricted to this section. Once submitted or when time runs out, auto-advance will lock this section.
              </p>
            </div>
          </div>

          {nextSection && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSectionAdvanceDialogOpen(true)}
              className="h-9 px-3 text-xs font-semibold shadow-2xs gap-1.5"
            >
              <span>Next Section ({nextSection.name})</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Button>
          )}
        </section>
      )}

      {/* SECTION 3 — Main Exam Workspace (Desktop 2-col, Mobile 1-col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        
        {/* Left/Main Column: Question Display & Navigation (8 cols on desktop) */}
        <div className="lg:col-span-8 flex flex-col space-y-6 w-full">
          
          {/* Main Question Card */}
          <Card className="border border-border bg-card shadow-xs overflow-hidden">
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
                disabled={
                  hasSections 
                    ? state.currentSectionIndices.indexOf(state.currentQuestionIndex) <= 0
                    : state.currentQuestionIndex === 0
                }
                aria-label="Go to previous question in section"
                className="h-11 px-4 font-medium border-border"
              >
                <ChevronLeft className="mr-1.5 size-5" aria-hidden="true" />
                <span>{t('previous')}</span>
              </Button>
              <Button 
                variant="default" 
                size="lg"
                onClick={actions.goToNext}
                disabled={
                  hasSections 
                    ? state.currentSectionIndices.indexOf(state.currentQuestionIndex) >= state.currentSectionIndices.length - 1
                    : state.currentQuestionIndex === totalQuestions - 1
                }
                aria-label="Go to next question in section"
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
                sections={sections}
                activeSectionIndex={state.activeSectionIndex}
                currentSectionIndices={state.currentSectionIndices}
              />

              <div className="pt-2 border-t border-border/50 space-y-2">
                {nextSection && (
                  <Button 
                    variant="outline"
                    onClick={() => setIsSectionAdvanceDialogOpen(true)}
                    className="w-full h-10 font-medium text-xs gap-1.5 border-border"
                  >
                    <span>Advance to Next Section</span>
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Button>
                )}

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
  const [sections, setSections] = useState<ExamSectionConfig[] | null>(null);
  const [isRemote, setIsRemote] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadExamQuestions = React.useCallback(() => {
    let isMounted = true;
    setLoading(true);
    setLoadError(null);

    resolveCandidateQuestions({ setId, examId })
      .then((res) => {
        if (!isMounted) return;
        if (res.questions.length === 0) {
          const fallback = getSafeQuestionsForContext({ setId, examId });
          setQuestions(fallback);
          setIsRemote(false);
          setSections((selectedExam as any)?.sections || null);
          if (fallback.length === 0) {
            setLoadError('No examination questions found for this exam code.');
          }
        } else {
          setQuestions(res.questions);
          setIsRemote(res.isRemote);
          setSections(res.sections || (selectedExam as any)?.sections || null);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[ExamPage] Failed to load remote questions, using safe fallback:', err);
        const fallback = getSafeQuestionsForContext({ setId, examId });
        setQuestions(fallback);
        setIsRemote(false);
        setSections((selectedExam as any)?.sections || null);
        if (fallback.length === 0) {
          setLoadError('Failed to load examination questions.');
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [setId, examId, selectedExam]);

  useEffect(() => {
    return loadExamQuestions();
  }, [loadExamQuestions]);

  if (loading) {
    return (
      <div 
        className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6"
        role="status"
        aria-live="polite"
        aria-label="Loading examination session"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="space-y-1">
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted/60 rounded animate-pulse" />
          </div>
          <div className="h-10 w-28 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="h-48 rounded-xl border border-border/60 bg-muted/20 animate-pulse p-6 space-y-4">
              <div className="h-5 w-24 bg-muted rounded" />
              <div className="h-6 w-3/4 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted/60 rounded" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 rounded-lg border border-border/60 bg-muted/15 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="hidden lg:block lg:col-span-1">
            <div className="h-96 rounded-xl border border-border/60 bg-muted/20 animate-pulse p-4 space-y-3">
              <div className="h-5 w-32 bg-muted rounded" />
              <div className="grid grid-cols-5 gap-2 pt-2">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div key={i} className="h-8 w-8 rounded bg-muted/60" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || questions.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-destructive/30" role="alert">
          <CardHeader>
            <div className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
              <AlertTriangle className="size-5" aria-hidden="true" />
            </div>
            <CardTitle>Unable to Load Examination</CardTitle>
            <CardDescription>
              {loadError || 'No question cohort was found for this examination configuration.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={loadExamQuestions}>
              Retry Loading Examination
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              render={<Link href="/dashboard" />} 
              nativeButton={false}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
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
      sections={sections}
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
