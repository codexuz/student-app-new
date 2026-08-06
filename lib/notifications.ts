import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiRequest } from '@/lib/api/client';

// Controls how notifications are presented while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const projectId: string | undefined =
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

/** Required on Android 8+, and must exist before permissions are requested. */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1055F8',
  });
}

/** Read-only — never triggers the native OS prompt. Use this to decide whether the in-app "enable notifications" screen is needed. */
export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Triggers the native OS permission dialog. Only call this from an explicit
 * user action (the "Enable Notifications" screen) — iOS shows this dialog
 * exactly once per install, so firing it automatically on launch burns that
 * one shot before the user has any context for what it's for.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  await ensureAndroidChannel();
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function getExpoPushToken(): Promise<string | null> {
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}

async function saveExpoPushToken(token: string, userId: string): Promise<void> {
  await apiRequest('/notifications/tokens', {
    method: 'POST',
    body: { token, user_id: userId },
  });
}

/** Fetches the current push token and persists it — shared by the initial registration and the token-refresh listener. */
async function syncPushToken(userId: string): Promise<string | null> {
  const token = await getExpoPushToken();
  if (!token) return null;

  try {
    await saveExpoPushToken(token, userId);
  } catch {
    // Best-effort — a failed save shouldn't block push notifications from
    // working locally, and the refresh listener will get another chance.
  }
  return token;
}

/**
 * Fetches and persists the push token, but only if permission has already
 * been granted — this never prompts. Safe to call on every launch/login;
 * it's a no-op until the user has said yes via the "enable notifications"
 * screen (or the OS permission was already granted in an earlier session).
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') return null;

  await ensureAndroidChannel();
  return syncPushToken(userId);
}

/** The device's Expo push token can rotate while the app is running; re-sync it when it does. */
export function subscribeToPushTokenRefresh(userId: string): () => void {
  const subscription = Notifications.addPushTokenListener(() => {
    void syncPushToken(userId);
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
    default:
      return null;
  }
}

/** Fires when the user taps a notification while the app is running. */
export function subscribeToNotificationOpened(onOpen: (path: string) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const path = resolveNotificationPath(response.notification.request.content.data);
    if (path) onOpen(path);
  });
  return () => subscription.remove();
}

/** Whether the current app launch was a cold start triggered by tapping a notification. */
export async function getInitialNotificationPath(): Promise<string | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;
  return resolveNotificationPath(response.notification.request.content.data);
}
