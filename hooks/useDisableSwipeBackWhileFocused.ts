import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useNavigation } from 'expo-router';

/**
 * Disables the native-stack swipe-back gesture for as long as any text input
 * on the screen is focused, re-enabling it on blur.
 *
 * Android has a known crash where the edge-swipe gesture pops the screen
 * while the IME's focus-search is still walking the shadow tree for the
 * focused input, hitting a stale view tag
 * (`facebook::react::findShadowNodeByTagRecursively`, surfaced via
 * `react-navigation`'s gesture-enabled unmount path — see
 * https://github.com/react-navigation/react-navigation/issues/10080). Since
 * the gesture is the trigger, not the input itself, blocking it while
 * focused removes the race without affecting the header back button or iOS.
 *
 * Wire the returned handlers to the input(s) most likely to be focused when
 * the user starts a back-swipe:
 * ```tsx
 * const { onFocus, onBlur } = useDisableSwipeBackWhileFocused();
 * <Input onFocus={onFocus} onBlur={onBlur} ... />
 * ```
 */
export function useDisableSwipeBackWhileFocused() {
  const navigation = useNavigation();
  const [focusedCount, setFocusedCount] = useState(0);

  const onFocus = useCallback(() => {
    if (Platform.OS !== 'android') return;
    setFocusedCount((count) => {
      const next = count + 1;
      if (next === 1) navigation.setOptions({ gestureEnabled: false });
      return next;
    });
  }, [navigation]);

  const onBlur = useCallback(() => {
    if (Platform.OS !== 'android') return;
    setFocusedCount((count) => {
      const next = Math.max(0, count - 1);
      if (next === 0) navigation.setOptions({ gestureEnabled: true });
      return next;
    });
  }, [navigation]);

  return { onFocus, onBlur };
}
