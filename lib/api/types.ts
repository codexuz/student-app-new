/** The authenticated student profile as returned by the backend. */
export interface AuthUser {
  user_id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  [key: string]: unknown;
}

/** Raw shape of a successful `/auth/student/login` or `/auth/refresh` response. */
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  sessionId: string;
  expiresAt: string;
  refreshExpiresAt: string;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

export type RefreshResponse = AuthTokens;

/** What actually gets persisted and mirrored into the auth store. */
export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresAt: string;
  refreshExpiresAt: string;
  user: AuthUser;
}
