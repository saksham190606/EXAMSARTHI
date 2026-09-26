/**
 * EXAMSARTHI — Sectional Timing Types
 */

export interface ExamSectionConfig {
  id: string;
  name: string;
  order_index: number;
  duration_minutes: number;
  question_count?: number;
}

export interface SectionProgressItem {
  section_id: string;
  name: string;
  order_index: number;
  duration_seconds: number;
  time_used_seconds: number;
  started_at: string;
  submitted_at: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  timing_flag?: 'NORMAL' | 'CLIENT_SERVER_TIME_DISCREPANCY' | 'EXCEEDED_ALLOTTED_TIME_CAPPED';
}

export interface ExamSectionProgress {
  active_section_index: number;
  sections: SectionProgressItem[];
}
