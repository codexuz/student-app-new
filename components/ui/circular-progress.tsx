import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';

interface CircularProgressProps {
  /** 0-100. */
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** Center content — defaults to the percentage as text. Pass `null` to render just the ring. */
  children?: React.ReactNode;
}

export const CircularProgress = memo(function CircularProgress({
  percentage,
  size = 40,
  strokeWidth = 4,
  color,
  trackColor,
  children,
}: CircularProgressProps) {
  const primary = useColor('primary');
  const border = useColor('border');
  const resolvedColor = color ?? primary;
  const resolvedTrackColor = trackColor ?? border;

  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={resolvedTrackColor}
          strokeWidth={strokeWidth}
          fill='none'
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={resolvedColor}
          strokeWidth={strokeWidth}
          fill='none'
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap='round'
          // Start from the top rather than the 3-o'clock default.
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children === undefined ? (
        <Text style={{ fontSize: size * 0.28, fontWeight: '700' }}>{Math.round(clamped)}</Text>
      ) : (
        children
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
