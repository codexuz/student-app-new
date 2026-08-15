import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useColor } from '@/hooks/useColor';
import { BORDER_RADIUS } from '@/theme/globals';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
  ViewStyle,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 50;

// Smooth slide timing config used for all sheet-position animations.
const SLIDE_CONFIG = { duration: 350, easing: Easing.out(Easing.cubic) };
const SLIDE_CONFIG_CLOSE = { duration: 280, easing: Easing.in(Easing.cubic) };

// Stable reference so the default doesn't recreate a new array (and thus
// invalidate memoized/effect deps below) on every render callers don't pass
// `snapPoints` explicitly.
const DEFAULT_SNAP_POINTS = [0.3, 0.6, 0.9];

type BottomSheetContentProps = {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
  rBottomSheetStyle: any;
  cardColor: string;
  mutedColor: string;
  onHandlePress?: () => void;
};

// Component for the bottom sheet content
// It now includes a ScrollView by default for better form handling.
const BottomSheetContent = ({
  children,
  title,
  style,
  rBottomSheetStyle,
  cardColor,
  mutedColor,
  onHandlePress,
}: BottomSheetContentProps) => {
  return (
    <Animated.View
      style={[
        {
          height: SCREEN_HEIGHT,
          width: '100%',
          position: 'absolute',
          top: SCREEN_HEIGHT,
          backgroundColor: cardColor,
          borderTopLeftRadius: BORDER_RADIUS,
          borderTopRightRadius: BORDER_RADIUS,
        },
        rBottomSheetStyle,
        style,
      ]}
    >
      {/* Handle */}
      <TouchableWithoutFeedback onPress={onHandlePress}>
        <View
          style={{
            width: '100%',
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 64,
              height: 6,
              backgroundColor: mutedColor,
              borderRadius: 999,
            }}
          />
        </View>
      </TouchableWithoutFeedback>

      {/* Title */}
      {title && (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            paddingBottom: 8,
          }}
        >
          <Text variant='title' style={{ textAlign: 'center' }}>
            {title}
          </Text>
        </View>
      )}

      {/* Content now wrapped in a ScrollView */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </Animated.View>
  );
};

type BottomSheetProps = {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
  enableBackdropDismiss?: boolean;
  title?: string;
  style?: ViewStyle;
  disablePanGesture?: boolean;
};

