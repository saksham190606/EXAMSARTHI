"use client"

import React from 'react'
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Exam } from "@/lib/mock-exam"
import Link from 'next/link'

interface ExamResultsProps {
  exam: Exam;
  answers: Record<string, string>;
  onRetry: () => void;
}

export function ExamResults({ exam, answers, onRetry }: ExamResultsProps) {
  let score = 0;
  exam.questions.forEach((q) => {
    if (answers[q.id] === q.correctOptionId) {
      score++;
    }
  });

  const percentage = Math.round((score / exam.questions.length) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-8" aria-live="polite">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold" tabIndex={-1} id="results-heading">Exam Results</h2>
        <p className="text-xl text-muted-foreground">
          You scored <span className="font-bold text-foreground">{score}</span> out of <span className="font-bold text-foreground">{exam.questions.length}</span> ({percentage}%)
        </p>
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl font-semibold border-b pb-2">Detailed Review</h3>
        <ol className="space-y-6 list-none p-0 m-0">
          {exam.questions.map((q, index) => {
            const userAnswerId = answers[q.id];
            const isCorrect = userAnswerId === q.correctOptionId;
            const userAnswer = q.options.find(o => o.id === userAnswerId);
            const correctAnswer = q.options.find(o => o.id === q.correctOptionId);

            return (
              <li key={q.id}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg leading-relaxed flex items-start gap-3">
                      <span aria-hidden="true" className="text-muted-foreground text-base mt-1">
                        {index + 1}.
                      </span>
                      <span>
                        <span className="sr-only">Question {index + 1}: </span>
                        {q.text}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border border-border">
                        <div className="flex-shrink-0 mt-0.5">
                          {isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" aria-hidden="true" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold block mb-1">
                            Your Answer: 
                            <span className="sr-only">{isCorrect ? " (Correct)" : " (Incorrect)"}</span>
                          </span>
                          <span className={isCorrect ? "text-foreground" : "text-destructive"}>
                            {userAnswer ? userAnswer.text : "Not answered"}
                          </span>
                        </div>
                      </div>

                      {!isCorrect && (
                        <div className="flex items-start gap-2 p-3 rounded-md border border-green-600/30 bg-green-50 dark:bg-green-950/20">
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                          <div>
                            <span className="font-semibold block mb-1 text-green-900 dark:text-green-300">Correct Answer:</span>
                            <span className="text-green-800 dark:text-green-400">
                              {correctAnswer?.text}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-border/50">
                      <span className="font-semibold block mb-1">Explanation:</span>
                      <p className="text-muted-foreground">{q.explanation}</p>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
        <Button onClick={onRetry} variant="outline" size="lg" className="w-full sm:w-auto">
          Retry Exam
        </Button>
        <Link href="/dashboard" className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}>
          Return to Dashboard <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
