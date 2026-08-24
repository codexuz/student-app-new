import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Mic, Square } from 'lucide-react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';

const SIZE = 92;

interface MicButtonProps {
  isRecording: boolean;
  processing?: boolean;
  disabled?: boolean;
  /** Press-and-hold mode (short phrases) — provide alongside `onPressOut`. */
  onPressIn?: () => void;
  onPressOut?: () => void;
  /** Tap-to-toggle mode (longer freeform answers) — provide instead of the hold pair. */
  onPress?: () => void;
}

/** Mic button with Duolingo's pulsing-ring recording state — press-and-hold or tap-to-toggle. */
export function MicButton({ isRecording, processing, disabled, onPressIn, onPressOut, onPress }: MicButtonProps) {
  const primary = useColor('primary');
  const red = useColor('red');
  const primaryForeground = useColor('primaryForeground');
  const isTapMode = !!onPress;

  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      ringScale.value = 1;
      ringOpacity.value = 0.45;
      ringScale.value = withRepeat(withTiming(1.7, { duration: 1100, easing: Easing.out(Easing.ease) }), -1, false);
      ringOpacity.value = withRepeat(withTiming(0, { duration: 1100, easing: Easing.out(Easing.ease) }), -1, false);
    } else {
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      ringScale.value = withTiming(1, { duration: 150 });
      ringOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [isRecording, ringScale, ringOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const color = isRecording ? red : primary;

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.ring, { backgroundColor: color }, ringStyle]} />
      <Pressable
        onPress={isTapMode && !disabled ? onPress : undefined}
        onPressIn={!isTapMode && !disabled ? onPressIn : undefined}
        onPressOut={!isTapMode && !disabled ? onPressOut : undefined}
        disabled={disabled}
        style={[styles.button, { backgroundColor: color, opacity: disabled && !processing ? 0.5 : 1 }]}
        accessibilityRole='button'
        accessibilityLabel={isTapMode ? 'Tap to record' : 'Hold to record'}
      >
        {processing ? (
          <Spinner size='sm' color={primaryForeground} />
        ) : (
          <Icon name={isTapMode && isRecording ? Square : Mic} size={32} color={primaryForeground} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: SIZE + 40,
    height: SIZE + 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 0.2,
  },
});
