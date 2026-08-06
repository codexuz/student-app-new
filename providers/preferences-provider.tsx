import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';

import {
  getPreferencesSnapshot,
  setHapticsEnabled,
  setSoundEnabled,
  subscribeToPreferences,
} from '@/lib/preferences-store';

type PreferencesContextValue = {
  isSoundEnabled: boolean;
  isHapticsEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  toggleSound: () => Promise<void>;
  toggleHaptics: () => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeToPreferences, getPreferencesSnapshot);
  const isSoundEnabled = snapshot === 'pending' ? true : snapshot.sound;
  const isHapticsEnabled = snapshot === 'pending' ? true : snapshot.haptics;

  const toggleSound = useCallback(() => setSoundEnabled(!isSoundEnabled), [isSoundEnabled]);
  const toggleHaptics = useCallback(
    () => setHapticsEnabled(!isHapticsEnabled),
    [isHapticsEnabled]
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      isSoundEnabled,
      isHapticsEnabled,
      setSoundEnabled,
      setHapticsEnabled,
      toggleSound,
      toggleHaptics,
    }),
    [isSoundEnabled, isHapticsEnabled, toggleSound, toggleHaptics]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
