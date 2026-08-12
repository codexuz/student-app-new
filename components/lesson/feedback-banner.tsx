import { Pressable, StyleSheet } from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';

import { DuoButton } from '@/components/lesson/duo-button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';

export type FeedbackTier = 'great' | 'good' | 'retry';

interface FeedbackBannerProps {
  tier: FeedbackTier;
  title: string;
  subtitle?: string;
  /** What the student actually said — shown under the subtitle, e.g. on a low score. */
  transcript?: string;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary: () => void;
  onRetry?: () => void;
}

/** Duolingo's bottom feedback panel — slides up once mounted, colored per outcome. */
export function FeedbackBanner({
  tier,
  title,
  subtitle,
  transcript,
  primaryLabel,
  primaryDisabled,
  onPrimary,
  onRetry,
}: FeedbackBannerProps) {
  const emerald = useColor('emerald');
  const orange = useColor('orange');
  const red = useColor('red');
  const muted = useColor('textMuted');

  const tierColor = tier === 'great' ? emerald : tier === 'good' ? orange : red;

  return (
    <Animated.View
      entering={SlideInDown.duration(260)}
      style={[styles.wrapper, { backgroundColor: `${tierColor}1A` }]}
    >
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: tierColor }]}>{title}</Text>
        {!!subtitle && (
          <Text variant='caption' style={{ color: muted }} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
        {!!transcript && (
          <Text variant='caption' style={{ color: muted, fontStyle: 'italic' }} numberOfLines={2}>
            You said: &quot;{transcript}&quot;
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        {onRetry && (
          <Pressable
            onPress={onRetry}
            style={[styles.retryButton, { borderColor: tierColor }]}
            hitSlop={8}
            accessibilityRole='button'
            accessibilityLabel='Retry'
          >
            <Icon name={RotateCcw} size={18} color={tierColor} />
          </Pressable>
        )}
        <DuoButton color={tierColor} onPress={onPrimary} disabled={primaryDisabled} style={{ flex: 1 }}>
          {primaryLabel}
        </DuoButton>
      </View>
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  retryButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
