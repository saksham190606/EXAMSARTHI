import React from 'react';
import { CandidateQuestion, ExamAnswers, isQuestionAnswered } from '@/types/question';
import { ExamSectionConfig } from '@/types/section';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flag, Check, Lock, CheckCircle2 } from 'lucide-react';

interface QuestionPaletteProps {
  questions: CandidateQuestion[];
  currentQuestionIndex: number;
  answers: ExamAnswers | Record<string, any>;
  flagged: Set<string>;
  goToQuestion: (index: number) => void;
  sections?: ExamSectionConfig[] | null;
  activeSectionIndex?: number;
  currentSectionIndices?: number[];
}

export function QuestionPalette({ 
  questions, 
  currentQuestionIndex, 
  answers, 
  flagged, 
  goToQuestion,
  sections,
  activeSectionIndex = 0,
  currentSectionIndices
}: QuestionPaletteProps) {
  const hasSections = Array.isArray(sections) && sections.length > 0;

  // Render non-sectional flat grid if no sections configured
  if (!hasSections || !sections) {
    return (
      <div className="space-y-4">
        {/* Question Number Palette Grid */}
        <div 
          className="grid grid-cols-5 gap-2"
          role="navigation"
          aria-label="Question palette"
        >
          {questions.map((q, index) => {
            const isCurrent = currentQuestionIndex === index;
            const isAnswered = isQuestionAnswered(q, answers[q.id]);
            const isFlagged = flagged.has(q.id);
            
            let stateDescription = "unanswered";
            if (isAnswered && isFlagged) stateDescription = "answered and flagged for review";
            else if (isAnswered) stateDescription = "answered";
            else if (isFlagged) stateDescription = "flagged for review, unanswered";

            if (isCurrent) {
              stateDescription = `current question, ${stateDescription}`;
            }

            let variant: "default" | "outline" | "secondary" = "outline";
            if (isCurrent) {
              variant = "default";
            } else if (isAnswered) {
              variant = "secondary";
            }

            return (
              <Button
                key={q.id}
                variant={variant}
                size="sm"
                onClick={() => goToQuestion(index)}
                aria-current={isCurrent ? "true" : undefined}
                aria-label={`Question ${index + 1}: ${stateDescription}`}
                className={`
                  relative h-11 w-full font-bold text-sm transition-all
                  ${isFlagged ? 'border-primary/60 border-2' : ''}
                  ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-background font-extrabold z-10' : ''}
                `}
              >
                <span>{index + 1}</span>

                {/* Flag indicator */}
                {isFlagged && (
                  <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xs">
                    <Flag className="size-2 fill-current" aria-hidden="true" />
                  </span>
                )}

                {/* Answered Check indicator */}
                {isAnswered && !isCurrent && (
                  <span className="absolute bottom-0.5 right-0.5 text-primary" aria-hidden="true">
                    <Check className="size-3" />
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Status Legend */}
        <PaletteLegend />
      </div>
    );
  }

  // Sectional Grid: Group questions by section
  return (
    <div className="space-y-5" role="navigation" aria-label="Sectional question palette">
      {sections.map((sec, secIdx) => {
        const isActive = secIdx === activeSectionIndex;
        const isCompleted = secIdx < activeSectionIndex;
        const isUpcoming = secIdx > activeSectionIndex;

        // Find questions belonging to this section
        const secQuestions = questions
          .map((q, idx) => ({ q, idx }))
          .filter(({ q }) => 
            q.section_name 
              ? (q.section_name.toLowerCase() === sec.name.toLowerCase() || q.section_name.toLowerCase() === sec.id.toLowerCase())
              : true // handled below if unassigned
          );

        // Fallback slice if no section_name assigned
        const effectiveSecQuestions = secQuestions.length > 0 
          ? secQuestions 
          : questions
              .map((q, idx) => ({ q, idx }))
              .slice(secIdx * (sec.question_count || 4), (secIdx + 1) * (sec.question_count || 4));

        const answeredInSection = effectiveSecQuestions.filter(({ q }) => isQuestionAnswered(q, answers[q.id])).length;

        return (
          <div 
            key={sec.id || secIdx} 
            className={`rounded-xl border p-3 transition-colors ${
              isActive 
                ? 'border-primary/50 bg-primary/5 shadow-2xs' 
                : isCompleted 
                  ? 'border-border/60 bg-muted/20 opacity-80' 
                  : 'border-border/40 bg-muted/10 opacity-60'
            }`}
          >
            {/* Section Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground">
                  {sec.name}
                </span>
                <span className="text-2xs text-muted-foreground">
                  ({sec.duration_minutes}m)
                </span>
              </div>

              {isActive ? (
                <Badge variant="outline" className="text-2xs font-semibold text-primary border-primary/40 bg-primary/10">
                  Active
                </Badge>
              ) : isCompleted ? (
                <Badge variant="outline" className="text-2xs font-medium text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  <span>Submitted</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="text-2xs font-medium text-muted-foreground flex items-center gap-1">
                  <Lock className="size-2.5" />
                  <span>Locked</span>
                </Badge>
              )}
            </div>

            {/* Questions Grid for this section */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
              {effectiveSecQuestions.map(({ q, idx }) => {
                const isCurrent = currentQuestionIndex === idx;
                const isAnswered = isQuestionAnswered(q, answers[q.id]);
                const isFlagged = flagged.has(q.id);
                const isClickable = isActive;

                let variant: "default" | "outline" | "secondary" = "outline";
                if (isCurrent) {
                  variant = "default";
                } else if (isAnswered) {
                  variant = "secondary";
                }

                return (
                  <Button
                    key={q.id}
                    variant={variant}
                    size="sm"
                    disabled={!isClickable}
                    onClick={() => isClickable && goToQuestion(idx)}
                    aria-current={isCurrent ? "true" : undefined}
                    aria-disabled={!isClickable}
                    aria-label={`Question ${idx + 1}: ${isCurrent ? 'current question' : ''} ${isAnswered ? 'answered' : 'unanswered'} ${!isClickable ? '(locked section)' : ''}`}
                    className={`
                      relative h-9 w-full font-bold text-xs transition-all
                      ${!isClickable ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}
                      ${isFlagged && isClickable ? 'border-primary/60 border-2' : ''}
                      ${isCurrent ? 'ring-2 ring-primary ring-offset-1 ring-offset-background font-extrabold z-10' : ''}
                    `}
                  >
                    <span>{idx + 1}</span>

                    {/* Flag indicator */}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 flex size-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xs">
                        <Flag className="size-1.5 fill-current" aria-hidden="true" />
                      </span>
                    )}

                    {/* Answered Check indicator */}
                    {isAnswered && !isCurrent && (
                      <span className="absolute bottom-0.5 right-0.5 text-primary" aria-hidden="true">
                        <Check className="size-2.5" />
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-2xs text-muted-foreground pt-2">
              <span>{answeredInSection}/{effectiveSecQuestions.length} answered</span>
              {!isActive && (
                <span className="italic flex items-center gap-1">
                  <Lock className="size-2.5" />
                  {isCompleted ? 'Section closed' : 'Unlocks next'}
                </span>
              )}
            </div>
          </div>
        );
      })}

      <PaletteLegend />
    </div>
  );
}

function PaletteLegend() {
  return (
    <div 
      className="pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-xs text-muted-foreground"
      aria-label="Palette status legend"
    >
      <div className="flex items-center gap-2">
        <span className="size-3.5 rounded bg-primary ring-2 ring-primary/40" aria-hidden="true" />
        <span className="font-medium">Current</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="size-3.5 rounded bg-secondary border border-border flex items-center justify-center" aria-hidden="true">
          <Check className="size-2.5 text-primary" />
        </span>
        <span className="font-medium">Answered</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="size-3.5 rounded border-2 border-primary/60 flex items-center justify-center" aria-hidden="true">
          <Flag className="size-2 text-primary fill-primary" />
        </span>
        <span className="font-medium">Flagged</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="size-3.5 rounded border border-border bg-background" aria-hidden="true" />
        <span className="font-medium">Unanswered</span>
      </div>
    </div>
  );
}
