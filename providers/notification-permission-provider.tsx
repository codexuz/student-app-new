import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';
import type { PermissionStatus } from 'expo-notifications';

import {
  dismissPrompt,
  getSnapshot,
  refreshPermissionStatus,
  subscribe,
} from '@/lib/notification-permission-store';
import {
  registerForPushNotifications,
  requestNotificationPermission,
} from '@/lib/notifications';
import { useAuth } from '@/providers/auth-provider';

type NotificationPermissionContextValue = {
  status: PermissionStatus | 'unknown';
  isLoading: boolean;
  /** Whether the in-app "enable notifications" screen belongs on screen right now. */
  shouldPrompt: boolean;
  /** Fires the native OS dialog. Only call this from that screen's own button. */
  requestPermission: () => Promise<boolean>;
  /** User tapped "Not now" — remembers the choice so the prompt doesn't return. */
  dismiss: () => Promise<void>;
  refresh: () => Promise<void>;
};

const NotificationPermissionContext =
  createContext<NotificationPermissionContextValue | null>(null);

export function NotificationPermissionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  const { user } = useAuth();
  const userId = user?.user_id;

  const requestPermission = useCallback(async () => {
    const granted = await requestNotificationPermission();
    await refreshPermissionStatus();
    if (granted && userId) {
      await registerForPushNotifications(userId);
    }
    return granted;
  }, [userId]);

  const dismiss = useCallback(() => dismissPrompt(), []);
  const refresh = useCallback(() => refreshPermissionStatus(), []);

  const value = useMemo<NotificationPermissionContextValue>(() => {
    const isLoading = snapshot === 'pending';

    return {
      status: isLoading ? 'unknown' : snapshot.status,
      isLoading,
      // Only worth showing once someone's actually signed in — push tokens
      // are registered per-user, and there's nothing to ask for otherwise.
      shouldPrompt:
        !isLoading && !!userId && snapshot.status === 'undetermined' && !snapshot.dismissed,
      requestPermission,
      dismiss,
      refresh,
    };
  }, [snapshot, userId, requestPermission, dismiss, refresh]);

  return (
    <NotificationPermissionContext.Provider value={value}>
      {children}
    </NotificationPermissionContext.Provider>
  );
}

export function useNotificationPermission(): NotificationPermissionContextValue {
  const context = useContext(NotificationPermissionContext);
  if (!context) {
    throw new Error(
      'useNotificationPermission must be used within a NotificationPermissionProvider'
    );
  }
  return context;
}
