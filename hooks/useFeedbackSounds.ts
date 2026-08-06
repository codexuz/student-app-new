import { useSoundEffect } from '@/hooks/useSoundEffect';

/** The two feedback chimes exercises play on a right/wrong answer. */
export function useFeedbackSounds() {
  const playCorrect = useSoundEffect(require('@/assets/sounds/correct.mp3'));
  const playWrong = useSoundEffect(require('@/assets/sounds/wrong.mp3'));

  return { playCorrect, playWrong };
}
