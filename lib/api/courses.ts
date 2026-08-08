import { apiRequest, ApiError } from '@/lib/api/client';
import type { CourseProgressItem } from '@/lib/api/curriculum-types';

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

/**
 * Progress for the course(s) tied to the student's currently active group(s)
 * — the roadmap's source of truth, distinct from `getMyCourses` above (the
 * all-time enrollment ledger). 404s when the student has no active English
 * group, which just means "nothing to show" rather than an error.
 */
export async function getMyCourseProgress(): Promise<CourseProgressItem[]> {
  try {
    const data = await apiRequest<unknown>('/courses/progress-all/me');
    return Array.isArray(data) ? (data as CourseProgressItem[]) : [];
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      return [];
    }
    throw error;
  }
}
