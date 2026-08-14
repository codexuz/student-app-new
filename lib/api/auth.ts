import * as Device from 'expo-device';

import { apiRequest } from '@/lib/api/client';
import { normalizeUser } from '@/lib/api/normalize-user';
import { clearSession, setSession } from '@/lib/api/session';
import type { AuthUser, LoginResponse } from '@/lib/api/types';

const PHONE_PATTERN = /^\+?\d+$/;

/**
 * The login endpoint accepts either a username or a phone number under
 * different body keys — this is the one place that has to guess which the
 * user typed.
 */
function identifierBody(identifier: string): { username: string } | { phone: string } {
  const trimmed = identifier.trim();
  return PHONE_PATTERN.test(trimmed) ? { phone: trimmed } : { username: trimmed };
}

export async function login(identifier: string, password: string): Promise<AuthUser> {
  const data = await apiRequest<LoginResponse>('/auth/student/login', {
    method: 'POST',
    skipAuth: true,
    headers: {
      'User-Agent': `${Device.deviceName ?? 'unknown-device'}, v${Device.osVersion ?? 'unknown'}`,
    },
    body: {
      ...identifierBody(identifier),
      password: password.trim(),
    },
  });

  const user = normalizeUser(data.user);

  await setSession({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    sessionId: data.sessionId,
    expiresAt: data.expiresAt,
    refreshExpiresAt: data.refreshExpiresAt,
    user,
  });

  return user;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } catch {
    // Best-effort — an already-expired/invalid token or a network failure
    // shouldn't block the client from clearing its local session below and
    // treating the user as signed out.
  } finally {
    await clearSession();
  }
}

export async function getProfile(userId: string): Promise<AuthUser> {
  return apiRequest<AuthUser>(`/users/${userId}`);
}

export async function requestPasswordReset(phone: string): Promise<void> {
  await apiRequest('/auth/password-reset/request', {
    method: 'POST',
    skipAuth: true,
    body: { phone: phone.trim() },
  });
}

export async function verifyResetCode(phone: string, code: string): Promise<void> {
  await apiRequest('/auth/password-reset/verify', {
    method: 'POST',
    skipAuth: true,
    body: { phone: phone.trim(), code },
  });
}

export async function confirmPasswordReset(
  phone: string,
  code: string,
  newPassword: string
): Promise<void> {
  await apiRequest('/auth/password-reset/confirm', {
    method: 'POST',
    skipAuth: true,
    body: { phone: phone.trim(), code, new_password: newPassword },
  });
}
