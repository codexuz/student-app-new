import { useColor } from '@/hooks/useColor';
import { useHaptics } from '@/hooks/useHaptics';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  activeColor?: string;
  inactiveColor?: string;
  disabled?: boolean;
  haptic?: boolean;
}

export function Switch({
  value,
  onValueChange,
  activeColor,
  inactiveColor,
  disabled = false,
  haptic = true,
}: SwitchProps) {
  const primary = useColor('primary');
  const border = useColor('border');
  const feedback = useHaptics(haptic);
  const [animatedValue] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue]);

  const thumbPosition = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveColor ?? border, activeColor ?? primary],
  });

  const handlePress = () => {
    feedback(value ? 'toggle-off' : 'toggle-on');
    onValueChange(!value);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
      accessibilityRole='switch'
      accessibilityState={{ checked: value, disabled }}
    >
      <Animated.View style={[styles.track, { backgroundColor }]} pointerEvents='none'>
        <Animated.View
          style={[styles.thumb, { transform: [{ translateX: thumbPosition }] }]}
          pointerEvents='none'
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    padding: 2,
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});
