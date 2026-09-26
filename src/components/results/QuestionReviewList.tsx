"use client";

import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  HelpCircle,
  Lightbulb,
  Check,
  X,
  Layers
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface QuestionReviewItem {
  questionId: string;
  orderIndex: number;
  sectionName?: string;
  text: string;
  type: string;
  subject: string;
  topic?: string;
  difficulty?: string;
  options?: Array<{ id: string; text: string }>;
  userAnswer: any;
  isCorrect: boolean;
  isAnswered: boolean;
  correctAnswer: any;
  acceptableAnswers?: string[];
  explanation?: string;
}

interface QuestionReviewListProps {
  questions: QuestionReviewItem[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function QuestionReviewList({
  questions,
  isLoading = false,
  error = null,
  onRetry,
}: QuestionReviewListProps) {
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');

  const filteredQuestions = questions.filter((q) => {
    if (filter === 'correct') return q.isCorrect;
    if (filter === 'incorrect') return q.isAnswered && !q.isCorrect;
    if (filter === 'unanswered') return !q.isAnswered;
    return true;
  });

  const correctCount = questions.filter((q) => q.isCorrect).length;
  const incorrectCount = questions.filter((q) => q.isAnswered && !q.isCorrect).length;
  const unansweredCount = questions.filter((q) => !q.isAnswered).length;

  const hasSections = questions.some(q => Boolean(q.sectionName));

  // Build section groups if sections exist on questions
  const sectionGroups = useMemo(() => {
    if (!hasSections) return [];
    const groups: Array<{
      name: string;
      total: number;
      correct: number;
      questions: QuestionReviewItem[];
    }> = [];
    const map = new Map<string, QuestionReviewItem[]>();

    questions.forEach(q => {
      const sName = q.sectionName || 'General Assessment';
      if (!map.has(sName)) {
        map.set(sName, []);
      }
      map.get(sName)!.push(q);
    });

    map.forEach((secQuestions, name) => {
      const secCorrect = secQuestions.filter(q => q.isCorrect).length;
      const secFiltered = secQuestions.filter((q) => {
        if (filter === 'correct') return q.isCorrect;
        if (filter === 'incorrect') return q.isAnswered && !q.isCorrect;
        if (filter === 'unanswered') return !q.isAnswered;
        return true;
      });

      groups.push({
        name,
        total: secQuestions.length,
        correct: secCorrect,
        questions: secFiltered,
      });
    });

    return groups;
  }, [hasSections, questions, filter]);

  if (isLoading) {
    return (
      <div 
        className="space-y-4 pt-4"
        role="status"
        aria-live="polite"
        aria-label="Loading question-by-question review"
      >
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="h-9 w-64 bg-muted animate-pulse rounded" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border border-border/60 animate-pulse">
            <CardHeader className="space-y-2 pb-3">
              <div className="flex gap-2">
                <div className="h-5 w-20 bg-muted rounded" />
                <div className="h-5 w-24 bg-muted rounded" />
              </div>
              <div className="h-5 w-3/4 bg-muted rounded" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-10 w-full bg-muted/60 rounded" />
              <div className="h-10 w-full bg-muted/60 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5" role="alert">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-sm font-semibold text-destructive">
              Unable to load question review
            </p>
            <p className="text-xs text-muted-foreground">
              {error}
            </p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
              Retry Review
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return null;
  }

  return (
    <section 
      aria-labelledby="question-review-heading" 
      className="space-y-6 pt-4 border-t border-border/60"
    >
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="space-y-1">
          <h2 id="question-review-heading" className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Question-by-Question Review</span>
            {hasSections && (
              <Badge variant="outline" className="text-2xs font-semibold text-primary border-primary/30 bg-primary/10">
                <Layers className="size-3 mr-1" aria-hidden="true" />
                Sectional Breakdown
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            Official evaluation comparing your responses against verified answer keys.
          </p>
        </div>

        {/* Filter Badges */}
        <div 
          className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/50 rounded-lg border border-border/40"
          role="group"
          aria-label="Filter questions by outcome"
        >
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring",
              filter === 'all'
                ? "bg-background text-foreground shadow-2xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={filter === 'all'}
          >
            All ({questions.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('correct')}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring flex items-center gap-1",
              filter === 'correct'
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-2xs border border-emerald-500/30"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={filter === 'correct'}
          >
            <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Correct ({correctCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('incorrect')}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring flex items-center gap-1",
              filter === 'incorrect'
                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 shadow-2xs border border-rose-500/30"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={filter === 'incorrect'}
          >
            <XCircle className="size-3 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            <span>Incorrect ({incorrectCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('unanswered')}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring flex items-center gap-1",
              filter === 'unanswered'
                ? "bg-slate-500/10 text-slate-700 dark:text-slate-300 shadow-2xs border border-slate-500/30"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={filter === 'unanswered'}
          >
            <MinusCircle className="size-3 text-muted-foreground" aria-hidden="true" />
            <span>Unanswered ({unansweredCount})</span>
          </button>
        </div>
      </div>

      {/* Questions List (Grouped by Section if sectional, Flat if not) */}
      <div className="space-y-6">
        {filteredQuestions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground rounded-lg border border-dashed border-border">
            No questions match the selected filter &quot;{filter}&quot;.
          </div>
        ) : hasSections ? (
          sectionGroups.map((group) => {
            if (group.questions.length === 0) return null;
            const accuracy = group.total > 0 ? Math.round((group.correct / group.total) * 100) : 0;
            return (
              <div key={group.name} className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-primary/20">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                      <Layers className="size-3.5" aria-hidden="true" />
                    </span>
                    <div>
                      <span className="text-sm font-bold text-foreground">
                        Section: {group.name}
                      </span>
                      <span className="text-2xs text-muted-foreground ml-2">
                        ({group.total} Questions)
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {group.correct}/{group.total} Correct ({accuracy}%)
                  </Badge>
                </div>

                <div className="space-y-4">
                  {group.questions.map((q) => (
                    <QuestionReviewCard key={q.questionId} q={q} />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          filteredQuestions.map((q) => (
            <QuestionReviewCard key={q.questionId} q={q} />
          ))
        )}
      </div>
    </section>
  );
}

function QuestionReviewCard({ q }: { q: QuestionReviewItem }) {
  const displayIndex = q.orderIndex + 1;
  const isSingleOrMulti = q.type === 'single-choice' || q.type === 'multiple-choice';

  return (
    <Card 
      className={cn(
        "border transition-all shadow-2xs",
        q.isCorrect 
          ? "border-emerald-500/30 bg-card hover:border-emerald-500/50" 
          : q.isAnswered 
            ? "border-rose-500/30 bg-card hover:border-rose-500/50" 
            : "border-border/80 bg-card hover:border-border"
      )}
    >
      <CardHeader className="pb-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
              Q{displayIndex}
            </span>
            {q.sectionName && (
              <Badge variant="outline" className="text-2xs font-semibold">
                {q.sectionName}
              </Badge>
            )}
            <Badge variant="secondary" className="text-2xs font-semibold">
              {q.subject}
            </Badge>
            {q.topic && (
              <span className="text-2xs text-muted-foreground">
                • {q.topic}
              </span>
            )}
          </div>

          {/* Status Pill */}
          {q.isCorrect ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-semibold gap-1">
              <Check className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Correct (+1 mark)</span>
            </Badge>
          ) : q.isAnswered ? (
            <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-xs font-semibold gap-1">
              <X className="size-3 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              <span>Incorrect (0 marks)</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground text-xs font-semibold gap-1">
              <MinusCircle className="size-3" aria-hidden="true" />
              <span>Unanswered (0 marks)</span>
            </Badge>
          )}
        </div>

        {/* Question Text */}
        <CardTitle className="text-base md:text-lg font-semibold text-foreground pt-1 leading-relaxed">
          {q.text}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Multiple Choice / Single Choice Options Render */}
        {isSingleOrMulti && Array.isArray(q.options) && (
          <div className="space-y-2">
            {q.options.map((opt, optIdx) => {
              const optLetter = String.fromCharCode(65 + optIdx);
              const isUserAnswer = Array.isArray(q.userAnswer)
                ? q.userAnswer.includes(opt.id)
                : q.userAnswer === opt.id;
              
              const isCorrectOption = Array.isArray(q.correctAnswer)
                ? q.correctAnswer.includes(opt.id)
                : q.correctAnswer === opt.id;

              let optionStyle = "border-border/60 bg-muted/10 text-foreground";
              let badgeIndicator = null;

              if (isCorrectOption && isUserAnswer) {
                optionStyle = "border-emerald-500/50 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 font-medium";
                badgeIndicator = (
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Check className="size-3" aria-hidden="true" /> Your Correct Answer
                  </span>
                );
              } else if (isCorrectOption && !isUserAnswer) {
                optionStyle = "border-emerald-500/40 bg-emerald-500/5 text-foreground";
                badgeIndicator = (
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                    <Check className="size-3" aria-hidden="true" /> Correct Answer
                  </span>
                );
              } else if (isUserAnswer && !isCorrectOption) {
                optionStyle = "border-rose-500/50 bg-rose-500/10 text-rose-950 dark:text-rose-100 font-medium";
                badgeIndicator = (
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <X className="size-3" aria-hidden="true" /> Your Answer (Incorrect)
                  </span>
                );
              }

              return (
                <div
                  key={opt.id}
                  className={cn(
                    "p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm transition-colors",
                    optionStyle
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="size-6 rounded-md bg-muted flex items-center justify-center text-xs font-bold font-mono shrink-0">
                      {optLetter}
                    </span>
                    <span className="text-sm leading-snug">{opt.text}</span>
                  </div>
                  {badgeIndicator && (
                    <div className="shrink-0 self-start sm:self-auto ml-8 sm:ml-0">
                      {badgeIndicator}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* True / False Render */}
        {q.type === 'true-false' && (
          <div className="grid grid-cols-2 gap-3">
            {['true', 'false'].map((val) => {
              const isUserAnswer = String(q.userAnswer).toLowerCase() === val;
              const isCorrectOption = String(q.correctAnswer).toLowerCase() === val;

              let borderBg = "border-border bg-muted/10";
              if (isCorrectOption && isUserAnswer) {
                borderBg = "border-emerald-500/50 bg-emerald-500/10 font-medium";
              } else if (isCorrectOption && !isUserAnswer) {
                borderBg = "border-emerald-500/40 bg-emerald-500/5";
              } else if (isUserAnswer && !isCorrectOption) {
                borderBg = "border-rose-500/50 bg-rose-500/10 font-medium";
              }

              return (
                <div 
                  key={val} 
                  className={cn("p-3 rounded-lg border text-center text-sm capitalize flex flex-col items-center justify-center gap-1", borderBg)}
                >
                  <span className="font-semibold">{val}</span>
                  {isCorrectOption && isUserAnswer && (
                    <span className="text-2xs text-emerald-600 dark:text-emerald-400 font-semibold">✓ Your Correct Choice</span>
                  )}
                  {isCorrectOption && !isUserAnswer && (
                    <span className="text-2xs text-emerald-600 dark:text-emerald-400 font-semibold">✓ Correct Answer</span>
                  )}
                  {isUserAnswer && !isCorrectOption && (
                    <span className="text-2xs text-rose-600 dark:text-rose-400 font-semibold">✗ Your Choice</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Short Answer / Fill in the Blank Render */}
        {(q.type === 'short-answer' || q.type === 'fill-blank') && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/60 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-semibold text-muted-foreground">Your Submitted Answer:</span>
              <span className={cn(
                "font-mono font-medium px-2 py-0.5 rounded text-xs",
                q.isCorrect ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
              )}>
                {q.userAnswer ? String(q.userAnswer) : '(No response provided)'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-2 border-t border-border/40">
              <span className="text-xs font-semibold text-muted-foreground">Official Accepted Answer(s):</span>
              <span className="font-mono text-xs text-foreground font-semibold">
                {[q.correctAnswer, ...(q.acceptableAnswers || [])].filter(Boolean).join(', ')}
              </span>
            </div>
          </div>
        )}

        {/* Explanation Box */}
        {q.explanation && (
          <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 space-y-1.5 text-xs text-foreground">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <Lightbulb className="size-3.5" aria-hidden="true" />
              <span>Explanation & Solution</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {q.explanation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
