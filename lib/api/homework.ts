import { apiRequest } from '@/lib/api/client';
import type {
  HomeworkStats,
  SubmitHomeworkSectionInput,
  SubmitHomeworkSectionResult,
} from '@/lib/api/curriculum-types';

/**
 * The single "I finished this" call for every exercise category. Upserts by
 * `exercise_id`/`speaking_id` + `section` — a retry updates the existing
 * record instead of creating a duplicate (and only the first attempt is
 * rewards-eligible).
 */
export async function submitHomeworkSection(
  input: SubmitHomeworkSectionInput
): Promise<SubmitHomeworkSectionResult> {
  return apiRequest<SubmitHomeworkSectionResult>('/homework-submissions/section', {
    method: 'POST',
    body: input,
  });
}

/**
 * All-time homework averages by section (reading/listening/grammar/writing/
 * speaking), plus an overall average and per-section score trend. Speaking
 * scores fold in pronunciation-response scores alongside homework sections.
 */
export async function getStudentHomeworkStats(studentId: string): Promise<HomeworkStats> {
  return apiRequest<HomeworkStats>(`/homework-submissions/student/${studentId}/stats`);
}
