import React from 'react';
import { Question } from '@/lib/examData';
import { Button } from '@/components/ui/button';
import { Flag, Check } from 'lucide-react';

interface QuestionPaletteProps {
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  flagged: Set<string>;
  goToQuestion: (index: number) => void;
}

export function QuestionPalette({ 
  questions, 
  currentQuestionIndex, 
  answers, 
  flagged, 
  goToQuestion 
}: QuestionPaletteProps) {
  
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
          const isAnswered = !!answers[q.id];
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

              {/* Multi-modal Flag indicator */}
              {isFlagged && (
                <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xs">
                  <Flag className="size-2 fill-current" aria-hidden="true" />
                </span>
              )}

              {/* Multi-modal Answered Check indicator */}
              {isAnswered && !isCurrent && (
                <span className="absolute bottom-0.5 right-0.5 text-primary" aria-hidden="true">
                  <Check className="size-3" />
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Multi-modal Status Legend */}
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
    </div>
  );
}
