import { apiRequest } from '@/lib/api/client';

/**
 * One row per course the student has ever been enrolled in, including levels
 * already finished — this is the enrollment ledger, not "courses tied to a
 * currently active group" (there's no progress/roadmap API for that yet).
 */
export interface Enrollment {
  id: string;
  course_id: string;
  course_name: string;
  level: string | null;
  group_id: string | null;
  completed: number;
  total: number;
  percentage: number;
  is_completed: boolean;
  completed_at: string | null;
  enrolled_at: string;
}

export async function getMyCourses(): Promise<Enrollment[]> {
  const data = await apiRequest<unknown>('/user-courses/me');
  return Array.isArray(data) ? (data as Enrollment[]) : [];
}
