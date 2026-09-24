import React from 'react';
import { notFound } from 'next/navigation';
import { PracticeSets } from '@/lib/mockData';
import { MockExamQuestions } from '@/lib/examData';
import { PracticeClient } from './PracticeClient';

interface PageProps {
  params: Promise<{
    practiceId: string;
  }>;
}

export default async function PracticeSessionPage({ params }: PageProps) {
  const resolvedParams = await params;
  const practiceSet = PracticeSets.find((p) => p.id === resolvedParams.practiceId);

  if (!practiceSet) {
    notFound();
  }

  // For mock purposes, just filter MockExamQuestions by subject
  // If no subject match, just use all questions
  let practiceQuestions = MockExamQuestions.filter(
    (q) => q.subject === practiceSet.subject
  );

  if (practiceQuestions.length === 0) {
    practiceQuestions = MockExamQuestions;
  }

  return (
    <PracticeClient
      practiceSet={practiceSet}
      questions={practiceQuestions}
    />
  );
}
