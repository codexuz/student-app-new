import { apiRequest } from '@/lib/api/client';
import type { RoadmapUnit } from '@/lib/api/curriculum-types';

export async function getRoadmap(courseId: string, groupId: string): Promise<RoadmapUnit[]> {
  const data = await apiRequest<unknown>(`/units/roadmap/me/course/${courseId}/group/${groupId}`);
  return Array.isArray(data) ? (data as RoadmapUnit[]) : [];
}
