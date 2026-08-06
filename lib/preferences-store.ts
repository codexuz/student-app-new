import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_KEY = 'preferences.soundEnabled';
const HAPTICS_KEY = 'preferences.hapticsEnabled';

export interface Preferences {
  sound: boolean;
  haptics: boolean;
}

const DEFAULTS: Preferences = { sound: true, haptics: true };

/**
 * App-wide feedback preferences (sound effects, haptics) — same external-store
 * shape as `lib/api/session.ts`: a module-level store outside React so
 * anything can read or flip it (a settings switch, `useHaptics`, a sound
 * hook), kept in sync via `useSyncExternalStore` in `PreferencesProvider`.
 */
type State = Preferences | 'pending';

let state: State = 'pending';
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToPreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPreferencesSnapshot(): State {
  return state;
}

/** Reads a stored boolean flag, falling back to `fallback` if unset or malformed. */
async function readFlag(key: string, fallback: boolean): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw) === true;
  } catch {
    return fallback;
  }
}

export async function hydratePreferences(): Promise<void> {
  const [sound, haptics] = await Promise.all([
    readFlag(SOUND_KEY, DEFAULTS.sound),
    readFlag(HAPTICS_KEY, DEFAULTS.haptics),
  ]);
  state = { sound, haptics };
  emit();
}

export async function setSoundEnabled(enabled: boolean): Promise<void> {
  state = { sound: enabled, haptics: state === 'pending' ? DEFAULTS.haptics : state.haptics };
  emit();
  await AsyncStorage.setItem(SOUND_KEY, JSON.stringify(enabled));
}

export async function setHapticsEnabled(enabled: boolean): Promise<void> {
  state = { sound: state === 'pending' ? DEFAULTS.sound : state.sound, haptics: enabled };
  emit();
  await AsyncStorage.setItem(HAPTICS_KEY, JSON.stringify(enabled));
}

/** Synchronous best-effort read for call sites outside React (e.g. `triggerHaptic`). Defaults to enabled until hydration finishes. */
export function isHapticsEnabledNow(): boolean {
  return state === 'pending' ? DEFAULTS.haptics : state.haptics;
}

void hydratePreferences();
