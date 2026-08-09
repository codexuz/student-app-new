import { apiRequest, ApiError } from '@/lib/api/client';

export interface StudentProfile {
  id: string;
  user_id: string;
  points: number;
  coins: number;
  streaks: number;
  level: number;
}

/** 404s for students who don't have a profile row yet — treated as zeroed stats. */
export async function getMyStudentProfile(userId: string): Promise<StudentProfile | null> {
  try {
    return await apiRequest<StudentProfile>(`/student-profiles/user/${userId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export interface StreakCalendarDay {
  active_date: string;
  streak_count: number;
}

/** Active days for one calendar month — backs the streak calendar bottom sheet. */
export async function getStreakCalendar(
  userId: string,
  year: number,
  month: number
): Promise<StreakCalendarDay[]> {
  const data = await apiRequest<unknown>(
    `/student-profiles/user/${userId}/streak-calendar?year=${year}&month=${month}`
  );
  return Array.isArray(data) ? (data as StreakCalendarDay[]) : [];
}
