"use server"

import { examRepository, AuditEvent } from '@/lib/server/examRepository';
import { createClient } from '@/lib/supabase/server';

const FALLBACK_USER_ID = "user_demo_123";
const DEMO_EXAM_ID = "exam_demo_1";

export async function startOrResumeExam() {
  // Get the real authenticated user from Supabase session
  let userId = FALLBACK_USER_ID;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      userId = user.id;
    }
  } catch {
    // Server-action context may not have cookies in some edge cases;
    // fall back to demo user to avoid crashing the exam page.
  }

  const session = await examRepository.createSession(userId, DEMO_EXAM_ID);
  const questions = await examRepository.getExamQuestions(session.id);
  
  return {
    sessionId: session.id,
    questions,
    initialState: {
      timeRemaining: session.timeRemainingSeconds,
      answers: session.answers,
      flagged: session.flagged,
    }
  };
}

export async function submitAnswerAction(sessionId: string, questionId: string, answerId: string) {
  await examRepository.updateAnswer(sessionId, questionId, answerId);
  await examRepository.logAuditEvent(sessionId, {
    eventType: 'answer_changed',
    details: { questionId, answerId },
    timestamp: new Date().toISOString()
  });
  return { success: true };
}

export async function logExamEventAction(sessionId: string, eventType: AuditEvent['eventType'], details: Record<string, unknown>) {
  await examRepository.logAuditEvent(sessionId, {
    eventType,
    details,
    timestamp: new Date().toISOString()
  });
  return { success: true };
}

export async function finishExamAction(sessionId: string) {
  await examRepository.submitExam(sessionId);
  return { success: true };
}
