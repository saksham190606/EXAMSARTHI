"use client"

import React, { useState } from 'react'
import { ArrowRight, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { mockExam } from "@/lib/mock-exam"
import { ExamSession } from "@/components/exam/ExamSession"
import { ExamResults } from "@/components/exam/ExamResults"

type FlowState = 'start' | 'session' | 'results'

export default function PracticePage() {
  const [flowState, setFlowState] = useState<FlowState>('start');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleStart = () => {
    setFlowState('session');
    setAnswers({});
  };

  const handleComplete = (submittedAnswers: Record<string, string>) => {
    setAnswers(submittedAnswers);
    setFlowState('results');
  };

  const handleRetry = () => {
    setFlowState('start');
    setAnswers({});
  };

  return (
    <main id="main-content" className="flex-1 container mx-auto px-4 py-8 md:py-12 lg:py-16">
      
      {flowState === 'start' && (
        <div className="max-w-2xl mx-auto text-center space-y-8 mt-8 md:mt-16">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-8">
            <BookOpen className="w-8 h-8" aria-hidden="true" />
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight">{mockExam.title}</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            {mockExam.description}
          </p>
          
          <div className="bg-card border rounded-xl p-6 text-left space-y-4 max-w-lg mx-auto">
            <h2 className="font-semibold text-lg border-b pb-2">Exam Information</h2>
            <ul className="space-y-3">
              <li className="flex justify-between">
                <span className="text-muted-foreground">Total Questions:</span>
                <span className="font-medium">{mockExam.questions.length}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Time Limit:</span>
                <span className="font-medium">Untimed</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Format:</span>
                <span className="font-medium">Multiple Choice</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <Button size="lg" onClick={handleStart} className="w-full sm:w-auto text-lg h-14 px-8 min-h-11">
              Start Practice Exam <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {flowState === 'session' && (
        <ExamSession exam={mockExam} onComplete={handleComplete} />
      )}

      {flowState === 'results' && (
        <ExamResults exam={mockExam} answers={answers} onRetry={handleRetry} />
      )}

    </main>
  );
}
