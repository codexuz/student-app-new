import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Play } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { SPACING } from '@/theme/globals';

const CARD_RADIUS = 14;
const LIGHT_BLUE: [string, string] = ['#458efc', '#0654e6'];
const BADGE_SIZE = 34;

interface CourseProgressCardProps {
  stepsCompleted: number;
  totalSteps: number;
  courseName: string;
  percentage: number;
  buttonLabel?: string;
  onPress: () => void;
}

export function CourseProgressCard({
  stepsCompleted,
  totalSteps,
  courseName,
  percentage,
  buttonLabel = 'Resume',
  onPress,
}: CourseProgressCardProps) {
  const clamped = Math.max(0, Math.min(100, percentage));

  const glow = useSharedValue(0.35);

  useEffect(() => {
    glow.value = withRepeat(
      withTiming(0.75, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [glow]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowColor: LIGHT_BLUE[0],
    shadowOpacity: glow.value,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  }));

  return (
    <Animated.View style={[styles.glowWrap, glowStyle]}>
      <Pressable onPress={onPress}>
        <LinearGradient
          colors={LIGHT_BLUE}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.card}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>
                {courseName}
              </Text>
              <Text style={styles.subtitle}>
                {stepsCompleted}/{totalSteps} lessons completed
              </Text>
            </View>

            <Pressable onPress={onPress} style={styles.button} hitSlop={8}>
              <Icon name={Play} size={12} color='#FFFFFF' />
              <Text style={styles.buttonText}>{buttonLabel}</Text>
            </Pressable>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.track}>
              <View style={styles.fillClip}>
                <View style={[styles.fill, { width: `${clamped}%` }]} />
              </View>
              <View style={[styles.percentBadgeWrap, { left: `${clamped}%` }]}>
                <View style={styles.percentBadge}>
                  <Text style={styles.percentText}>{Math.round(clamped)}%</Text>
                </View>
                <View style={styles.percentHandle} />
              </View>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glowWrap: {
    borderRadius: CARD_RADIUS,
  },
  card: {
    borderRadius: CARD_RADIUS,
    padding: SPACING.md,
    gap: 4,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
  },
  bottomRow: {
    marginTop: SPACING.md + BADGE_SIZE * 0.6,
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
  },
  fillClip: {
    height: '100%',
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  percentBadgeWrap: {
    position: 'absolute',
    bottom: '100%',
    marginLeft: -BADGE_SIZE / 2,
    width: BADGE_SIZE,
    alignItems: 'center',
  },
  percentBadge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE * 0.6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentHandle: {
    width: 10,
    height: 10,
    marginTop: -5,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  percentText: {
    color: '#3D7DF0',
    fontSize: 10,
    fontWeight: '700',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0B1220',
    borderRadius: 999,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
