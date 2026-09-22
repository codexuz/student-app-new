import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { normalizeUser } from '@/lib/api/normalize-user';
import type { AuthTokens, AuthUser, StoredSession } from '@/lib/api/types';

const isWeb = Platform.OS === 'web';

const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      if (typeof window === 'undefined') return null;
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      if (typeof window === 'undefined') return;
      return AsyncStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (isWeb) {
      if (typeof window === 'undefined') return;
      return AsyncStorage.removeItem(key);
    }
    return SecureStore.deleteItemAsync(key);
  },
};

/**
 * Access/refresh tokens are credentials, so they live in the Keychain/Keystore
 * via SecureStore (or AsyncStorage on Web). Everything else here (session id,
 * expiry timestamps, the cached user profile) is non-sensitive and can be
 * larger than SecureStore is comfortable with, so it goes in AsyncStorage instead.
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
    secureStorage.getItem(ACCESS_TOKEN_KEY),
    secureStorage.getItem(REFRESH_TOKEN_KEY),
    isWeb && typeof window === 'undefined' ? null : AsyncStorage.getItem(SESSION_META_KEY),
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
    secureStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken),
    secureStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken),
    isWeb && typeof window === 'undefined'
      ? Promise.resolve()
      : AsyncStorage.setItem(SESSION_META_KEY, JSON.stringify(meta)),
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
    secureStorage.deleteItem(ACCESS_TOKEN_KEY),
    secureStorage.deleteItem(REFRESH_TOKEN_KEY),
    isWeb && typeof window === 'undefined'
      ? Promise.resolve()
      : AsyncStorage.removeItem(SESSION_META_KEY),
  ]);
}
