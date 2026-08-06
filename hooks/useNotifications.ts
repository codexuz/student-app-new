import { useEffect, useState } from 'react';
import { router } from 'expo-router';

import {
  getInitialNotificationPath,
  registerForPushNotifications,
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

    registerForPushNotifications(userId).then((token) => {
      if (isMounted) setExpoPushToken(token);
    });

    getInitialNotificationPath().then((path) => {
      if (isMounted && path) router.push(path as Parameters<typeof router.push>[0]);
    });

    const unsubscribeOpened = subscribeToNotificationOpened((path) => {
      router.push(path as Parameters<typeof router.push>[0]);
    });
    const unsubscribeRefresh = subscribeToPushTokenRefresh(userId);

    return () => {
      isMounted = false;
      unsubscribeOpened();
      unsubscribeRefresh();
    };
  }, [userId]);

  return { expoPushToken };
}