export function BottomSheet({
  isVisible,
  onClose,
  children,
  snapPoints = DEFAULT_SNAP_POINTS,
  enableBackdropDismiss = true,
  title,
  style,
  disablePanGesture = false,
}: BottomSheetProps) {
  const cardColor = useColor('card');
  const mutedColor = useColor('muted');
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();

  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });
  const opacity = useSharedValue(0);
  const currentSnapIndex = useSharedValue(0);
  // Shared value to hold keyboard height for use in worklets
  const keyboardHeightSV = useSharedValue(0);

  const snapPointsHeights = useMemo(
    () => snapPoints.map((point) => -SCREEN_HEIGHT * point),
    [snapPoints]
  );
  const defaultHeight = snapPointsHeights[0];

  const [modalVisible, setModalVisible] = React.useState(false);

  // Mount the (still off-screen) Modal the instant we're asked to show it —
  // derived directly from props during render rather than an effect, since
  // there's nothing async to wait for here. Closing is the opposite: the
  // Modal stays mounted until the slide-out animation finishes, so that one
  // stays an effect-driven, `runOnJS`-deferred update below.
  if (isVisible && !modalVisible) {
    setModalVisible(true);
  }

  // Effect to trigger the open/close animation whenever visibility changes.
  useEffect(() => {
    if (isVisible) {
      translateY.value = withTiming(defaultHeight, SLIDE_CONFIG);
      opacity.value = withTiming(1, { duration: 300 });
      currentSnapIndex.value = 0;
    } else {
      translateY.value = withTiming(0, SLIDE_CONFIG_CLOSE);
      opacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(setModalVisible)(false);
        }
      });
    }
  }, [isVisible, defaultHeight, translateY, opacity, currentSnapIndex]);

  // Function to animate the sheet to a specific destination
  const scrollTo = useCallback(
    (destination: number) => {
      'worklet';
      // eslint-disable-next-line react-hooks/immutability
      translateY.value = withTiming(destination, SLIDE_CONFIG);
    },
    [translateY]
  );

  // --- START: NEW KEYBOARD HANDLING LOGIC ---
  useEffect(() => {
    // Update the shared value whenever keyboardHeight changes
    keyboardHeightSV.value = keyboardHeight;

    // Only adjust position if the sheet is currently visible
    if (isVisible) {
      const currentSnapHeight = snapPointsHeights[currentSnapIndex.value];
      let destination: number;

      if (isKeyboardVisible) {
        // Keyboard is open, move sheet up by keyboard height
        destination = currentSnapHeight - keyboardHeight;
      } else {
        // Keyboard is closed, return to original snap point
        destination = currentSnapHeight;
      }
      scrollTo(destination);
    }
  }, [keyboardHeight, isKeyboardVisible, isVisible, currentSnapIndex.value, keyboardHeightSV, scrollTo, snapPointsHeights]);
  // --- END: NEW KEYBOARD HANDLING LOGIC ---

  const findClosestSnapPoint = (currentY: number) => {
    'worklet';
    // Adjust the currentY by the keyboard height to find the original snap point
    const adjustedY = currentY + keyboardHeightSV.value;

    let closest = snapPointsHeights[0];
    let minDistance = Math.abs(adjustedY - closest);
    let closestIndex = 0;

    for (let i = 0; i < snapPointsHeights.length; i++) {
      const snapPoint = snapPointsHeights[i];
      const distance = Math.abs(adjustedY - snapPoint);
      if (distance < minDistance) {
        minDistance = distance;
        closest = snapPoint;
        closestIndex = i;
      }
    }
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value, mutated via `.value` outside React's render cycle by design.
    currentSnapIndex.value = closestIndex;
    return closest;
  };

  const handlePress = () => {
    const nextIndex = (currentSnapIndex.value + 1) % snapPointsHeights.length;
    // eslint-disable-next-line react-hooks/immutability
    currentSnapIndex.value = nextIndex;
    const destination = snapPointsHeights[nextIndex] - keyboardHeightSV.value;
    scrollTo(destination);
  };

  const animateClose = () => {
    'worklet';
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = withTiming(0, SLIDE_CONFIG_CLOSE);
    // eslint-disable-next-line react-hooks/immutability
    opacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  };

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      const newY = context.value.y + event.translationY;
      if (newY <= 0 && newY >= MAX_TRANSLATE_Y) {
        // eslint-disable-next-line react-hooks/immutability
        translateY.value = newY;
      }
    })
    .onEnd((event) => {
      const currentY = translateY.value;
      const velocity = event.velocityY;

      if (velocity > 500 && currentY > -SCREEN_HEIGHT * 0.2) {
        animateClose();
        return;
      }

      // Find the closest original snap point
      const closestSnapPoint = findClosestSnapPoint(currentY);
      // Calculate the final destination, accounting for the keyboard height
      const finalDestination = closestSnapPoint - keyboardHeightSV.value;
      scrollTo(finalDestination);
    });

  const rBottomSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const rBackdropStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const handleBackdropPress = () => {
    if (enableBackdropDismiss) {
      animateClose();
    }
  };

  return (
    <Modal
      visible={modalVisible}
      transparent
      statusBarTranslucent
      animationType='none'
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View
          style={[
            { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)' },
            rBackdropStyle,
          ]}
        >
          <TouchableWithoutFeedback onPress={handleBackdropPress}>
            <Animated.View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>

          {disablePanGesture ? (
            <BottomSheetContent
              title={title}
              style={style}
              rBottomSheetStyle={rBottomSheetStyle}
              cardColor={cardColor}
              mutedColor={mutedColor}
              onHandlePress={() => runOnJS(handlePress)()}
            >
              {children}
            </BottomSheetContent>
          ) : (
            <GestureDetector gesture={gesture}>
              <BottomSheetContent
                title={title}
                style={style}
                rBottomSheetStyle={rBottomSheetStyle}
                cardColor={cardColor}
                mutedColor={mutedColor}
                onHandlePress={() => runOnJS(handlePress)()}
              >
                {children}
              </BottomSheetContent>
            </GestureDetector>
          )}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// Hook for managing bottom sheet state
export function useBottomSheet() {
  const [isVisible, setIsVisible] = React.useState(false);

  const open = React.useCallback(() => {
    setIsVisible(true);
  }, []);

  const close = React.useCallback(() => {
    setIsVisible(false);
  }, []);

  const toggle = React.useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  return {
    isVisible,
    open,
    close,
    toggle,
  };
}
