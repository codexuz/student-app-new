import { apiRequest } from '@/lib/api/client';

export interface LeaderboardUser {
  user_id: string;
  first_name?: string;
  last_name?: string;
  username: string;
  avatar_url?: string;
}

/** One row of the all-time overall leaderboard (GET /student-profiles/leaderboard/overall). */
export interface OverallLeaderboardEntry {
  id: string;
  user_id: string;
  points: number;
  coins: number;
  streaks: number;
  user: LeaderboardUser;
}

/** One row of the weekly leaderboard (GET /student-profiles/leaderboard/level — misleadingly named on the backend, it's actually weekly points, not tied to course level). */
export interface WeeklyLeaderboardEntry {
  user_id: string;
  weekly_points: number;
  user: LeaderboardUser;
  profile: OverallLeaderboardEntry | null;
}

export async function getOverallLeaderboard(limit = 20): Promise<OverallLeaderboardEntry[]> {
  const data = await apiRequest<unknown>(`/student-profiles/leaderboard/overall?limit=${limit}`);
  return Array.isArray(data) ? (data as OverallLeaderboardEntry[]) : [];
}

export async function getWeeklyLeaderboard(limit = 20): Promise<WeeklyLeaderboardEntry[]> {
  const data = await apiRequest<unknown>(`/student-profiles/leaderboard/level?limit=${limit}`);
  return Array.isArray(data) ? (data as WeeklyLeaderboardEntry[]) : [];
}
