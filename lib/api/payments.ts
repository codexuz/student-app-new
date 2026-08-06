import { apiRequest } from '@/lib/api/client';

export interface PaymentStatus {
  paymentStatus: 'overdue' | 'active' | string;
  pendingAmount?: number;
  daysUntilNextPayment?: number;
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
