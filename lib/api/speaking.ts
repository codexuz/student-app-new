import { apiRequest } from '@/lib/api/client';
import type {
  IeltsPart1Question,
  PronunciationPhrase,
  SpeakingResponse,
  SpeakingResponseType,
  SpeakingTask,
  SpeakingType,
} from '@/lib/api/curriculum-types';

export async function getSpeakingByLesson(
  lessonId: string,
  type: SpeakingType
): Promise<SpeakingTask[]> {
  const data = await apiRequest<unknown>(`/speaking/lesson/${lessonId}/type/${type}`);
  return Array.isArray(data) ? (data as SpeakingTask[]) : [];
}

export async function getPart1Questions(speakingId: string): Promise<IeltsPart1Question[]> {
  const data = await apiRequest<unknown>(`/ieltspart1-question/speaking/${speakingId}`);
  return Array.isArray(data) ? (data as IeltsPart1Question[]) : [];
}

export async function getPronunciationPhrases(speakingId: string): Promise<PronunciationPhrase[]> {
  const data = await apiRequest<unknown>(`/pronunciation-exercise/speaking/${speakingId}`);
  return Array.isArray(data) ? (data as PronunciationPhrase[]) : [];
}

export interface SubmitSpeakingResponseInput {
  speaking_id: string;
  /** Required by the backend DTO (`@IsUUID()`, not optional) — the student's own id. */
  student_id: string;
  response_type: SpeakingResponseType;
  audio_url?: string[];
  transcription?: string;
  /**
   * Ignored by the backend for student callers (stripped server-side) —
   * still sent for forward-compatibility, but don't rely on it round-tripping.
   */
  result?: unknown;
  pronunciation_score?: number;
}

export async function submitSpeakingResponse(
  input: SubmitSpeakingResponseInput
): Promise<SpeakingResponse> {
  return apiRequest<SpeakingResponse>('/speaking-responses', { method: 'POST', body: input });
}

export async function checkSpeakingSubmission(
  lessonId: string,
  studentId: string
): Promise<unknown[]> {
  const data = await apiRequest<unknown>(
    `/speaking-responses/check-submission?lessonId=${lessonId}&studentId=${studentId}`
  );
  return Array.isArray(data) ? data : [];
}
