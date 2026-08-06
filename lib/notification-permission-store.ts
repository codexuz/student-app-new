import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import type { PermissionStatus } from 'expo-notifications';

import { getNotificationPermissionStatus } from '@/lib/notifications';

const DISMISSED_KEY = 'notifications.promptDismissed';

export interface NotificationPermissionState {
  status: PermissionStatus;
  /** The user tapped "Not now" on the in-app prompt — don't show it again. */
  dismissed: boolean;
}

/**
 * Same external-store shape as `lib/api/session.ts`: a module-level store the
 * root layout (for routing) and the permission screen (for the request
 * button) both read reactively via `useSyncExternalStore`, kept outside React
 * because the OS permission state isn't really React's to own.
 */
type State = NotificationPermissionState | 'pending';

let state: State = 'pending';
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): State {
  return state;
}

async function readStatus(): Promise<PermissionStatus> {
  // Simulators and web can't register for push at all — treat that as
  // resolved rather than something to keep prompting for.
  if (!Device.isDevice) return 'denied' as PermissionStatus;
  return getNotificationPermissionStatus();
}

export async function hydrate(): Promise<void> {
  const [status, dismissed] = await Promise.all([
    readStatus(),
    AsyncStorage.getItem(DISMISSED_KEY).then((value) => value === 'true'),
  ]);
  state = { status, dismissed };
  emit();
}

/** Re-reads the OS status — e.g. after the request dialog closes, or after returning from Settings. */
export async function refreshPermissionStatus(): Promise<void> {
  const status = await readStatus();
  state = { dismissed: state === 'pending' ? false : state.dismissed, status };
  emit();
}

export async function dismissPrompt(): Promise<void> {
  state = { status: state === 'pending' ? ('undetermined' as PermissionStatus) : state.status, dismissed: true };
  emit();
  await AsyncStorage.setItem(DISMISSED_KEY, 'true');
}

// Kick off hydration as soon as this module is imported — same reasoning as
// `lib/api/session.ts`: start the storage/OS reads immediately rather than
// waiting on a component to mount and ask for them.
void hydrate();
