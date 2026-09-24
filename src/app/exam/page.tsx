import { startOrResumeExam } from '@/app/actions/examActions';
import { ExamClient } from './ExamClient';

export default async function ExamPage() {
  const { sessionId, questions, initialState } = await startOrResumeExam();

  return (
    <ExamClient 
      sessionId={sessionId}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      questions={questions as any}
      initialState={initialState}
    />
  );
}
