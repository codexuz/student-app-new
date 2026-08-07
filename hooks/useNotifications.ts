import { useEffect, useState } from 'react';
import { router } from 'expo-router';

import {
  getInitialNotificationPath,
  registerForPushNotifications,
  setupForegroundHandler,
  subscribeToNotificationOpened,
  subscribeToPushTokenRefresh,
} from '@/lib/notifications';
import { useAuth } from '@/providers/auth-provider';

export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.user_id;
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const setupNotifications = async () => {
      // Register (no-op until permission has been granted) and get token.
      const token = await registerForPushNotifications(userId);
      if (isMounted) setExpoPushToken(token);

      // Check if app was opened from a cold start via a notification tap.
      const initialPath = await getInitialNotificationPath();
      if (isMounted && initialPath) {
        router.push(initialPath as Parameters<typeof router.push>[0]);
      }
    };

    void setupNotifications();

    const unsubscribeTokenRefresh = subscribeToPushTokenRefresh(userId);
    const unsubscribeForeground = setupForegroundHandler();
    const unsubscribeNotificationOpened = subscribeToNotificationOpened((path) => {
      router.push(path as Parameters<typeof router.push>[0]);
    });

    return () => {
      isMounted = false;
      unsubscribeTokenRefresh();
      unsubscribeForeground();
      unsubscribeNotificationOpened();
    };
  }, [userId]);

  return { expoPushToken };
}
