import { apiRequest } from '@/lib/api/client';

export interface Certificate {
  id: string;
  student_id: string;
  course_name: string;
  certificate_url: string;
}

export async function getMyCertificates(studentId: string): Promise<Certificate[]> {
  const data = await apiRequest<unknown>(`/certificates/student/${studentId}`);
  return Array.isArray(data) ? (data as Certificate[]) : [];
}
