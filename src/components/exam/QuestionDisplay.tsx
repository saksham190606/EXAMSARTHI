import React from 'react';
import { Question } from '@/lib/examData';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { DictationButton } from "./DictationButton";

interface QuestionDisplayProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  selectedOptionId?: string;
  onSelectOption: (questionId: string, optionId: string) => void;
}

export function QuestionDisplay({ 
  question, 
  currentIndex, 
  totalQuestions, 
  selectedOptionId, 
  onSelectOption 
}: QuestionDisplayProps) {
  
  return (
    <div className="space-y-6">
      {/* Question Context Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-wider uppercase text-primary bg-primary/10 px-3 py-1 rounded-md border border-primary/20">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
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

      {/* Question Form & Semantic Radio Group */}
      <fieldset className="space-y-6 border-none p-0 m-0">
        <legend className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-relaxed mb-6 block">
          {question.text}
        </legend>
        
        {question.options && question.options.length > 0 ? (
          <RadioGroup 
            value={selectedOptionId} 
            onValueChange={(val) => onSelectOption(question.id, val)}
            className="space-y-3.5"
            aria-label={`Answer options for Question ${currentIndex + 1}`}
          >
            {question.options.map((option, idx) => {
              const letter = String.fromCharCode(65 + idx); // A, B, C, D
              const isSelected = selectedOptionId === option.id;

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
                    aria-label={`Option ${letter}: ${option.text}`}
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
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
               <Label htmlFor={`subj-opt-${question.id}`} className="text-sm font-medium">Your Answer:</Label>
               <DictationButton onTranscript={(text) => onSelectOption(question.id, (selectedOptionId || "") + text)} />
            </div>
            <textarea 
              id={`subj-opt-${question.id}`}
              className="w-full min-h-[150px] p-4 rounded-xl border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Type or dictate your answer here..."
              value={selectedOptionId || ""}
              onChange={(e) => onSelectOption(question.id, e.target.value)}
              aria-label={`Subjective answer for Question ${currentIndex + 1}`}
            />
          </div>
        )}
      </fieldset>
    </div>
  );
}
