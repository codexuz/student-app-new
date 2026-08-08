import { apiRequest } from '@/lib/api/client';
import type { LessonFull } from '@/lib/api/curriculum-types';

/** Single call for theory + exercises + speaking, driving the lesson hub screen. */
export async function getLessonFull(lessonId: string): Promise<LessonFull> {
  return apiRequest<LessonFull>(`/lessons/${lessonId}/full`);
}
