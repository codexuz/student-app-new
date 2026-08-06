import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';

import * as authApi from '@/lib/api/auth';
import {
  getSessionSnapshot,
  subscribeToSession,
  updateSessionUser,
} from '@/lib/api/session';
import type { AuthUser } from '@/lib/api/types';

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True only while the stored session is still being read on launch. */
  isLoading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Patches the cached profile in place — e.g. after an avatar upload. */
  updateUser: (patch: Partial<AuthUser>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const session = useSyncExternalStore(subscribeToSession, getSessionSnapshot);

  const signIn = useCallback(async (identifier: string, password: string) => {
    await authApi.login(identifier, password);
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout();
  }, []);

  const updateUser = useCallback(
    (patch: Partial<AuthUser>) => updateSessionUser(patch),
    []
  );

  const value = useMemo<AuthContextValue>(() => {
    const isPending = session === 'pending';
    return {
      user: isPending ? null : session?.user ?? null,
      isAuthenticated: !isPending && session !== null,
      isLoading: isPending,
      signIn,
      signOut,
      updateUser,
    };
  }, [session, signIn, signOut, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
