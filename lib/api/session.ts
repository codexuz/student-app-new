import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from '@/lib/api/storage';
import type { AuthTokens, AuthUser, StoredSession } from '@/lib/api/types';

/**
 * The single source of truth for "who is logged in right now", shared by the
 * API client (which needs the current access token and may refresh it mid
 * request) and the React layer (which just wants to render off it).
 *
 * A plain module-level store rather than React state because the client has
 * no component to hold state in — it lives outside the tree, called from
 * anywhere. `useSyncExternalStore` in `AuthProvider` is what makes this safe
 * to read from React without duplicating it into a second state slice that
 * could drift out of sync.
 *
 * `'pending'` is distinct from `null` so the UI can tell "still reading
 * storage" from "confirmed logged out" during the very first frame.
 */
type SessionState = StoredSession | null | 'pending';

let session: SessionState = 'pending';
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSessionSnapshot(): SessionState {
  return session;
}

/** Kicked off once below, at module load — see the note at the bottom. */
export async function hydrateSession(): Promise<void> {
  const stored = await readStoredSession();
  session = stored;
  emit();
}

export async function setSession(next: StoredSession): Promise<void> {
  session = next;
  await writeStoredSession(next);
  emit();
}

/** After a silent token refresh: same user/session id, fresh tokens. */
export async function updateSessionTokens(tokens: AuthTokens): Promise<void> {
  if (!session || session === 'pending') return;
  const next: StoredSession = {
    ...session,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    sessionId: tokens.sessionId,
    expiresAt: tokens.expiresAt,
    refreshExpiresAt: tokens.refreshExpiresAt,
  };
  session = next;
  await writeStoredSession(next);
  emit();
}

/** Patches the cached profile in place — e.g. after an avatar upload or a profile edit. */
export async function updateSessionUser(patch: Partial<AuthUser>): Promise<void> {
  if (!session || session === 'pending') return;
  const next: StoredSession = { ...session, user: { ...session.user, ...patch } };
  session = next;
  await writeStoredSession(next);
  emit();
}

export async function clearSession(): Promise<void> {
  // Flip in-memory state and notify listeners first — this is what actually
  // drives the UI into the signed-out state. If it ran after the storage
  // clear below and that clear rejected (seen on iOS: Keychain access can
  // throw after a re-signed TestFlight/App Store build), `emit()` would
  // never fire and `useSyncExternalStore` subscribers would stay on the
  // stale authenticated snapshot forever — sign-out would silently do
  // nothing from the UI's perspective.
  session = null;
  emit();

  try {
    await clearStoredSession();
  } catch {
    // Best-effort, same as the network call in `authApi.logout()` — a
    // failed on-disk clear doesn't matter since the next login overwrites
    // whatever's left there.
  }
}

// Start hydrating as soon as this module is imported (from `AuthProvider`),
// rather than waiting for a component to mount and ask for it, so storage IO
// and the first render's `'pending'` state race as little as possible.
void hydrateSession();
