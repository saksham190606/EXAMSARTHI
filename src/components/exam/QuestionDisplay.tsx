import React from 'react';
import { 
  CandidateQuestion, 
  UserAnswer, 
  getQuestionType 
} from '@/types/question';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, HelpCircle } from "lucide-react";

interface QuestionDisplayProps {
  question: CandidateQuestion;
  currentIndex: number;
  totalQuestions: number;
  selectedOptionId?: string; // backwards compatibility
  userAnswer?: UserAnswer;
  onSelectOption: (questionId: string, optionId: string) => void;
  onToggleOption?: (questionId: string, optionId: string) => void;
  onSetAnswer?: (questionId: string, answer: UserAnswer) => void;
}

export function QuestionDisplay({ 
  question, 
  currentIndex, 
  totalQuestions, 
  selectedOptionId, 
  userAnswer,
  onSelectOption,
  onToggleOption,
  onSetAnswer
}: QuestionDisplayProps) {
  const qType = getQuestionType(question);

  // Question Type Label Map
  const typeLabelMap: Record<string, string> = {
    'single-choice': 'Single Choice',
    'multiple-choice': 'Multiple Choice',
    'true-false': 'True / False',
    'short-answer': 'Short Answer',
    'fill-blank': 'Fill in the Blank'
  };

  const typeLabel = typeLabelMap[qType] || 'Single Choice';

  // Resolved answer value
  const effectiveAnswer = userAnswer !== undefined ? userAnswer : selectedOptionId;

  return (
    <div className="space-y-6">
      {/* Question Context Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-wider uppercase text-primary bg-primary/10 px-3 py-1 rounded-md border border-primary/20">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <Badge 
            variant="secondary" 
            className="text-xs font-semibold px-2.5 py-1 tracking-wide"
            aria-label={`Question format: ${typeLabel}`}
          >
            {typeLabel}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs font-medium">
            {question.subject}
          </Badge>
          {question.topic && (
            <Badge variant="outline" className="text-xs font-medium">
              {question.topic}
            </Badge>
          )}
          {question.difficulty && (
            <Badge variant="outline" className="text-xs font-medium">
              {question.difficulty}
            </Badge>
          )}
        </div>
      </div>

      {/* Render based on Question Type */}

      {/* 1. SINGLE CHOICE QUESTION */}
      {qType === 'single-choice' && (() => {
        const scq = question;
        const currentSelected = typeof effectiveAnswer === 'string' ? effectiveAnswer : "";
        const options = scq.options || [];

        return (
          <fieldset className="space-y-6 border-none p-0 m-0">
            <legend className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-relaxed mb-6 block">
              {scq.text}
            </legend>
            
            <RadioGroup 
              value={currentSelected} 
              onValueChange={(val) => {
                if (onSetAnswer) onSetAnswer(scq.id, val);
                onSelectOption(scq.id, val);
              }}
              className="space-y-3.5"
              aria-label={`Answer options for Question ${currentIndex + 1}`}
            >
              {options.map((option, idx) => {
                const letter = String.fromCharCode(65 + idx); // A, B, C, D
                const isSelected = currentSelected === option.id;

                return (
                  <div 
                    key={option.id} 
                    className={`
                      relative flex items-center p-4 sm:p-5 rounded-xl border transition-all cursor-pointer
                      focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background
                      ${isSelected 
                        ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30' 
                        : 'bg-card border-border hover:bg-muted/40 hover:border-primary/40'
                      }
                    `}
                  >
                    <RadioGroupItem 
                      value={option.id} 
                      id={`opt-${option.id}`} 
                      className="sr-only" 
                    />
                    
                    <Label 
                      htmlFor={`opt-${option.id}`}
                      className="flex flex-1 items-center gap-4 cursor-pointer text-base sm:text-lg font-medium leading-relaxed"
                    >
                      {/* Distinct Letter Badge (A, B, C, D) */}
                      <span 
                        className={`
                          flex shrink-0 items-center justify-center size-9 rounded-lg font-bold text-sm transition-colors border
                          ${isSelected 
                            ? 'bg-primary text-primary-foreground border-primary shadow-2xs' 
                            : 'bg-muted/60 text-muted-foreground border-border'
                          }
                        `}
                        aria-hidden="true"
                      >
                        {letter}
                      </span>

                      {/* Option Text */}
                      <span className="flex-1 text-foreground">
                        {option.text}
                      </span>

                      {/* Selected Indicator Checkmark */}
                      {isSelected && (
                        <span 
                          className="size-6 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20 ml-2"
                          aria-hidden="true"
                        >
                          <Check className="size-3.5" />
                        </span>
                      )}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </fieldset>
        );
      })()}

      {/* 2. MULTIPLE CHOICE QUESTION (Select all that apply) */}
      {qType === 'multiple-choice' && (() => {
        const mcq = question;
        const options = mcq.options || [];
        const selectedList: string[] = Array.isArray(effectiveAnswer) 
          ? effectiveAnswer 
          : typeof effectiveAnswer === 'string' && effectiveAnswer 
            ? [effectiveAnswer] 
            : [];

        return (
          <fieldset 
            className="space-y-6 border-none p-0 m-0"
            aria-describedby={`mcq-instructions-${mcq.id}`}
          >
            <div>
              <legend className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-relaxed mb-2 block">
                {mcq.text}
              </legend>
              <div 
                id={`mcq-instructions-${mcq.id}`}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 w-fit mb-6"
                role="note"
              >
                <HelpCircle className="size-4 shrink-0" aria-hidden="true" />
                <span>Select all that apply. Multiple answers may be correct.</span>
              </div>
            </div>

            <div className="space-y-3.5" role="group" aria-label={`Multiple choice options for Question ${currentIndex + 1}`}>
              {options.map((option, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const isSelected = selectedList.includes(option.id);

                return (
                  <div 
                    key={option.id}
                    className={`
                      relative flex items-center p-4 sm:p-5 rounded-xl border transition-all cursor-pointer
                      focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background
                      ${isSelected 
                        ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30' 
                        : 'bg-card border-border hover:bg-muted/40 hover:border-primary/40'
                      }
                    `}
                  >
                    <input 
                      type="checkbox"
                      id={`mc-opt-${option.id}`}
                      checked={isSelected}
                      onChange={() => {
                        if (onToggleOption) {
                          onToggleOption(mcq.id, option.id);
                        } else if (onSetAnswer) {
                          const updated = isSelected 
                            ? selectedList.filter(id => id !== option.id)
                            : [...selectedList, option.id];
                          onSetAnswer(mcq.id, updated);
                        }
                      }}
                      className="sr-only"
                      aria-label={`Option ${letter}: ${option.text}`}
                    />

                    <Label 
                      htmlFor={`mc-opt-${option.id}`}
                      className="flex flex-1 items-center gap-4 cursor-pointer text-base sm:text-lg font-medium leading-relaxed"
                    >
                      {/* Checkbox Box with Letter */}
                      <span 
                        className={`
                          flex shrink-0 items-center justify-center size-9 rounded-lg font-bold text-sm transition-colors border
                          ${isSelected 
                            ? 'bg-primary text-primary-foreground border-primary shadow-2xs' 
                            : 'bg-muted/60 text-muted-foreground border-border'
                          }
                        `}
                        aria-hidden="true"
                      >
                        {letter}
                      </span>

                      {/* Option Text */}
                      <span className="flex-1 text-foreground">
                        {option.text}
                      </span>

                      {/* Selected Indicator Square Checkmark */}
                      <div 
                        className={`
                          size-6 shrink-0 rounded-md border flex items-center justify-center transition-colors ml-2
                          ${isSelected 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'border-muted-foreground/30 bg-card'
                          }
                        `}
                        aria-hidden="true"
                      >
                        {isSelected && <Check className="size-4" />}
                      </div>
                    </Label>
                  </div>
                );
              })}
            </div>
          </fieldset>
        );
      })()}

      {/* 3. TRUE / FALSE QUESTION */}
      {qType === 'true-false' && (() => {
        let currentChoice: string | undefined = undefined;
        if (typeof effectiveAnswer === 'boolean') {
          currentChoice = effectiveAnswer ? 'true' : 'false';
        } else if (typeof effectiveAnswer === 'string') {
          const l = effectiveAnswer.toLowerCase().trim();
          if (l === 'true' || l === 'false') currentChoice = l;
        }

        const handleSelect = (val: string) => {
          const boolVal = val === 'true';
          if (onSetAnswer) onSetAnswer(question.id, boolVal);
          onSelectOption(question.id, val);
        };

        return (
          <fieldset className="space-y-6 border-none p-0 m-0">
            <legend className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-relaxed mb-6 block">
              {question.text}
            </legend>

            <RadioGroup 
              value={currentChoice ?? ""} 
              onValueChange={handleSelect}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              aria-label={`True or False choice for Question ${currentIndex + 1}`}
            >
              {/* True Option */}
              <div 
                className={`
                  relative flex items-center p-5 rounded-xl border transition-all cursor-pointer
                  focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background
                  ${currentChoice === 'true' 
                    ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30' 
                    : 'bg-card border-border hover:bg-muted/40 hover:border-primary/40'
                  }
                `}
              >
                <RadioGroupItem 
                  value="true" 
                  id={`tf-${question.id}-true`} 
                  className="sr-only" 
                />
                <Label 
                  htmlFor={`tf-${question.id}-true`}
                  className="flex flex-1 items-center justify-between gap-4 cursor-pointer text-base sm:text-lg font-bold"
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className={`
                        flex shrink-0 items-center justify-center size-9 rounded-lg font-bold text-sm transition-colors border
                        ${currentChoice === 'true' 
                          ? 'bg-primary text-primary-foreground border-primary shadow-2xs' 
                          : 'bg-muted/60 text-muted-foreground border-border'
                        }
                      `}
                      aria-hidden="true"
                    >
                      T
                    </span>
                    <span>True</span>
                  </div>
                  {currentChoice === 'true' && (
                    <span 
                      className="size-6 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20"
                      aria-hidden="true"
                    >
                      <Check className="size-3.5" />
                    </span>
                  )}
                </Label>
              </div>

              {/* False Option */}
              <div 
                className={`
                  relative flex items-center p-5 rounded-xl border transition-all cursor-pointer
                  focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background
                  ${currentChoice === 'false' 
                    ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30' 
                    : 'bg-card border-border hover:bg-muted/40 hover:border-primary/40'
                  }
                `}
              >
                <RadioGroupItem 
                  value="false" 
                  id={`tf-${question.id}-false`} 
                  className="sr-only" 
                />
                <Label 
                  htmlFor={`tf-${question.id}-false`}
                  className="flex flex-1 items-center justify-between gap-4 cursor-pointer text-base sm:text-lg font-bold"
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className={`
                        flex shrink-0 items-center justify-center size-9 rounded-lg font-bold text-sm transition-colors border
                        ${currentChoice === 'false' 
                          ? 'bg-primary text-primary-foreground border-primary shadow-2xs' 
                          : 'bg-muted/60 text-muted-foreground border-border'
                        }
                      `}
                      aria-hidden="true"
                    >
                      F
                    </span>
                    <span>False</span>
                  </div>
                  {currentChoice === 'false' && (
                    <span 
                      className="size-6 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20"
                      aria-hidden="true"
                    >
                      <Check className="size-3.5" />
                    </span>
                  )}
                </Label>
              </div>
            </RadioGroup>
          </fieldset>
        );
      })()}

      {/* 4. SHORT ANSWER QUESTION */}
      {qType === 'short-answer' && (() => {
        const textVal = typeof effectiveAnswer === 'string' ? effectiveAnswer : '';

        return (
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-relaxed">
              {question.text}
            </h2>

            <div className="space-y-3 max-w-2xl bg-card p-6 rounded-2xl border border-border">
              <Label 
                htmlFor={`short-answer-${question.id}`}
                className="text-base font-semibold text-foreground block"
              >
                Candidate Response / Short Answer
              </Label>
              
              <Input 
                id={`short-answer-${question.id}`}
                type="text"
                value={textVal}
                onChange={(e) => {
                  if (onSetAnswer) onSetAnswer(question.id, e.target.value);
                  onSelectOption(question.id, e.target.value);
                }}
                placeholder="Type your answer here..."
                aria-describedby={`short-answer-desc-${question.id}`}
                className="h-13 text-base sm:text-lg px-4 bg-background border-border focus-visible:ring-2 focus-visible:ring-primary"
                autoComplete="off"
                spellCheck="false"
              />

              <p 
                id={`short-answer-desc-${question.id}`}
                className="text-xs text-muted-foreground leading-relaxed"
              >
                Enter your concise answer above. Capitalization and extra spaces will not affect evaluation.
              </p>
            </div>
          </div>
        );
      })()}

      {/* 5. FILL IN THE BLANK QUESTION */}
      {qType === 'fill-blank' && (() => {
        const textVal = typeof effectiveAnswer === 'string' ? effectiveAnswer : '';

        return (
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-relaxed">
              {question.text}
            </h2>

            <div className="space-y-3 max-w-2xl bg-card p-6 rounded-2xl border border-border">
              <Label 
                htmlFor={`fill-blank-${question.id}`}
                className="text-base font-semibold text-foreground block"
              >
                Missing Word or Phrase
              </Label>
              
              <Input 
                id={`fill-blank-${question.id}`}
                type="text"
                value={textVal}
                onChange={(e) => {
                  if (onSetAnswer) onSetAnswer(question.id, e.target.value);
                  onSelectOption(question.id, e.target.value);
                }}
                placeholder="Enter missing text..."
                aria-describedby={`fill-blank-desc-${question.id}`}
                className="h-13 text-base sm:text-lg px-4 bg-background border-border focus-visible:ring-2 focus-visible:ring-primary"
                autoComplete="off"
                spellCheck="false"
              />

              <p 
                id={`fill-blank-desc-${question.id}`}
                className="text-xs text-muted-foreground leading-relaxed"
              >
                Enter the exact missing word or phrase to complete the statement. Letter case is not sensitive.
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
