import { StyleSheet } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';

import { DuoButton } from '@/components/lesson/duo-button';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';

interface ExerciseFeedbackBannerProps {
  isCorrect: boolean;
  subtitle?: string;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary: () => void;
}

/** Duolingo's bottom feedback panel shown after checking an exercise question. */
export function ExerciseFeedbackBanner({
  isCorrect,
  subtitle,
  primaryLabel,
  primaryDisabled,
  onPrimary,
}: ExerciseFeedbackBannerProps) {
  const emerald = useColor('emerald');
  const red = useColor('red');
  const muted = useColor('textMuted');

  const color = isCorrect ? emerald : red;

  return (
    <Animated.View
      entering={SlideInDown.duration(260)}
      style={[styles.wrapper, { backgroundColor: `${color}1A` }]}
    >
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color }]}>{isCorrect ? 'Correct!' : 'Incorrect'}</Text>
        {!!subtitle && (
          <Text variant='caption' style={{ color: muted }} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>

      <DuoButton color={color} onPress={onPrimary} disabled={primaryDisabled}>
        {primaryLabel}
      </DuoButton>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    padding: SPACING.lg,
    borderTopWidth: 0,
    gap: SPACING.md,
  },
  textBlock: {
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
});
