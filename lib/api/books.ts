import { apiRequest } from '@/lib/api/client';

export interface StudentBook {
  id: string;
  title: string;
  url?: string;
  createdAt?: string;
}

export async function getMyStudentBooks(studentId: string): Promise<StudentBook[]> {
  const data = await apiRequest<unknown>(`/student-books/student/${studentId}`);
  return Array.isArray(data) ? (data as StudentBook[]) : [];
}
