import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useHaptics } from '@/hooks/useHaptics';
import { CORNERS } from '@/theme/globals';

const DEPTH = 5;
const FACE_HEIGHT = 54;

/** Darkens a `#rrggbb` hex color by `amount` (0–1) — used for the button's shadow slab. */
function darken(hex: string, amount: number): string {
  const n = hex.replace('#', '');
  const channel = (start: number) => {
    const value = Math.round(parseInt(n.slice(start, start + 2), 16) * (1 - amount));
    return Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

interface DuoButtonProps {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  color: string;
  textColor?: string;
  style?: ViewStyle;
}

/**
 * Duolingo's "keycap" button: a flat face sitting atop a darker shadow slab,
 * which the face slides down to meet on press-in — rather than a flat
 * opacity/scale change.
 */
export function DuoButton({ children, onPress, disabled, color, textColor = '#fff', style }: DuoButtonProps) {
  const feedback = useHaptics(true);
  const translateY = useSharedValue(0);

  const shadowColor = darken(color, 0.22);
  const faceColor = disabled ? darken(color, 0.35) : color;

  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const handlePressIn = () => {
    if (disabled) return;
    // Reanimated shared value — not React state, the compiler doesn't need to track it.
    translateY.value = withTiming(DEPTH, { duration: 80, easing: Easing.out(Easing.quad) });
  };

  const handlePressOut = () => {
    if (disabled) return;
    translateY.value = withTiming(0, { duration: 140, easing: Easing.out(Easing.quad) });
  };

  const handlePress = () => {
    if (disabled) return;
    feedback('impact-medium');
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[styles.wrapper, style]}
      accessibilityRole='button'
    >
      <View style={[styles.shadow, { backgroundColor: shadowColor }]} />
      <Animated.View style={[styles.face, { backgroundColor: faceColor }, faceStyle]}>
        <Text style={[styles.label, { color: textColor }]}>{children}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: FACE_HEIGHT + DEPTH,
  },
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: FACE_HEIGHT,
    borderRadius: CORNERS,
  },
  face: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: FACE_HEIGHT,
    borderRadius: CORNERS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
