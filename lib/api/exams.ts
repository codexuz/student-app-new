import { apiRequest, ApiError } from '@/lib/api/client';

export type ExamStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface Exam {
  id: number;
  title: string;
  description?: string;
  duration?: number;
  total_questions?: number;
  passing_score?: number;
  status?: ExamStatus;
  created_at?: string;
  scheduled_at?: string;
  is_online?: boolean;
}

export async function getMyExams(studentId: string): Promise<Exam[]> {
  const data = await apiRequest<unknown>(`/exams/user/${studentId}`);
  return Array.isArray(data) ? (data as Exam[]) : [];
}

export interface ExamResult {
  id: number;
  exam?: {
    title: string;
    level?: string;
  };
  percentage: number;
  score: number;
  max_score: number;
  result: string;
  section_scores?: Record<string, number>;
  feedback?: string;
  created_at?: string;
}

/** 404s when the student hasn't been graded for this exam yet — treated as "no result". */
export async function getExamResult(examId: string, studentId: string): Promise<ExamResult | null> {
  try {
    return await apiRequest<ExamResult>(`/exam-results/exam/${examId}/student/${studentId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
