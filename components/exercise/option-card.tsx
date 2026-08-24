import { Pressable, StyleSheet } from 'react-native';
import { Check, X } from 'lucide-react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { CORNERS, SPACING } from '@/theme/globals';

interface OptionCardProps {
  label: string;
  isCorrectOption: boolean;
  isSelected: boolean;
  showResult: boolean;
  onPress: () => void;
}

/** A single Duolingo-style selectable option — used by multiple-choice and listen-and-choose. */
export function OptionCard({ label, isCorrectOption, isSelected, showResult, onPress }: OptionCardProps) {
  const card = useColor('card');
  const border = useColor('border');
  const primary = useColor('primary');
  const primaryForeground = useColor('primaryForeground');
  const green = useColor('green');
  const red = useColor('red');

  const scale = useSharedValue(1);
  const revealCorrect = showResult && isCorrectOption;
  const revealWrong = showResult && isSelected && !isCorrectOption;

  const backgroundColor = revealCorrect
    ? `${green}1F`
    : revealWrong
      ? `${red}1F`
      : isSelected
        ? `${primary}18`
        : card;
  const borderColor = revealCorrect ? green : revealWrong ? red : isSelected ? primary : border;

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    if (showResult) return;
    scale.value = withTiming(0.97, { duration: 80, easing: Easing.out(Easing.quad) });
  };

  const handlePressOut = () => {
    if (showResult) return;
    scale.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) });
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={showResult}>
      <Animated.View style={[styles.option, { backgroundColor, borderColor }, animatedStyle]}>
        <Text
          variant='body'
          style={[
            { flex: 1, fontWeight: '600' },
            (revealCorrect || isSelected) && { color: revealCorrect ? green : primary },
            revealWrong && { color: red },
          ]}
        >
          {label}
        </Text>

        {(revealCorrect || revealWrong) && (
          <View style={[styles.resultBadge, { backgroundColor: revealCorrect ? green : red }]}>
            <Icon name={revealCorrect ? Check : X} size={14} color={primaryForeground} strokeWidth={3} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: CORNERS,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  resultBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
