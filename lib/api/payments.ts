import { apiRequest } from '@/lib/api/client';

export interface PaymentStatus {
  paymentStatus: 'completed' | 'pending' | 'overdue' | string;
  pendingAmount: number;
  totalPaid: number;
  daysUntilNextPayment: number | null;
  nextPaymentDate: string | null;
}

/**
 * 404s for students who haven't been billed yet, and staff accounts get a
 * 403 (they have no student payment record) — both are expected "no
 * subscription to show" cases the caller should treat the same as any other
 * failure: hide the card rather than surface an error.
 */
export async function getPaymentStatus(userId: string): Promise<PaymentStatus> {
  return apiRequest<PaymentStatus>(`/student-payments/student/${userId}/status`);
}

export interface Payment {
  id: string;
  student_id: string;
  manager_id: string;
  branch_id: string | null;
  amount: number;
  status: string;
  payment_method: string;
  payment_date: string;
  next_payment_date: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  manager: {
    first_name: string;
    last_name: string;
  } | null;
}

export async function getMyPayments(userId: string): Promise<Payment[]> {
  const data = await apiRequest<unknown>(`/student-payments/student/${userId}`);
  if (Array.isArray(data)) return data as Payment[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: Payment[] }).data;
  }
  return [];
}
