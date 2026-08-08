import { apiRequest } from '@/lib/api/client';
import type {
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
