import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiRequest } from '@/lib/api/client';

// Controls how notifications are presented while the app is foregrounded.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

const projectId: string | undefined =
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

/**
 * Create the default Android notification channel.
 * Required on Android 8+ and should exist before requesting permissions.
 */
async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1055F8',
  });
}

/**
 * Read-only — never triggers the native OS prompt. The old app didn't need
 * this (it always asked during `initialize`), but the in-app "enable
 * notifications" screen needs to know the status without side effects, to
 * decide whether it belongs on screen at all.
 */
export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/** Request notification permissions. Only call this from an explicit user action (the "Enable Notifications" screen's button). */
export async function requestPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

/** Get the Expo push token for this device. */
async function getToken(): Promise<string | null> {
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}

/** Save token to backend database. */
async function saveTokenToDatabase(token: string, userId: string): Promise<void> {
  try {
    if (!token || !userId) return;
    await apiRequest('/notifications/tokens', {
      method: 'POST',
      body: { token, user_id: userId },
    });
  } catch {
    // Best-effort — a failed save shouldn't block push notifications from
    // working locally, and the refresh listener will get another chance.
  }
}

/**
 * Fetches and persists the push token, but only if permission has already
 * been granted — unlike the old app's `initialize`, this never prompts.
 * Safe to call on every launch/login; it's a no-op until the user has said
 * yes via the "enable notifications" screen (or the OS permission was
 * already granted in an earlier session).
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    // Push tokens are only available on physical devices.
    if (!Device.isDevice) return null;

    // Channel must exist before requesting permissions on Android.
    await setupAndroidChannel();

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;

    const token = await getToken();
    if (!token) return null;

    await saveTokenToDatabase(token, userId);

    return token;
  } catch {
    return null;
  }
}

/**
 * Setup token refresh listener.
 * The device push token can rotate while the app runs; when it does we
 * re-fetch the Expo push token and persist it.
 */
export function subscribeToPushTokenRefresh(userId: string): () => void {
  if (Platform.OS === 'web') return () => {};
  const subscription = Notifications.addPushTokenListener(async () => {
    const token = await getToken();
    if (token && userId) {
      await saveTokenToDatabase(token, userId);
    }
  });
  return () => subscription.remove();
}

/** Setup foreground notification handler. */
export function setupForegroundHandler(): () => void {
  if (Platform.OS === 'web') return () => {};
  const subscription = Notifications.addNotificationReceivedListener(() => {
    // Handle foreground notifications (update app state, badges, etc.)
  });
  return () => subscription.remove();
}

/** Maps a `{ screen, id }` notification payload (the backend's contract) to an in-app route. */
export function resolveNotificationPath(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const { screen, id } = data as { screen?: string; id?: string | number };

  switch (screen) {
    case 'lessons':
      return id ? `/lessons/${id}` : null;
    case 'exams':
      return id ? `/exams/${id}` : null;
    case 'articles':
      return id ? `/articles/${id}` : null;
    case 'notifications':
      return '/notifications';
    case 'leaderboard':
      return '/leaderboard';
    case 'payments':
      return '/payments';
    case 'certificates':
      return '/certificates';
    case 'progress':
      return '/progress';
    default:
      return null;
  }
}

/** Fires when the user taps a notification while the app is running. */
export function subscribeToNotificationOpened(onOpen: (path: string) => void): () => void {
  if (Platform.OS === 'web') return () => {};
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const path = resolveNotificationPath(response.notification.request.content.data);
    if (path) onOpen(path);
  });
  return () => subscription.remove();
}

/** Whether the current app launch was a cold start triggered by tapping a notification. */
export async function getInitialNotificationPath(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return null;
    return resolveNotificationPath(response.notification.request.content.data);
  } catch {
    return null;
  }
}
