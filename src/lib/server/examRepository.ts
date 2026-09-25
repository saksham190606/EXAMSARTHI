/* eslint-disable @typescript-eslint/no-unused-vars */
import { Question } from '@/lib/examData';
import { MockExamQuestions } from '@/lib/examData';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export interface ExamSession {
  id: string;
  candidateId: string;
  examId: string;
  startTime: string;
  timeRemainingSeconds: number;
  bonusTimeSeconds: number;
  status: 'active' | 'completed';
  answers: Record<string, string>;
  flagged: string[];
  questionOrder: string[]; // Stable-seed shuffled order of question IDs
}

export interface AuditEvent {
  id: string;
  previousHash: string;
  eventType: 'focus_lost' | 'paste' | 'answer_changed' | 'timer_paused' | 'exam_started' | 'exam_submitted' | 'time_credited';
  details: Record<string, unknown>;
  timestamp: string;
}

// In-memory store for fallback/demo mode
const sessionStore = new Map<string, ExamSession>();
const auditStore = new Map<string, AuditEvent[]>();

export class ExamRepository {
  private static instance: ExamRepository;

  private constructor() {}

  public static getInstance(): ExamRepository {
    if (!ExamRepository.instance) {
      ExamRepository.instance = new ExamRepository();
    }
    return ExamRepository.instance;
  }

  async getSession(sessionId: string): Promise<ExamSession | null> {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
        
      if (data && !error) {
        // Hydrate from DB
        const answersRes = await supabase.from('answers').select('*').eq('session_id', sessionId);
        const answersData = answersRes.data || [];
        const answers: Record<string, string> = {};
        answersData.forEach((a: { question_id: string; answer_data?: { answerId?: string } }) => {
          if (a.answer_data?.answerId) {
             answers[a.question_id] = a.answer_data.answerId;
          }
        });
        
        return {
          id: data.id,
          candidateId: data.candidate_id,
          examId: data.exam_id,
          startTime: data.started_at,
          timeRemainingSeconds: data.time_remaining_seconds,
          bonusTimeSeconds: 0, // In full DB, could track via audit
          status: data.status,
          answers,
          flagged: [], // Could be part of a flagged table
          questionOrder: data.seed_value ? JSON.parse(data.seed_value) : []
        };
      }
    } catch (e) {
      // Fallback
    }
    return sessionStore.get(sessionId) || null;
  }

  // PRNG for stable shuffle based on seed
  private seededRandom(seed: number) {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  private shuffleArray<T>(array: T[], seedStr: string): T[] {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
      seed = (seed << 5) - seed + seedStr.charCodeAt(i);
      seed |= 0;
    }
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.seededRandom(seed++) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async createSession(candidateId: string, examId: string): Promise<ExamSession> {
    const supabase = createAdminClient();
    
    try {
      // 1. Single Active Session Lock via DB
      const existing = await supabase.from('exam_sessions')
        .select('*')
        .eq('candidate_id', candidateId)
        .eq('status', 'active')
        .maybeSingle();
        
      if (existing.data) {
        return this.getSession(existing.data.id) as Promise<ExamSession>;
      }
    } catch (e) {}

    // In-memory lock fallback
    for (const s of sessionStore.values()) {
      if (s.candidateId === candidateId && s.status === 'active') {
        return s; // Resume existing
      }
    }

    const sessionId = `session_${crypto.randomBytes(8).toString('hex')}`;
    
    // Stable-seed shuffle
    const shuffledQuestions = this.shuffleArray(MockExamQuestions, `${candidateId}_${examId}`);
    const questionOrder = shuffledQuestions.map(q => q.id);

    const session: ExamSession = {
      id: sessionId,
      candidateId,
      examId,
      startTime: new Date().toISOString(),
      timeRemainingSeconds: 1200, // 20 mins
      bonusTimeSeconds: 0,
      status: 'active',
      answers: {},
      flagged: [],
      questionOrder,
    };
    
    try {
      // Attempt DB Insert
      await supabase.from('exam_sessions').insert({
        id: sessionId,
        exam_id: examId,
        candidate_id: candidateId,
        status: 'active',
        time_remaining_seconds: 1200,
        seed_value: JSON.stringify(questionOrder)
      });
    } catch (e) {}

    sessionStore.set(sessionId, session);
    
    // Log start event
    await this.logAuditEvent(sessionId, {
      eventType: 'exam_started',
      details: { examId },
      timestamp: new Date().toISOString()
    });

    return session;
  }

  async updateAnswer(sessionId: string, questionId: string, answerId: string): Promise<void> {
    try {
      const supabase = createAdminClient();
      await supabase.from('answers').upsert({
        session_id: sessionId,
        question_id: questionId,
        answer_data: { answerId }
      }, { onConflict: 'session_id, question_id' });
    } catch (e) {}

    const session = sessionStore.get(sessionId);
    if (session && session.status === 'active') {
      session.answers[questionId] = answerId;
      sessionStore.set(sessionId, session);
    }
  }

  async creditBonusTime(sessionId: string, seconds: number, reason: string): Promise<void> {
    const session = sessionStore.get(sessionId);
    if (session && session.status === 'active') {
      session.bonusTimeSeconds += seconds;
      session.timeRemainingSeconds += seconds;
      sessionStore.set(sessionId, session);
      await this.logAuditEvent(sessionId, {
        eventType: 'time_credited',
        details: { seconds, reason },
        timestamp: new Date().toISOString()
      });
    }
  }

  async logAuditEvent(sessionId: string, event: Omit<AuditEvent, 'id' | 'previousHash'>): Promise<void> {
    const logs = auditStore.get(sessionId) || [];
    const previousHash = logs.length > 0 ? logs[logs.length - 1].id : 'genesis';
    
    const contentToHash = previousHash + event.eventType + JSON.stringify(event.details) + event.timestamp;
    const id = crypto.createHash('sha256').update(contentToHash).digest('hex');
    
    const fullEvent: AuditEvent = {
      id,
      previousHash,
      ...event
    };
    
    try {
      const supabase = createAdminClient();
      await supabase.from('audit_logs').insert({
        id,
        session_id: sessionId,
        event_type: event.eventType,
        details: event.details,
        previous_hash: previousHash
      });
    } catch (e) {}

    logs.push(fullEvent);
    auditStore.set(sessionId, logs);
    console.log(`[AUDIT LOG] ${sessionId}: ${event.eventType} (Hash: ${id.substring(0, 8)}...)`);
  }

  async submitExam(sessionId: string): Promise<void> {
    try {
      const supabase = createAdminClient();
      await supabase.from('exam_sessions').update({ status: 'completed' }).eq('id', sessionId);
    } catch(e) {}

    const session = sessionStore.get(sessionId);
    if (session) {
      session.status = 'completed';
      sessionStore.set(sessionId, session);
      await this.logAuditEvent(sessionId, {
        eventType: 'exam_submitted',
        details: { finalAnswers: session.answers },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Returns questions WITHOUT correct answers, in the shuffled order
  async getExamQuestions(sessionId: string): Promise<Omit<Question, 'correctAnswerId'>[]> {
    const session = sessionStore.get(sessionId);
    if (!session) throw new Error('Session not found');

    const questionsMap = new Map(MockExamQuestions.map(q => [q.id, q]));
    
    return session.questionOrder.map(qId => {
      const q = questionsMap.get(qId)!;
      const { correctAnswerId, ...rest } = q;
      return rest;
    });
  }
}

export const examRepository = ExamRepository.getInstance();
