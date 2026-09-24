"use server"

import { examRepository, AuditEvent } from '@/lib/server/examRepository';


// Mock user ID for demo purposes until auth is wired in the UI
const MOCK_USER_ID = "user_demo_123";
const MOCK_EXAM_ID = "exam_demo_1";

export async function startOrResumeExam() {
  // In a real app, we'd check cookies/session for an existing exam_session
  const session = await examRepository.createSession(MOCK_USER_ID, MOCK_EXAM_ID);
  
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
