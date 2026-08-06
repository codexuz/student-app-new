import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_SEEN_KEY = 'onboarding.seen';

/**
 * Mirrors the `pending` sentinel pattern in `lib/api/session.ts` — `null`
 * means "still reading storage", distinct from a confirmed `false`.
 */
let seenOnboarding: boolean | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToOnboarding(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOnboardingSnapshot(): boolean | null {
  return seenOnboarding;
}

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const seen = (await AsyncStorage.getItem(ONBOARDING_SEEN_KEY)) === 'true';
    seenOnboarding = seen;
    emit();
    return seen;
  } catch {
    seenOnboarding = false;
    emit();
    return false;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  seenOnboarding = true;
  emit();
  try {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
  } catch {
    // Persistence is a convenience — if it fails, the user just sees the
    // carousel again next launch, which is harmless.
  }
}
