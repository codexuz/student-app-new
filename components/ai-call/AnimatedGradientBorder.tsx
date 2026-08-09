import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/**
 * Gradient-ring "premium border" — a fixed-width gradient band painted
 * behind an inset content surface. The gradient's start/end points slowly
 * sweep back and forth so the ring shimmers without ever needing an
 * oversized rotating layer (which clips unreliably on RN/Android).
 */
export function AnimatedGradientBorder({
  colors,
  borderRadius = 20,
  borderWidth = 1.5,
  duration = 4000,
  children,
  style,
}: {
  colors: [string, string, ...string[]];
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [duration, t]);

  const animatedProps = useAnimatedProps(() => ({
    start: { x: t.value, y: 0 },
    end: { x: 1 - t.value, y: 1 },
  }));

  return (
    <View style={[{ borderRadius, padding: borderWidth }, style]}>
      <AnimatedLinearGradient
        colors={colors}
        animatedProps={animatedProps}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
      />
      <View
        style={[
          styles.inset,
          {
            borderRadius: Math.max(borderRadius - borderWidth, 0),
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inset: { overflow: 'hidden' },
});
