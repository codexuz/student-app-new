import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { normalizeUser } from '@/lib/api/normalize-user';
import type { AuthTokens, AuthUser, StoredSession } from '@/lib/api/types';

/**
 * Access/refresh tokens are credentials, so they live in the Keychain/Keystore
 * via SecureStore. Everything else here (session id, expiry timestamps, the
 * cached user profile) is non-sensitive and can be larger than SecureStore is
 * comfortable with, so it goes in AsyncStorage instead.
 */
const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';
const SESSION_META_KEY = 'auth.sessionMeta';

interface SessionMeta {
  sessionId: string;
  expiresAt: string;
  refreshExpiresAt: string;
  user: AuthUser;
}

export async function readStoredSession(): Promise<StoredSession | null> {
  const [accessToken, refreshToken, rawMeta] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    AsyncStorage.getItem(SESSION_META_KEY),
  ]);

  if (!accessToken || !refreshToken || !rawMeta) return null;

  try {
    const meta: SessionMeta = JSON.parse(rawMeta);
    // Self-heals sessions written before `normalizeUser` existed — no
    // re-login required just because `user_id` was missing on disk.
    return { accessToken, refreshToken, ...meta, user: normalizeUser(meta.user) };
  } catch {
    return null;
  }
}

export async function writeStoredSession(session: StoredSession): Promise<void> {
  const meta: SessionMeta = {
    sessionId: session.sessionId,
    expiresAt: session.expiresAt,
    refreshExpiresAt: session.refreshExpiresAt,
    user: session.user,
  };

  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken),
    AsyncStorage.setItem(SESSION_META_KEY, JSON.stringify(meta)),
  ]);
}

/** Called after a token refresh — same session, new tokens/expiry. */
export async function writeRefreshedTokens(
  tokens: AuthTokens,
  user: AuthUser
): Promise<void> {
  await writeStoredSession({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    sessionId: tokens.sessionId,
    expiresAt: tokens.expiresAt,
    refreshExpiresAt: tokens.refreshExpiresAt,
    user,
  });
}

export async function clearStoredSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    AsyncStorage.removeItem(SESSION_META_KEY),
  ]);
}
