import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

/**
 * Gradient-ring "premium border" — a fixed-width gradient band painted
 * behind an inset content surface.
 */
export function AnimatedGradientBorder({
  colors,
  borderRadius = 20,
  borderWidth = 1.5,
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
  return (
    <View style={[{ borderRadius, padding: borderWidth }, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
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
