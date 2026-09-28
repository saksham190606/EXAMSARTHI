"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  X, 
  Mic, 
  Lightbulb, 
  Sparkles 
} from 'lucide-react';
import { speakText, startListening } from '@/lib/voice/useVoiceEngine';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { QuestionReviewList as BaseQuestionReviewList, QuestionReviewItem } from './QuestionReviewList';

export type { QuestionReviewItem };

export interface QuestionReviewProps {
  results?: {
    questions?: Array<{
      questionId?: string;
      id?: string;
      questionText?: string;
      text?: string;
      userAnswer: any;
      correctAnswer: any;
      isCorrect?: boolean;
      explanation?: string;
      options?: Array<{ id: string; text: string }>;
    }>;
  };
  questions?: any[];
  currentWalkthroughIndex?: number;
  setCurrentWalkthroughIndex?: React.Dispatch<React.SetStateAction<number>>;
  isWalkthroughActive?: boolean;
  setIsWalkthroughActive?: (active: boolean) => void;
  onClose?: () => void;
}

export function QuestionReview({
  results: propResults,
  questions: propQuestions,
  currentWalkthroughIndex: propIndex,
  setCurrentWalkthroughIndex: propSetIndex,
  isWalkthroughActive = true,
  setIsWalkthroughActive: propSetIsWalkthroughActive,
  onClose,
  ...otherProps
}: QuestionReviewProps & Record<string, any>) {
  const [internalIndex, setInternalIndex] = useState(0);
  const currentWalkthroughIndex = propIndex !== undefined ? propIndex : internalIndex;
  const setCurrentWalkthroughIndex = propSetIndex || setInternalIndex;

  // Normalize questions array
  const normalizedQuestions = useMemo(() => {
    const list = propResults?.questions || propQuestions || [];
    return list.map((q: any, idx: number) => {
      const qText = q.questionText || q.text || `Question ${idx + 1}`;
      const userAns = q.userAnswer !== undefined && q.userAnswer !== null ? String(q.userAnswer) : 'Not Answered';
      const corrAns = q.correctAnswer !== undefined && q.correctAnswer !== null ? String(q.correctAnswer) : 'N/A';
      const isCorrect = typeof q.isCorrect === 'boolean' 
        ? q.isCorrect 
        : (userAns.toLowerCase().trim() === corrAns.toLowerCase().trim());
      
      return {
        ...q,
        id: q.questionId || q.id || `q-${idx}`,
        questionText: qText,
        text: qText,
        userAnswer: userAns,
        correctAnswer: corrAns,
        isCorrect,
        explanation: q.explanation || '',
        options: q.options || []
      };
    });
  }, [propResults, propQuestions]);

  const results = useMemo(() => ({
    questions: normalizedQuestions
  }), [normalizedQuestions]);

  const setIsWalkthroughActive = (active: boolean) => {
    if (propSetIsWalkthroughActive) {
      propSetIsWalkthroughActive(active);
    }
    if (!active && onClose) {
      onClose();
    }
  };

  // NARRATION: Automatically read question, user answer, correct answer, and explanation aloud
  useEffect(() => {
    if (!results?.questions || results.questions.length === 0) return;
    const q = results.questions[currentWalkthroughIndex];
    if (!q) return;

    const isCorrect = q.userAnswer === q.correctAnswer || Boolean(q.isCorrect);
    const narrationText = `Question ${currentWalkthroughIndex + 1}. ${q.questionText}. You answered ${q.userAnswer}. ${isCorrect ? "That is correct!" : `That is incorrect. The correct answer is ${q.correctAnswer}.`} ${q.explanation ? `Explanation: ${q.explanation}` : ""}`;
    
    speakText(narrationText, () => {
      // Auto-open mic when finished speaking question narration
      if (typeof window !== 'undefined') {
        startListening();
      }
    });
  }, [currentWalkthroughIndex, results]);

  // NAVIGATION: Handle NEXT, PREVIOUS, STOP, PAUSE voice commands
  useEffect(() => {
    const handleNavigation = (e: any) => {
      const { intent, target } = e.detail || {};
      
      if (!intent || intent === 'CONTROL') {
        if (target === 'STOP' || target === 'PAUSE' || target === 'EXIT') {
          if (typeof window !== 'undefined') window.speechSynthesis.cancel();
          if (typeof onClose === 'function') onClose();
          if (typeof setIsWalkthroughActive === 'function') setIsWalkthroughActive(false);
        } else if (target === 'PREVIOUS') {
          setCurrentWalkthroughIndex((prev) => Math.max(prev - 1, 0));
        } else if (target === 'NEXT') {
          setCurrentWalkthroughIndex((prev) => Math.min(prev + 1, (results?.questions?.length || 1) - 1));
        } else if (target === 'REPEAT') {
          if (results?.questions && results.questions[currentWalkthroughIndex]) {
            const q = results.questions[currentWalkthroughIndex];
            const isCorrect = q.userAnswer === q.correctAnswer || Boolean(q.isCorrect);
            const narrationText = `Question ${currentWalkthroughIndex + 1}. ${q.questionText}. You answered ${q.userAnswer}. ${isCorrect ? "That is correct!" : `That is incorrect. The correct answer is ${q.correctAnswer}.`} ${q.explanation ? `Explanation: ${q.explanation}` : ""}`;
            speakText(narrationText, () => {
              if (typeof window !== 'undefined') startListening();
            });
          }
        }
      }
    };

    window.addEventListener('ai_voice_command', handleNavigation);
    return () => window.removeEventListener('ai_voice_command', handleNavigation);
  }, [results, currentWalkthroughIndex, setCurrentWalkthroughIndex, setIsWalkthroughActive, onClose]);

  // If walkthrough is not active, fallback to standard review list
  if (!isWalkthroughActive) {
    return <BaseQuestionReviewList {...otherProps} questions={propQuestions || []} isWalkthroughActive={false} />;
  }

  const currentQ = results.questions[currentWalkthroughIndex];
  const totalQuestions = results.questions.length;

  if (!currentQ || totalQuestions === 0) {
    return null;
  }

  const isCurrentCorrect = currentQ.userAnswer === currentQ.correctAnswer || Boolean(currentQ.isCorrect);

  const handleReadAgain = () => {
    const narrationText = `Question ${currentWalkthroughIndex + 1}. ${currentQ.questionText}. You answered ${currentQ.userAnswer}. ${isCurrentCorrect ? "That is correct!" : `That is incorrect. The correct answer is ${currentQ.correctAnswer}.`} ${currentQ.explanation ? `Explanation: ${currentQ.explanation}` : ""}`;
    speakText(narrationText, () => {
      if (typeof window !== 'undefined') startListening();
    });
  };

  const handleClose = () => {
    setIsWalkthroughActive(false);
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      window.dispatchEvent(new CustomEvent('examsarthi_review_stop'));
    }
  };

  return (
    <div 
      className="relative w-full bg-neutral-950 border-2 border-[#ffed00]/50 rounded-2xl p-6 sm:p-8 shadow-[0_0_35px_rgba(255,237,0,0.15)] flex flex-col gap-6 text-foreground overflow-hidden mb-8 animate-in fade-in zoom-in-95 duration-200"
      role="region"
      aria-label="AI Voice Question Walkthrough"
    >
        
        {/* TOP HEADER */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffed00] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ffed00]"></span>
            </span>
            <Badge className="bg-[#ffed00]/15 text-[#ffed00] border-[#ffed00]/40 font-semibold px-3 py-1 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              AI Voice Walkthrough
            </Badge>
            <span className="text-sm text-neutral-400 font-medium">
              Question <strong className="text-white">{currentWalkthroughIndex + 1}</strong> of <strong className="text-white">{totalQuestions}</strong>
            </span>
          </div>

          <button
            onClick={handleClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
            title="Stop Walkthrough (Say 'Stop')"
            aria-label="Close walkthrough"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* PROGRESS BAR */}
        <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-[#ffed00] h-full transition-all duration-300"
            style={{ width: `${((currentWalkthroughIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>

        {/* QUESTION CONTENT */}
        <div className="space-y-5">
          <div className="space-y-2">
            <span className="text-xs uppercase font-bold tracking-wider text-neutral-400">
              Question {currentWalkthroughIndex + 1}
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
              {currentQ.questionText}
            </h3>
          </div>

          {/* USER ANSWER & CORRECT ANSWER CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* User Answer Block */}
            <div className={`p-4 rounded-xl border ${
              isCurrentCorrect 
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' 
                : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Your Answer
                </span>
                {isCurrentCorrect ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                    <XCircle className="h-3.5 w-3.5" /> Incorrect
                  </span>
                )}
              </div>
              <p className="text-lg font-bold">
                {currentQ.userAnswer}
              </p>
            </div>

            {/* Correct Answer Block */}
            <div className="p-4 rounded-xl border bg-emerald-950/20 border-emerald-500/30 text-emerald-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Correct Answer
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Official Key
                </span>
              </div>
              <p className="text-lg font-bold text-emerald-300">
                {currentQ.correctAnswer}
              </p>
            </div>
          </div>

          {/* EXPLANATION BLOCK */}
          {currentQ.explanation && (
            <Card className="bg-neutral-900/90 border-neutral-800">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#ffed00]">
                  <Lightbulb className="h-4 w-4" />
                  <span>Explanation</span>
                </div>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  {currentQ.explanation}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* VOICE COMMAND HINT / MIC STATUS */}
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs sm:text-sm text-neutral-300">
          <Mic className="h-4 w-4 text-[#ffed00] animate-pulse" />
          <span>Voice Commands Active: Say <strong>&ldquo;Next&rdquo;</strong>, <strong>&ldquo;Previous&rdquo;</strong>, or <strong>&ldquo;Stop&rdquo;</strong></span>
        </div>

        {/* NAVIGATION CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800">
          <Button
            variant="outline"
            onClick={() => setCurrentWalkthroughIndex(prev => Math.max(prev - 1, 0))}
            disabled={currentWalkthroughIndex === 0}
            className="border-neutral-700 text-neutral-200 hover:bg-neutral-800 hover:text-white flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <Button
            variant="ghost"
            onClick={handleReadAgain}
            className="text-[#ffed00] hover:bg-[#ffed00]/10 flex items-center gap-2 text-xs sm:text-sm font-semibold"
          >
            <Volume2 className="h-4 w-4" />
            Read Again
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs"
            >
              Stop
            </Button>

            <Button
              onClick={() => setCurrentWalkthroughIndex(prev => Math.min(prev + 1, totalQuestions - 1))}
              disabled={currentWalkthroughIndex === totalQuestions - 1}
              className="bg-[#ffed00] text-black font-bold hover:bg-[#ffe100] flex items-center gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

      </div>
  );
}

export { QuestionReview as QuestionReviewList };
export default QuestionReview;
