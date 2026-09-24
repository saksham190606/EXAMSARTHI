"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Sparkles, AlertCircle } from 'lucide-react';
import { Question } from '@/lib/examData'; // Wait, Exam is from mockData, Question is from examData
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { QuestionDisplay } from '@/components/exam/QuestionDisplay';
import { useTranslation } from '@/lib/i18n';
import { generateHintAction } from '@/app/actions/aiActions';

interface PracticeClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  practiceSet: any;
  questions: Question[];
}

export function PracticeClient({ practiceSet, questions }: PracticeClientProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>();
  const [hasChecked, setHasChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  const [isGeneratingHint, setIsGeneratingHint] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);

  const [score, setScore] = useState(0);

  const currentQuestion = questions[currentIndex];

  const handleSelectOption = (qId: string, optId: string) => {
    if (!hasChecked) {
      setSelectedOptionId(optId);
    }
  };

  const handleCheckAnswer = () => {
    if (!selectedOptionId) return;

    const correct = selectedOptionId === currentQuestion.correctAnswerId;
    setIsCorrect(correct);
    setHasChecked(true);

    if (correct) {
      setScore((s) => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOptionId(undefined);
      setHasChecked(false);
      setAiHint(null);
    } else {
      // Practice complete
      router.push('/dashboard');
    }
  };

  const handleGenerateHint = async () => {
    if (isGeneratingHint || aiHint) return;
    setIsGeneratingHint(true);
    try {
      const optionsStr = currentQuestion.options.map(o => o.text);
      const wrongOpt = currentQuestion.options.find(o => o.id === selectedOptionId)?.text || '';
      const res = await generateHintAction(currentQuestion.text, optionsStr, [wrongOpt]);
      
      if (res.success) {
        setAiHint(res.data || "No hint could be generated.");
      } else {
        setAiHint("Could not generate a hint at this time.");
      }
    } catch (e) {
      setAiHint("An error occurred while generating hint.");
    } finally {
      setIsGeneratingHint(false);
    }
  };

  const progressPercentage = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans">
      <header className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 h-16 bg-card border-b border-border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/practice')} aria-label="Back to practice">
            <ChevronLeft className="size-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg sm:text-xl line-clamp-1">{practiceSet.title}</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">{practiceSet.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <span className="text-muted-foreground">Score: {score}/{currentIndex + (hasChecked ? 1 : 0)}</span>
          <div className="w-24 sm:w-32">
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/10 relative pb-32">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border border-border/60 shadow-xs">
            <CardContent className="p-6">
              <QuestionDisplay
                question={currentQuestion}
                currentIndex={currentIndex}
                totalQuestions={questions.length}
                selectedOptionId={selectedOptionId}
                onSelectOption={handleSelectOption}
              />
            </CardContent>
          </Card>

          {/* Feedback Area */}
          {hasChecked && (
            <div className={`p-4 rounded-xl border ${isCorrect ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'}`}>
              <div className="flex items-start gap-3">
                {isCorrect ? <CheckCircle2 className="size-5 mt-0.5" /> : <XCircle className="size-5 mt-0.5" />}
                <div className="space-y-2 flex-1">
                  <h3 className="font-bold">{isCorrect ? 'Correct!' : 'Incorrect'}</h3>
                  <p className="text-sm leading-relaxed opacity-90">{currentQuestion.explanation}</p>
                  
                  {!isCorrect && (
                    <div className="pt-4 border-t border-red-500/10 mt-4">
                      {aiHint ? (
                        <div className="bg-background/50 rounded-lg p-4 space-y-2 text-foreground">
                          <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase">
                            <Sparkles className="size-4" />
                            <span>AI Socratic Hint</span>
                          </div>
                          <p className="text-sm">{aiHint}</p>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleGenerateHint} 
                          disabled={isGeneratingHint}
                          className="bg-background text-foreground"
                        >
                          <Sparkles className="size-4 mr-2" />
                          {isGeneratingHint ? 'Generating Hint...' : 'Ask AI for a Hint'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 sm:p-5 flex items-center justify-between z-10">
        <Button variant="ghost" onClick={() => router.push('/practice')}>
          Exit Practice
        </Button>
        
        {!hasChecked ? (
          <Button 
            size="lg" 
            onClick={handleCheckAnswer} 
            disabled={!selectedOptionId}
            className="shadow-xs font-semibold px-8"
          >
            Check Answer
          </Button>
        ) : (
          <Button 
            size="lg" 
            onClick={handleNextQuestion} 
            className="shadow-xs font-semibold px-8 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Practice'}
            <ChevronRight className="size-5 ml-2" />
          </Button>
        )}
      </footer>
    </div>
  );
}
