import {
  clearSession,
  getSessionSnapshot,
  updateSessionTokens,
} from '@/lib/api/session';
import type { RefreshResponse } from '@/lib/api/types';

const BASE_URL = 'https://backend.impulselc.uz/api';

/** Refresh proactively once the access token has under this long left. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip attaching the Authorization header and the refresh dance — for login/password-reset calls that predate a session. */
  skipAuth?: boolean;
}

function parseErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const message = (payload as Record<string, unknown>).message ?? (payload as Record<string, unknown>).error;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Refreshing is deduplicated behind one in-flight promise so that several
// requests racing past an expired token don't each fire their own refresh —
// only the first does, and the rest await its result.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function performRefresh(): Promise<string | null> {
  const current = getSessionSnapshot();
  if (!current || current === 'pending') return null;

  if (new Date(current.refreshExpiresAt) <= new Date()) {
    await clearSession();
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        refreshToken: current.refreshToken,
        sessionId: current.sessionId,
      }),
    });

    if (!response.ok) {
      await clearSession();
      return null;
    }

    const data = (await response.json()) as RefreshResponse;
    if (!data.access_token || !data.refresh_token) {
      await clearSession();
      return null;
    }

    await updateSessionTokens(data);
    return data.access_token;
  } catch {
    // A network error while refreshing doesn't mean the refresh token is
    // bad — leave the session alone so the caller can retry later instead
    // of forcing a logout on a flaky connection.
    return null;
  }
}

async function resolveAccessToken(): Promise<string | null> {
  const current = getSessionSnapshot();
  if (!current || current === 'pending') return null;

  const expiresSoon = new Date(current.expiresAt).getTime() - Date.now() < REFRESH_MARGIN_MS;
  if (!expiresSoon) return current.accessToken;

  return refreshAccessToken();
}

/**
 * Sends a request, attaching a fresh Authorization header, and retries once
 * with a refreshed token on a 401. Shared by the JSON and multipart paths so
 * the refresh dance only lives in one place.
 */
async function sendWithRetry(
  build: (authHeader: Record<string, string>) => Promise<Response>,
  skipAuth: boolean
): Promise<Response> {
  const token = skipAuth ? null : await resolveAccessToken();
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  let response = await build(authHeader);

  if (response.status === 401 && !skipAuth) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      response = await build({ Authorization: `Bearer ${refreshedToken}` });
    }
  }

  return response;
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return;
  const payload = await parseJsonSafely(response);
  throw new ApiError(
    response.status,
    parseErrorMessage(payload, response.statusText || `HTTP ${response.status}`),
    payload
  );
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers, skipAuth = false } = options;

  const response = await sendWithRetry(
    (authHeader) =>
      fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...headers,
          ...authHeader,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }),
    skipAuth
  );

  await throwIfNotOk(response);

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export interface ApiUploadOptions {
  method?: 'POST' | 'PATCH' | 'PUT';
}

/** For `multipart/form-data` requests (file uploads). Always requires auth. */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: ApiUploadOptions = {}
): Promise<T> {
  const response = await sendWithRetry(
    (authHeader) =>
      fetch(`${BASE_URL}${path}`, {
        method: options.method ?? 'POST',
        // No Content-Type here — fetch derives the multipart boundary from the
        // FormData body itself, and setting it manually breaks that.
        headers: { Accept: 'application/json', ...authHeader },
        body: formData,
      }),
    false
  );

  await throwIfNotOk(response);
  return (await response.json()) as T;
}
