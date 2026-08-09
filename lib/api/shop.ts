import { apiRequest } from '@/lib/api/client';
import type { StudentProfile } from '@/lib/api/student-profile';

export interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  category_id?: string;
  category?: ShopCategory;
  /** Price in coins. */
  price: number;
  /** `null`/`undefined` means unlimited stock. */
  stock?: number | null;
  is_active: boolean;
}

export type PurchaseStatus = 'pending' | 'approved' | 'rejected' | 'delivered';

export interface ShopPurchase {
  id: string;
  user_id: string;
  item_id: string;
  item?: ShopItem;
  quantity: number;
  total_price: number;
  status: PurchaseStatus;
  admin_note?: string;
  createdAt: string;
}

export type ExchangeSource = 'points' | 'streaks';

export async function getShopCategories(): Promise<ShopCategory[]> {
  const data = await apiRequest<unknown>('/shop/categories');
  return Array.isArray(data) ? (data as ShopCategory[]) : [];
}

export async function getShopItems(params?: { categoryId?: string; search?: string }): Promise<ShopItem[]> {
  const query = new URLSearchParams();
  if (params?.categoryId) query.set('categoryId', params.categoryId);
  if (params?.search) query.set('search', params.search);
  const qs = query.toString();

  const data = await apiRequest<unknown>(`/shop/items${qs ? `?${qs}` : ''}`);
  return Array.isArray(data) ? (data as ShopItem[]) : [];
}

/** Places an order for `quantity` of `itemId` — deducts coins immediately, order starts `pending` until an admin reviews it. */
export async function purchaseItem(itemId: string, quantity = 1): Promise<ShopPurchase> {
  return apiRequest<ShopPurchase>('/shop/purchases', {
    method: 'POST',
    body: { item_id: itemId, quantity },
  });
}

export async function getMyPurchases(): Promise<ShopPurchase[]> {
  const data = await apiRequest<unknown>('/shop/purchases/mine');
  return Array.isArray(data) ? (data as ShopPurchase[]) : [];
}

/** Converts points or streaks into coins (one-way; `amount` must be an exact multiple of the rate: 100 points or 10 streaks per coin). */
export async function exchangeToCoins(from: ExchangeSource, amount: number): Promise<StudentProfile> {
  return apiRequest<StudentProfile>('/shop/exchange', {
    method: 'POST',
    body: { from, amount },
  });
}
