"use client"

import React, { useState, useRef, useEffect } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle, Play, Square, Volume2, Mic, MicOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import type { Exam } from "@/lib/mock-exam"
import { useSpeech } from '@/hooks/useSpeech'
import { useVoiceCommands } from '@/hooks/useVoiceCommands'
import { useAccessibilityStore } from '@/store/useAccessibilityStore'

interface ExamSessionProps {
  exam: Exam;
  onComplete: (answers: Record<string, string>) => void;
}

export function ExamSession({ exam, onComplete }: ExamSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  
  const questionTitleRef = useRef<HTMLHeadingElement>(null);

  const { speak, stop, status, isSupported } = useSpeech();
  const { audioAssistance, autoReadQuestions } = useAccessibilityStore();
  
  const currentQuestion = exam.questions[currentIndex];
  const totalQuestions = exam.questions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  // Manage focus when switching questions so screen readers announce the new context
  useEffect(() => {
    if (questionTitleRef.current) {
      questionTitleRef.current.focus();
    }

    if (audioAssistance && autoReadQuestions) {
      // Small timeout to allow DOM update before speaking
      setTimeout(() => {
        speak(`Question ${currentIndex + 1}: ${exam.questions[currentIndex].text}`, 'Reading question');
      }, 300);
    }
  }, [currentIndex, audioAssistance, autoReadQuestions, speak, exam.questions]);

  const handleOptionChange = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };

  const handleNext = () => {
    stop();
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    stop();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    stop();
    setIsSubmitDialogOpen(false);
    onComplete(answers);
  };

  const voiceCommands = useVoiceCommands({
    isSubmitDialogOpen,
    onSelectOptionIndex: (index) => {
      const opt = currentQuestion?.options[index];
      if (opt) handleOptionChange(opt.id);
    },
    onNext: handleNext,
    onPrev: handlePrev,
    onGoToQuestion: (index) => {
      if (index >= 0 && index < totalQuestions) {
        stop();
        setCurrentIndex(index);
      }
    },
    onReadQuestion: () => speak(`Question ${currentIndex + 1}: ${currentQuestion.text}`, 'Reading question'),
    onReadOptions: () => {
      const optionsText = currentQuestion.options.map((opt, i) => `Option ${i + 1}: ${opt.text}`).join('. ');
      speak(`Options: ${optionsText}`, 'Reading options');
    },
    onStopSpeaking: stop,
    onSubmitExam: () => setIsSubmitDialogOpen(true),
    onConfirmSubmit: handleSubmit,
    onCancelSubmit: () => setIsSubmitDialogOpen(false),
    onFeedback: (msg) => {
      speak(msg, 'Voice feedback');
    }
  });

  const unansweredCount = totalQuestions - Object.keys(answers).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Hidden live region for progress announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Question {currentIndex + 1} of {totalQuestions}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium text-muted-foreground" aria-hidden="true">
          <span>Question {currentIndex + 1} of {totalQuestions}</span>
          <span>{Math.round(progress)}% Completed</span>
        </div>
        <Progress value={progress} className="h-3" aria-label={`Exam progress: ${Math.round(progress)} percent`} />
      </div>

      <Card className="mt-8 border-2">
        <CardHeader className="pb-4">
          <h2 
            ref={questionTitleRef}
            tabIndex={-1} 
            className="text-2xl font-bold outline-none ring-offset-background focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            <span className="sr-only">Question {currentIndex + 1}: </span>
            {currentQuestion.text}
          </h2>

          {/* Voice Controls */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {!isSupported && (
              <div className="w-full text-sm text-destructive mt-1" role="alert">
                Text-to-speech is not supported in this browser.
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => speak(`Question ${currentIndex + 1}: ${currentQuestion.text}`, 'Reading question')}
              className={status === 'Reading question' ? 'bg-primary/10 border-primary font-bold ring-1 ring-primary' : ''}
              disabled={!isSupported}
            >
              <Play className="mr-2 h-4 w-4" aria-hidden="true" />
              {status === 'Reading question' ? 'Reading...' : 'Read Question'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const optionsText = currentQuestion.options.map((opt, i) => `Option ${i + 1}: ${opt.text}`).join('. ');
                speak(`Options: ${optionsText}`, 'Reading options');
              }}
              className={status === 'Reading options' ? 'bg-primary/10 border-primary font-bold ring-1 ring-primary' : ''}
              disabled={!isSupported}
            >
              <Volume2 className="mr-2 h-4 w-4" aria-hidden="true" />
              {status === 'Reading options' ? 'Reading...' : 'Read Options'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={stop}
              disabled={status === 'Speech stopped' || !isSupported}
            >
              <Square className="mr-2 h-4 w-4" aria-hidden="true" />
              Stop
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={voiceCommands.isListening ? voiceCommands.stopListening : voiceCommands.startListening}
              className={voiceCommands.isListening ? 'bg-primary/10 border-primary' : ''}
              disabled={!voiceCommands.isSupported}
            >
              {voiceCommands.isListening ? (
                <Mic className="mr-2 h-4 w-4 animate-pulse text-primary" aria-hidden="true" />
              ) : (
                <MicOff className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {voiceCommands.isListening ? 'Listening...' : 'Voice Command'}
            </Button>

            <div className="sr-only" aria-live="polite">
              {status}
            </div>

            <div className="w-full text-sm font-medium text-muted-foreground mt-2" aria-live="polite">
              {voiceCommands.statusText}
            </div>

            {!voiceCommands.isSupported && (
              <div className="w-full text-sm text-destructive mt-1" role="alert">
                Voice commands are not supported in this browser.
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Fieldset grouping handles semantic relationships for screen readers */}
          <fieldset>
            <legend className="sr-only">Answer options for: {currentQuestion.text}</legend>
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={handleOptionChange}
              className="space-y-3 mt-4"
            >
              {currentQuestion.options.map((option) => {
                const optionId = `q${currentIndex}-o${option.id}`;
                return (
                  <div key={option.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 focus-within:ring-3 focus-within:ring-ring focus-within:ring-offset-2 transition-colors">
                    <RadioGroupItem value={option.id} id={optionId} className="sr-only" />
                    {/* The label expands to fill the container for a large touch target */}
                    <Label 
                      htmlFor={optionId} 
                      className="flex-1 cursor-pointer text-base leading-relaxed font-normal flex items-center before:content-[''] before:inline-block before:w-5 before:h-5 before:mr-3 before:border-2 before:border-primary before:rounded-full [&:has(:checked)]:before:bg-primary [&:has(:checked)]:before:border-primary peer-data-[state=checked]:font-medium"
                    >
                      {/* Fake radio circle is handled by the before pseudo element above. 
                          For accessibility, the actual RadioGroupItem handles standard semantics. */}
                      {option.text}
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
          </fieldset>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between pt-6 border-t gap-4">
          <Button 
            variant="outline" 
            onClick={handlePrev} 
            disabled={currentIndex === 0}
            className="w-full sm:w-auto min-h-11 md:min-h-11"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Previous
          </Button>
          
          {currentIndex < totalQuestions - 1 ? (
            <Button 
              onClick={handleNext}
              className="w-full sm:w-auto min-h-11 md:min-h-11"
            >
              Next <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
              <DialogTrigger render={<Button className="w-full sm:w-auto min-h-11 md:min-h-11 bg-green-600 hover:bg-green-700 text-white focus-visible:ring-green-600" />}>
                <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" /> Review & Submit
              </DialogTrigger>
              <DialogContent role="alertdialog">
                <DialogHeader>
                  <DialogTitle>Submit Examination?</DialogTitle>
                  <DialogDescription>
                    {unansweredCount > 0 ? (
                      <span className="text-destructive font-semibold block mt-2">
                        Warning: You have {unansweredCount} unanswered {unansweredCount === 1 ? 'question' : 'questions'}.
                      </span>
                    ) : (
                      <span className="block mt-2">
                        You have answered all questions.
                      </span>
                    )}
                    Are you sure you want to submit your test? You cannot change your answers after submission.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0 mt-6">
                  <DialogClose render={<Button variant="outline" className="min-h-11" />}>
                    Return to Exam
                  </DialogClose>
                  <Button onClick={handleSubmit} className="min-h-11 bg-green-600 hover:bg-green-700 text-white focus-visible:ring-green-600">
                    Confirm Submission
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
