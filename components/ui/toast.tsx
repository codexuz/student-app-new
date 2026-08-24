import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Dimensions, Platform, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AlertCircle, Check, Info, X } from 'lucide-react-native';

import { Text } from '@/components/ui/text';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastProps extends ToastData {
  onDismiss: (id: string) => void;
  index: number;
}

const { width: screenWidth } = Dimensions.get('window');
const DYNAMIC_ISLAND_HEIGHT = 37;
const EXPANDED_HEIGHT = 85;
const TOAST_MARGIN = 8;
const DYNAMIC_ISLAND_WIDTH = 126;
const EXPANDED_WIDTH = screenWidth - 32;

const SPRING_CONFIG = { stiffness: 120, damping: 8 };

const VARIANT_COLORS: Record<ToastVariant, string> = {
  success: '#30D158',
  error: '#FF453A',
  warning: '#FF9F0A',
  info: '#007AFF',
  default: '#8E8E93',
};

const MUTED_TEXT_COLOR = 'rgba(255, 255, 255, 0.75)';

function ToastItem({ id, title, description, variant = 'default', onDismiss, index, action }: ToastProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const translateY = useSharedValue(-150);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);
  const width = useSharedValue(DYNAMIC_ISLAND_WIDTH);
  const height = useSharedValue(DYNAMIC_ISLAND_HEIGHT);
  const borderRadius = useSharedValue(18.5);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    const hasContentToShow = Boolean(title || description || action);

    if (hasContentToShow) {
      width.value = EXPANDED_WIDTH;
      height.value = EXPANDED_HEIGHT;
      borderRadius.value = 20;
      setIsExpanded(true);

      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = 1;
      contentOpacity.value = withDelay(100, withTiming(1, { duration: 300 }));
    } else {
      setIsExpanded(false);
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = 1;
    }
    // Mount-only: this animates the toast in exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const variantColor = VARIANT_COLORS[variant];

  const icon = (() => {
    const iconProps = { size: 16, color: '#FFFFFF' };
    switch (variant) {
      case 'success':
        return <Check {...iconProps} />;
      case 'error':
        return <X {...iconProps} />;
      case 'warning':
        return <AlertCircle {...iconProps} />;
      case 'info':
        return <Info {...iconProps} />;
      default:
        return null;
    }
  })();

  const dismiss = useCallback(() => {
    translateY.value = withTiming(-150, { duration: 300 });
    opacity.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) scheduleOnRN(onDismiss, id);
    });
    scale.value = 1;
  }, [id, onDismiss, opacity, scale, translateY]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      const { translationX, velocityX } = event;

      if (Math.abs(translationX) > screenWidth * 0.25 || Math.abs(velocityX) > 800) {
        translateX.value = withTiming(translationX > 0 ? screenWidth : -screenWidth, {
          duration: 250,
        });
        opacity.value = withTiming(0, { duration: 250 }, (finished) => {
          if (finished) scheduleOnRN(onDismiss, id);
        });
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const getTopPosition = () => {
    const statusBarHeight = Platform.OS === 'ios' ? 59 : 20;
    return statusBarHeight + index * (EXPANDED_HEIGHT + TOAST_MARGIN);
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  const animatedIslandStyle = useAnimatedStyle(() => ({
    width: width.value,
    height: height.value,
    borderRadius: borderRadius.value,
    backgroundColor: variantColor,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const toastStyle: ViewStyle = {
    position: 'absolute',
    top: getTopPosition(),
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 1000 + index,
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[toastStyle, animatedContainerStyle]}>
        <Animated.View style={animatedIslandStyle}>
          {!isExpanded && (
            <View style={{ justifyContent: 'center', alignItems: 'center' }}>{icon}</View>
          )}

          {isExpanded && (
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                },
                animatedContentStyle,
              ]}
            >
              {icon && <View style={{ marginRight: 12 }}>{icon}</View>}

              <View style={{ flex: 1, minWidth: 0 }}>
                {title && (
                  <Text
                    variant='subtitle'
                    style={{
                      color: '#FFFFFF',
                      fontSize: 15,
                      fontWeight: '600',
                      marginBottom: description ? 2 : 0,
                    }}
                    numberOfLines={1}
                    ellipsizeMode='tail'
                  >
                    {title}
                  </Text>
                )}
                {description && (
                  <Text
                    variant='caption'
                    style={{ color: MUTED_TEXT_COLOR, fontSize: 13, fontWeight: '400' }}
                    numberOfLines={2}
                    ellipsizeMode='tail'
                  >
                    {description}
                  </Text>
                )}
              </View>

              {action && (
                <TouchableOpacity
                  onPress={action.onPress}
                  style={{
                    marginLeft: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 12,
                  }}
                >
                  <Text
                    variant='caption'
                    style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={dismiss} style={{ marginLeft: 8, padding: 4, borderRadius: 8 }}>
                <X size={14} color='#FFFFFF' />
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

interface ToastContextType {
  toast: (toast: Omit<ToastData, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 3 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addToast = useCallback(
    (toastData: Omit<ToastData, 'id'>) => {
      const id = Math.random().toString(36).slice(2, 11);
      const newToast: ToastData = { ...toastData, id, duration: toastData.duration ?? 4000 };

      setToasts((prev) => [newToast, ...prev].slice(0, maxToasts));

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => dismissToast(id), newToast.duration);
      }
    },
    [dismissToast, maxToasts]
  );

  const dismissAll = useCallback(() => setToasts([]), []);

  const createVariantToast = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      addToast({ title, description, variant });
    },
    [addToast]
  );

  const contextValue: ToastContextType = {
    toast: addToast,
    success: (title, description) => createVariantToast('success', title, description),
    error: (title, description) => createVariantToast('error', title, description),
    warning: (title, description) => createVariantToast('warning', title, description),
    info: (title, description) => createVariantToast('info', title, description),
    dismiss: dismissToast,
    dismissAll,
  };

  const containerStyle: ViewStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <View style={containerStyle} pointerEvents='box-none'>
        {toasts.map((item, index) => (
          <ToastItem key={item.id} {...item} index={index} onDismiss={dismissToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
