import { apiRequest } from '@/lib/api/client';

export type ActivityTransactionCurrency = 'coins' | 'points';
export type ActivityTransactionDirection = 'earn' | 'spend';

export interface ActivityTransaction {
  id: string;
  user_id: string;
  currency: ActivityTransactionCurrency;
  direction: ActivityTransactionDirection;
  amount: number;
  balance_after: number | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ActivityTransactionPage {
  rows: ActivityTransaction[];
  count: number;
}

const DEFAULT_LIMIT = 20;

/** Paginated coins/points earn+spend history for a user, newest first. */
export async function getActivityTransactions(
  userId: string,
  limit = DEFAULT_LIMIT,
  offset = 0
): Promise<ActivityTransactionPage> {
  const data = await apiRequest<Partial<ActivityTransactionPage>>(
    `/student-profiles/user/${userId}/activity-transactions?limit=${limit}&offset=${offset}`
  );
  return {
    rows: Array.isArray(data?.rows) ? (data.rows as ActivityTransaction[]) : [],
    count: typeof data?.count === 'number' ? data.count : 0,
  };
}
