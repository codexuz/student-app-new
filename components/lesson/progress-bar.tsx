import { StyleSheet } from 'react-native';

import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';

interface LessonProgressBarProps {
  /** 0–1 */
  progress: number;
  color?: string;
}

/** Duolingo's pill-shaped lesson progress bar. */
export function LessonProgressBar({ progress, color }: LessonProgressBarProps) {
  const track = useColor('border');
  const primary = useColor('primary');
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={styles.wrapper}>
      <View style={[styles.track, { backgroundColor: track }]}>
        <View style={[styles.fill, { backgroundColor: color ?? primary, width: `${clamped * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  track: {
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
