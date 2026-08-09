import { useColor } from '@/hooks/useColor';
import { BORDER_RADIUS, CORNERS } from '@/theme/globals';
import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
  variant?: 'default' | 'rounded';
}

export const Skeleton = React.memo(function Skeleton({
  width = '100%',
  height = 100,
  style,
  variant = 'default',
}: SkeletonProps) {
  const mutedColor = useColor('muted');
  const opacity = useSharedValue(0.5);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, {
        duration: 1000,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );
  }, []);

  return (
    <Animated.View
      accessibilityElementsHidden
      accessibilityLabel='Loading content'
      style={[
        {
          width: width as any,
          height,
          backgroundColor: mutedColor,
          borderRadius: variant === 'default' ? CORNERS : BORDER_RADIUS,
        },
        animatedStyle,
        style,
      ]}
    />
  );
});
