import { apiRequest } from '@/lib/api/client';
import type { Exercise, ExerciseCategory, ExerciseSummary } from '@/lib/api/curriculum-types';

/** Exercises of one category for a lesson, merged with the student's own completion/score. */
export async function getExercisesByType(
  type: ExerciseCategory,
  lessonId: string
): Promise<ExerciseSummary[]> {
  const data = await apiRequest<unknown>(`/exercise/type/${type}/lesson/${lessonId}`);
  return Array.isArray(data) ? (data as ExerciseSummary[]) : [];
}

/** Full exercise with its questions and per-type answer data. */
export async function getExercise(exerciseId: string): Promise<Exercise> {
  return apiRequest<Exercise>(`/exercise/${exerciseId}`);
}
