import { apiRequest } from '@/lib/api/client';

export interface GradingCell {
  id: string;
  grade: number;
  percent: number;
  lesson_name?: string;
  note?: string;
  teacher_id: string;
}

export interface GradingStudentRow {
  student_id: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar_url: string | null;
  grades: Record<string, GradingCell[]>;
}

export interface GroupGradingsTable {
  group: { id: string; name: string };
  start_date: string;
  end_date: string;
  dates: string[];
  students: GradingStudentRow[];
}

/**
 * Students x dates grading grid for the caller's own group. `startDate`/
 * `endDate` are `YYYY-MM-DD`. The backend resolves the group from the JWT for
 * student callers — no group id is passed here.
 */
export async function getGroupGradingsTable(
  startDate: string,
  endDate: string
): Promise<GroupGradingsTable> {
  return apiRequest<GroupGradingsTable>(
    `/gradings/group/table?startDate=${startDate}&endDate=${endDate}`
  );
}
