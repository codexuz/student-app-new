import type { AuthUser } from '@/lib/api/types';

/**
 * Some backend responses key the student's id as `user_id`, others as plain
 * `id` — the old app worked around this by falling back to `.id` at every
 * single call site. Normalizing once means the rest of the app can just
 * trust `user.user_id`.
 *
 * Lives in its own module (rather than inside `auth.ts`) so `storage.ts` can
 * apply it to whatever's already on disk without an `auth.ts` <-> `session.ts`
 * import cycle.
 */
export function normalizeUser(user: AuthUser): AuthUser {
  const id = user.user_id ?? (user as { id?: string | number }).id;
  return { ...user, user_id: id != null ? String(id) : user.user_id };
}
