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
import { resolveExamTitle, resolveExamSubject } from '@/lib/personalization/history';
import { useExamEngine } from '@/lib/useExamEngine';
import { stopSpeaking, speakText } from '@/lib/voice/useVoiceEngine';
import { setExamSessionActive } from '@/lib/assistant/sarthiExamLock';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { LoaderOne } from '@/components/ui/loader-one';
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
import { ExamMicStatusBar } from '@/components/exam/ExamMicStatusBar';
import { ExamVoiceDebugVisualizer } from '@/components/exam/ExamVoiceDebugVisualizer';
import { useTranslation } from '@/lib/i18n';
import { ExamSelectionHub } from '@/components/exam/ExamSelectionHub';
import { ExamInstructionScreen } from '@/components/exam/ExamInstructionScreen';

export { ExamSelectionHub };

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
  const rawDuration = (activeConfig as any)?.duration ?? (activeConfig as any)?.duration_minutes;
  const examDuration = typeof rawDuration === 'number' && rawDuration > 0 ? rawDuration * 60 : 900;
  const { t, language } = useTranslation();
  const isPracticeMode = Boolean(setId);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isSectionAdvanceDialogOpen, setIsSectionAdvanceDialogOpen] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attemptError, setAttemptError] = useState<string | null>(null);

  // Mount/unmount security lockdown tracking
  useEffect(() => {
    setExamSessionActive(true);
    return () => {
      setExamSessionActive(false);
    };
  }, []);

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
          if (isSubscribed && !setId) setAttemptError("Couldn't start an official attempt; sign in / retry");
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
      setExamSessionActive(false);
      stopSpeaking();
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
            setTimeout(() => {
              router.push(`/results?attemptId=${attemptId}`);
            }, 0);
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
        const attemptTimestamp = Date.now();
        const timeUsedSeconds = Math.max(0, examDuration - (finalState.timeRemaining || 0));
        const resolvedTargetId = examId || setId || 'mock';
        const resolvedTitle = activeConfig?.title || resolveExamTitle(resolvedTargetId);
        const resolvedSubject = activeConfig?.subject || resolveExamSubject(resolvedTargetId);

        const stateToSave = {
          ...finalState,
          attemptId: attemptId || `local-${resolvedTargetId}-${attemptTimestamp}`,
          timestamp: attemptTimestamp,
          flagged: Array.from(finalState.flagged),
          setId: setId || undefined,
          examId: examId || undefined,
          examTitle: resolvedTitle,
          subject: resolvedSubject,
          timeUsedSeconds,
          isRemote: Boolean(attemptId),
          questionIds: questions.map(q => q.id),
          sections: finalState.sections || undefined,
          activeSection: finalState.activeSection || undefined,
        };
        sessionStorage.setItem('examResultState', JSON.stringify(stateToSave));
      }
      setIsSubmitting(false);
      setTimeout(() => {
        router.push('/results');
      }, 0);
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

    const handlePopState = () => {
      if (!state.isSubmitted && !isSubmitting) {
        window.history.pushState(null, '', window.location.href);
        const liveRegion = document.getElementById('exam-live-region');
        if (liveRegion) {
          liveRegion.textContent = language === 'hi' 
            ? 'सुरक्षा सूचना: परीक्षा सक्रिय है। बाहर निकलने से पहले कृपया परीक्षा सबमिट करें।'
            : 'Security Notice: Examination is active. Please submit your exam before exiting.';
        }
        speakText(
          language === 'hi'
            ? 'सुरक्षा सूचना: परीक्षा सक्रिय है। बाहर निकलने से पहले कृपया परीक्षा सबमिट करें।'
            : 'Navigation is locked during an active examination. Please submit your exam first.'
        );
      }
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state.isSubmitted, isSubmitting, attemptId, currentQuestion, state.answers, language]);

  // When exam session begins or question changes, ensure question is scrolled into view
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      const questionEl = document.getElementById('active-question-display') || document.getElementById('active-question-card');
      if (questionEl) {
        questionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [currentQuestion?.id]);

  // Keep a brief loading state while the engine changes the active question.
  const [isLoading, setIsLoading] = useState(false);
  const currentIndex = state.currentQuestionIndex;

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setIsLoading(true);
      actions.goToNext();
      // Ensure loading state always resolves after render
      setTimeout(() => setIsLoading(false), 300);
    } else {
      // Reached the end
      setIsSubmitDialogOpen(true);
    }
  };

  const handlePrevQuestion = () => {
    actions.goToPrevious();
  };

  // Synchronize global voice companion actions with active exam state
  useEffect(() => {
    const handleVoiceAction = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { action, letter, index } = customEvent.detail || {};

      if (action === 'next') {
        handleNextQuestion();
      } else if (action === 'prev') {
        handlePrevQuestion();
      } else if (action === 'select-option' && currentQuestion) {
        const optionIndex = typeof index === 'number' ? index : (letter ? letter.charCodeAt(0) - 65 : -1);
        if (currentQuestion.options && optionIndex >= 0 && optionIndex < currentQuestion.options.length) {
          const opt = currentQuestion.options[optionIndex];
          actions.selectAnswer(currentQuestion.id, opt.id);
        }
      } else if (action === 'clear' && currentQuestion) {
        if (actions.setAnswer) {
          actions.setAnswer(currentQuestion.id, "");
        }
      } else if (action === 'flag' && currentQuestion) {
        actions.toggleFlag(currentQuestion.id);
      }
    };

    window.addEventListener('examsarthi-voice-action', handleVoiceAction);
    return () => {
      window.removeEventListener('examsarthi-voice-action', handleVoiceAction);
    };
  }, [actions, currentQuestion]);

  const totalQuestions = questions.length;
  const hasSections = Boolean(sections && sections.length > 0);

  const { 
    isActive, 
    status, 
    isSpeaking,
    lastCommand, 
    lastTranscript,
    lastHeardTranscript,
    voiceStatus,
    handleManualMicActivation,
    lastActionFeedback, 
    errorMessage, 
    isAudioUnlocked,
    unlockAudio,
    readCurrentQuestion,
    toggleVoiceMode 
  } = useVoiceMode({
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

  // Synchronize exam keyboard shortcuts: Alt+N (Next), Alt+P (Prev), Alt+M (Toggle Mic), 1-4 (Options), Space (Unlock Audio)
  useEffect(() => {
    const handleExamKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Space -> Unlock audio if banner is active
      if (!isAudioUnlocked && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        unlockAudio();
        return;
      }

      // Alt+M -> Toggle microphone on/off
      if (e.altKey && (e.key === 'm' || e.key === 'M' || e.code === 'KeyM')) {
        e.preventDefault();
        toggleVoiceMode();
        return;
      }

      // Alt+N -> Next question
      if (e.altKey && (e.key === 'n' || e.key === 'N' || e.code === 'KeyN')) {
        e.preventDefault();
        handleNextQuestion();
        return;
      }

      // Alt+P -> Previous question
      if (e.altKey && (e.key === 'p' || e.key === 'P' || e.code === 'KeyP')) {
        e.preventDefault();
        handlePrevQuestion();
        return;
      }

      // 1-4 -> Select Option A-D (1=A, 2=B, 3=C, 4=D)
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
  }, [actions, currentQuestion, toggleVoiceMode, isAudioUnlocked, unlockAudio]);

  const isFlagged = currentQuestion ? state.flagged.has(currentQuestion.id) : false;
  const answeredCount = questions.filter(q => isQuestionAnswered(q, state.answers[q.id])).length;
  const progressPercent = totalQuestions > 0 
    ? Math.round(((state.currentQuestionIndex + 1) / totalQuestions) * 100) 
    : 0;

  const currentSectionName = state.activeSection?.name || 'Current Section';
  const nextSectionIndex = state.activeSectionIndex + 1;
  const nextSection = (sections && nextSectionIndex < sections.length) ? sections[nextSectionIndex] : null;

  if (!questions || !questions[currentIndex] || !currentQuestion || isLoading) {
    if (isLoading) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
          <LoaderOne label="Loading next question..." size="md" />
        </div>
      );
    }
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle className="size-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          {language === 'hi' ? 'प्रश्न लोड करने में समस्या या परीक्षा पूर्ण' : 'Question Not Found or Examination Complete'}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {language === 'hi' ? 'आप अंतिम प्रश्न तक पहुँच चुके हैं या प्रश्न लोड नहीं हो सका।' : 'You have reached the end of the question cohort or the question could not be loaded.'}
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => actions.goToQuestion(0)}>
            {language === 'hi' ? 'पहले प्रश्न पर जाएं' : 'Return to Question 1'}
          </Button>
          <Button variant="default" onClick={() => setIsSubmitDialogOpen(true)}>
            {language === 'hi' ? 'परीक्षा सबमिट करें' : 'Submit Examination'}
          </Button>
        </div>
      </div>
    );
  }

  if (attemptError) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle className="size-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          {attemptError}
        </h2>
        <div className="flex gap-3 justify-center">
          <Button variant="default" onClick={() => router.push('/login')}>
            Sign In / Retry
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-4 md:p-8 space-y-6 relative">
      <LiveRegion />

      {/* Floating Mic / Speaking Indicator */}
      {isActive && (
        isSpeaking || status === 'Speaking' ? (
          <div 
            aria-live="polite"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-neutral-900/95 border-2 border-red-500/70 shadow-[0_0_24px_rgba(239,68,68,0.5)] backdrop-blur-md"
          >
            <span className="size-3 rounded-full bg-red-500" />
            <span className="text-xs font-bold tracking-wider text-red-400 uppercase font-mono">
              [ 🔇 Mic Paused (Speaking) ]
            </span>
          </div>
        ) : status === 'Listening' ? (
          <div 
            aria-live="polite"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-neutral-950/95 border-2 border-[#ffed00] shadow-[0_0_24px_rgba(255,237,0,0.6)] backdrop-blur-md animate-pulse"
          >
            <div className="relative flex items-center justify-center">
              <span className="absolute -inset-1.5 rounded-full bg-[#ffed00]/60 animate-ping opacity-80" />
              <span className="size-3 rounded-full bg-[#ffed00]" />
            </div>
            <span className="text-xs font-bold tracking-wider text-[#ffed00] uppercase font-mono">
              [ 🎙️ Listening ]
            </span>
          </div>
        ) : null
      )}

      {/* Submission In-Progress Modal Overlay */}
      {isSubmitting && (
        <div 
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="status"
          aria-live="assertive"
          aria-label={isPracticeMode ? "Evaluating practice session answers" : "Submitting and evaluating examination"}
        >
          <div className="bg-card border border-border rounded-[2px] p-6 sm:p-8 max-w-md w-full text-center space-y-4">
            <div className="mx-auto py-2 flex items-center justify-center">
              <LoaderOne label={isPracticeMode ? "Evaluating practice answers..." : "Server-grading examination..."} size="lg" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-foreground">
                {isPracticeMode 
                  ? (language === 'hi' ? 'अभ्यास उत्तरों का मूल्यांकन हो रहा है...' : 'Evaluating Practice Answers...')
                  : (language === 'hi' ? 'परीक्षा का मूल्यांकन हो रहा है...' : 'Grading Examination...')}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isPracticeMode
                  ? (language === 'hi' ? 'उत्तरों का मूल्यांकन किया जा रहा है और विस्तृत समाधान तैयार हो रहे हैं।' : 'Evaluating your practice responses and preparing your comprehensive review walkthrough. Please do not close this tab.')
                  : (language === 'hi' ? 'सर्वर पर उत्तरों का सुरक्षित मूल्यांकन किया जा रहा है। कृपया इस टैब को बंद न करें।' : 'Evaluating answers securely on the server and persisting official scoring metrics. Please do not close or refresh this tab.')}
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
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-none border border-destructive/30 bg-destructive/10 text-destructive text-sm"
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
              className="w-full sm:w-auto font-bold border-destructive/40 hover:bg-destructive/10"
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
        isPracticeMode={isPracticeMode}
        onConfirmSubmit={() => {
          stopSpeaking();
          actions.submitExam();
        }}
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
        className="flex flex-col gap-3 p-4 md:p-6 bg-card border rounded-none "
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-foreground">
                {activeConfig ? activeConfig.title : (isPracticeMode ? (language === 'hi' ? 'अभ्यास सत्र' : 'Practice Session') : t('examName'))}
              </h1>
              {activeConfig && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs font-bold",
                    isPracticeMode 
                      ? "border-emerald-500/50 text-emerald-400 bg-emerald-950/20" 
                      : "text-muted-foreground border-border/80"
                  )}
                >
                  {isPracticeMode ? (language === 'hi' ? 'अभ्यास सेट' : 'Practice Set') : activeConfig.subject}
                </Badge>
              )}
              {isPracticeMode && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[46px] text-xs font-bold text-emerald-300 bg-emerald-900/30 border border-emerald-500/30">
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  <span>{language === 'hi' ? 'अभ्यास मोड' : 'Practice Mode'}</span>
                </span>
              )}
              {hasSections && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[46px] text-xs font-bold text-primary bg-primary/10 border border-primary/20">
                  <Layers className="size-3" aria-hidden="true" />
                  <span>Sectional Timing Active</span>
                </span>
              )}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              {activeConfig
                ? `${activeConfig.description} · ${isPracticeMode ? (language === 'hi' ? 'अभ्यास सत्र' : 'Practice Session') : (language === 'hi' ? 'पूर्ण परीक्षा सिमुलेशन' : 'Full Exam Simulation')} (${activeConfig.difficulty})`
                : 'General Competitive Pattern'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">

            {/* Subtle Real-time Status Pill (Reading / Listening / Last heard) */}
            <ExamVoiceDebugVisualizer
              status={status}
              isActive={isActive}
              isSpeaking={isSpeaking}
              lastCommand={lastCommand}
              lastTranscript={lastTranscript}
              lastHeardTranscript={lastHeardTranscript}
              voiceStatus={voiceStatus}
              onEnableMic={handleManualMicActivation}
              onClick={toggleVoiceMode}
            />

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
              className="hidden md:flex font-bold h-10 px-4 "
            >
              <span>{isPracticeMode ? (language === 'hi' ? 'अभ्यास सबमिट करें' : 'Submit Practice') : t('submitExam')}</span>
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

      {/* Visual Mic Status Bar: 🔴 Off / 🟡 Listening / 🟢 Recognized */}
      <ExamMicStatusBar
        isActive={isActive}
        status={status}
        isSpeaking={isSpeaking}
        lastCommand={lastCommand}
        lastTranscript={lastTranscript}
        lastHeardTranscript={lastHeardTranscript}
        voiceStatus={voiceStatus}
        lastActionFeedback={lastActionFeedback}
        errorMessage={errorMessage}
        onToggle={toggleVoiceMode}
        onEnableMic={handleManualMicActivation}
      />

      {/* SECTION 2 — Active Section Banner (shown when sections exist) */}
      {hasSections && state.activeSection && (
        <section 
          className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 bg-muted/40 border border-primary/20 rounded-none"
          aria-label="Active examination section details"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-[2px] bg-primary/10 text-primary font-bold text-sm">
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
              className="h-9 px-3 text-xs font-semibold  gap-1.5"
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
          
          {/* Main Question Card - Primary Visual Focus */}
          <Card id="active-question-card" className="border-2 border-border/90 bg-card rounded-none overflow-hidden ring-1 ring-border/50 scroll-mt-24">
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
            className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border rounded-none "
            role="toolbar"
            aria-label="Question navigation actions"
          >
            {/* Previous & Next */}
            <div className="flex items-center gap-2.5">
              <Button 
                variant="outline" 
                size="lg"
                onClick={handlePrevQuestion}
                disabled={
                  hasSections 
                    ? state.currentSectionIndices.indexOf(state.currentQuestionIndex) <= 0
                    : state.currentQuestionIndex === 0
                }
                aria-label="Go to previous question in section"
                className="h-12 px-4 font-bold border-border"
              >
                <ChevronLeft className="mr-1.5 size-5" aria-hidden="true" />
                <span>{t('previous')}</span>
              </Button>
              <Button 
                variant="default" 
                size="lg"
                onClick={handleNextQuestion}
                disabled={
                  isLoading ||
                  (hasSections 
                    ? state.currentSectionIndices.indexOf(state.currentQuestionIndex) >= state.currentSectionIndices.length - 1
                    : state.currentQuestionIndex >= totalQuestions - 1)
                }
                aria-label="Go to next question in section"
                className="h-12 px-5 font-bold "
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
                className={`h-12 px-4 font-bold transition-all ${
                  isFlagged 
                    ? 'border-amber-400 bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-[0_0_12px_rgba(245,158,11,0.4)]' 
                    : 'border-border'
                }`}
              >
                <Flag 
                  className={`mr-2 size-4 transition-colors ${
                    isFlagged ? 'text-black fill-black' : 'text-muted-foreground'
                  }`} 
                  aria-hidden="true"
                /> 
                <span>{isFlagged ? t('flaggedForReview') : t('flagForReview')}</span>
              </Button>

              <Button 
                variant="default" 
                size="lg"
                onClick={() => setIsSubmitDialogOpen(true)}
                className="md:hidden h-12 px-4 font-bold "
              >
                <span>{isPracticeMode ? (language === 'hi' ? 'अभ्यास सबमिट करें' : 'Submit Practice') : t('submit')}</span>
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
          <Card className="border border-border/70 bg-card/80  lg:sticky lg:top-20 rounded-none">
            <CardHeader className="p-4 sm:p-5 border-b border-border/40 bg-muted/10">
              <div className="flex items-center justify-between">
                <CardTitle className="font-semibold text-base text-foreground">
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
                    className="w-full h-10 font-bold text-xs gap-1.5 border-border"
                  >
                    <span>Advance to Next Section</span>
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Button>
                )}

                <Button 
                  onClick={() => setIsSubmitDialogOpen(true)}
                  className="w-full h-12 font-bold "
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

interface ExamSessionLoaderProps {
  rawSet: string | null;
  rawExam: string | null;
}

function ExamSessionLoader({ rawSet, rawExam }: ExamSessionLoaderProps) {
  const router = useRouter();
  // Parse target session parameters
  let setId: string | null = null;
  let examId: string | null = null;

  if (rawSet) {
    const s = rawSet.toLowerCase().trim();
    if (s.startsWith('p') && (s === 'p6' || s === 'p1' || s === 'p2' || s === 'p3' || s === 'p4' || s === 'p5')) {
      setId = s;
    } else if (s.includes('upsc') || s.includes('csat') || s === 'e3') {
      examId = 'e3';
    } else if (s.includes('ibps') || s.includes('bank') || s === 'e2') {
      examId = 'e2';
    } else if (s.includes('ugc') || s.includes('net') || s === 'e4') {
      examId = 'e4';
    } else if (s.includes('cgl') || s.includes('ssc') || s.includes('rrb') || s === 'e1') {
      examId = 'e1';
    } else {
      setId = s;
    }
  } else if (rawExam) {
    examId = rawExam;
  }

  const practiceSet = setId ? PracticeSets.find(p => p.id === setId) : null;
  const selectedExam = examId ? AvailableExams.find(e => 
    e.id.toLowerCase() === examId.toLowerCase() || 
    e.title.toLowerCase().replace(/\s+/g, '-').includes(examId.toLowerCase()) ||
    examId.toLowerCase().includes(e.id.toLowerCase())
  ) : null;

  const activeConfig = practiceSet || selectedExam;

  const [hasStartedExam, setHasStartedExam] = useState(false);
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
        const fetchedQuestions = res.questions.length === 0
          ? getSafeQuestionsForContext({ setId, examId })
          : res.questions;

        // 2. Purge Multi-Select Questions: Filter incoming questions strictly
        const validQuestions = fetchedQuestions.filter(q =>
          ['MCQ', 'single-choice', 'TRUE_FALSE', 'true-false', 'FILL_IN_BLANKS', 'fill-blank', 'short-answer', 'SHORT_ANSWER', 'MULTIPLE_SELECT', 'multiple-choice'].includes((q.type as string) || 'MCQ')
        );

        setQuestions(validQuestions);
        setIsRemote(res.questions.length > 0 ? res.isRemote : false);
        setSections(res.sections || (selectedExam as any)?.sections || null);
        if (validQuestions.length === 0) {
          setLoadError('No examination questions found for this exam code.');
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[ExamPage] Failed to load remote questions, using safe fallback:', err);
        const fallback = getSafeQuestionsForContext({ setId, examId });
        const validQuestions = fallback.filter(q =>
          ['MCQ', 'single-choice', 'TRUE_FALSE', 'true-false', 'FILL_IN_BLANKS', 'fill-blank', 'short-answer', 'SHORT_ANSWER', 'MULTIPLE_SELECT', 'multiple-choice'].includes((q.type as string) || 'MCQ')
        );
        setQuestions(validQuestions);
        setIsRemote(false);
        setSections((selectedExam as any)?.sections || null);
        if (validQuestions.length === 0) {
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
            <div className="h-48 rounded-none border border-border/60 bg-muted/20 animate-pulse p-6 space-y-4">
              <div className="h-5 w-24 bg-muted rounded" />
              <div className="h-6 w-3/4 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted/60 rounded" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 rounded-[2px] border border-border/60 bg-muted/15 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="hidden lg:block lg:col-span-1">
            <div className="h-96 rounded-none border border-border/60 bg-muted/20 animate-pulse p-4 space-y-3">
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
            <div className="size-10 rounded-[46px] bg-destructive/10 text-destructive flex items-center justify-center mb-2">
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

  if (!hasStartedExam) {
    const resolvedTitle = activeConfig?.title || resolveExamTitle(examId || setId);
    const rawDuration = (activeConfig as any)?.duration ?? (activeConfig as any)?.duration_minutes;
    const resolvedDuration = typeof rawDuration === 'number' && rawDuration > 0 ? rawDuration : 15;
    const resolvedAuthority = (activeConfig as any)?.authority || (
      examId === 'e4' || String(examId || setId).includes('ugc') ? 'University Grants Commission (NTA)' :
      examId === 'e1' || String(examId || setId).includes('cgl') || String(examId || setId).includes('ssc') ? 'Staff Selection Commission' :
      examId === 'e3' || String(examId || setId).includes('upsc') ? 'Union Public Service Commission' :
      examId === 'e2' || String(examId || setId).includes('bank') ? 'Institute of Banking Personnel Selection' :
      'Examsarthi Scribe Portal'
    );
    const resolvedSubject = activeConfig?.subject || resolveExamSubject(examId || setId);

    return (
      <ExamInstructionScreen
        examTitle={resolvedTitle}
        authority={resolvedAuthority}
        durationMinutes={resolvedDuration}
        questionsCount={questions.length}
        totalMarks={questions.length * 2}
        subject={resolvedSubject}
        sections={sections}
        onStartExam={() => setHasStartedExam(true)}
        onGoBack={() => router.push('/exam')}
      />
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

function ExamContent() {
  const searchParams = useSearchParams();
  const rawSet = searchParams?.get('set') || null;
  const rawExam = searchParams?.get('exam') || searchParams?.get('id') || null;

  // Render dedicated accessible Exam Selection Hub when visiting /exam directly without active session query
  if (!rawSet && !rawExam) {
    return <ExamSelectionHub />;
  }

  return <ExamSessionLoader key={`${rawSet}-${rawExam}`} rawSet={rawSet} rawExam={rawExam} />;
}

export default function ExamPage() {
  return (
    <React.Suspense
      fallback={
        <div 
          className="min-h-[50vh] flex items-center justify-center p-8 text-center text-muted-foreground font-bold"
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
