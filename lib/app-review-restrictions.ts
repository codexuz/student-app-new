import { Platform } from 'react-native';

import type { AuthUser } from '@/lib/api/types';

const RESTRICTED_USERNAMES = ['demo_edumo'];
const RESTRICTED_PHONES = ['+998990001122'];

/**
 * Apple's App Store review account must not see the Movies shortcut or
 * payment/subscription status — both can trip review guidelines (movies:
 * unmoderated streaming content; payments: external purchase flow outside
 * Apple's IAP). Scoped to iOS only, so this account keeps full functionality
 * on Android/web.
 */
export function isAppReviewRestricted(user: Pick<AuthUser, 'username' | 'phone'> | null | undefined): boolean {
  if (Platform.OS !== 'ios' || !user) return false;
  return RESTRICTED_USERNAMES.includes(user.username) || (!!user.phone && RESTRICTED_PHONES.includes(user.phone));
}
