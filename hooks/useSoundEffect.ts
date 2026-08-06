import type { AudioSource } from 'expo-audio';
import { useAudioPlayer } from 'expo-audio';
import { useCallback } from 'react';

import { usePreferences } from '@/providers/preferences-provider';

/**
 * Wraps one sound asset in a player gated on the app-wide "Sounds"
 * preference, so any feature can add a sound effect and get that toggle for
 * free instead of re-checking it at every call site:
 *
 * ```tsx
 * const playCorrect = useSoundEffect(require('@/assets/sounds/correct.mp3'));
 * ...
 * onPress={playCorrect}
 * ```
 */
export function useSoundEffect(source: AudioSource) {
  const player = useAudioPlayer(source);
  const { isSoundEnabled } = usePreferences();

  return useCallback(() => {
    if (!isSoundEnabled) return;
    try {
      player.seekTo(0).catch(() => {});
      player.play();
    } catch {
      // Playback is decoration — a not-yet-loaded or torn-down player
      // shouldn't be able to take an onPress handler down with it.
    }
  }, [player, isSoundEnabled]);
}
