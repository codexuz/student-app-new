import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Bot, Phone, LucideProps } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { SPACING } from '@/theme/globals';

const CARD_HEIGHT = 76;
const CARD_RADIUS = 14;

export interface AiPracticeCardData {
  key: string;
  title: string;
  description: string;
  buttonLabel?: string;
  icon?: React.ComponentType<LucideProps>;
  colors: [string, string];
  glowColor: string;
  onPress: () => void;
}

type AiPracticeCardProps = Omit<AiPracticeCardData, 'key'>;

export function AiPracticeCard({
  title,
  description,
  buttonLabel = 'Start',
  icon = Bot,
  colors,
  glowColor,
  onPress,
}: AiPracticeCardProps) {
  const glow = useSharedValue(0.35);

  useEffect(() => {
    glow.value = withRepeat(
      withTiming(0.75, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [glow]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowColor: glowColor,
    shadowOpacity: glow.value,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  }));

  return (
    <Animated.View style={[styles.glowWrap, glowStyle]}>
      <Pressable onPress={onPress} style={styles.pressable}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.iconBadge}>
            <Icon name={icon} size={20} color='#FFFFFF' />
          </View>

          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.description} numberOfLines={1}>
              {description}
            </Text>
          </View>

          <View style={styles.button}>
            <Text style={[styles.buttonText, { color: glowColor }]}>{buttonLabel}</Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

interface AiPracticeCarouselProps {
  cards: AiPracticeCardData[];
  intervalMs?: number;
  resumeDelayMs?: number;
}

export function AiPracticeCarousel({
  cards,
  intervalMs = 3500,
  resumeDelayMs = 4000,
}: AiPracticeCarouselProps) {
  const scrollRef = useRef<Animated.ScrollView>(null);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loopCards = cards.length > 1 ? [...cards, cards[0]] : cards;

  const advance = useCallback(() => {
    const rawNext = indexRef.current + 1;
    indexRef.current = rawNext;
    scrollRef.current?.scrollTo({ y: rawNext * CARD_HEIGHT, animated: true });

    // When we've scrolled onto the appended duplicate of the first card,
    // silently snap back to the real first card so the next scrollTo can
    // move forward again instead of animating backwards.
    if (rawNext === cards.length) {
      setTimeout(() => {
        indexRef.current = 0;
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 350);
    }
  }, [cards.length]);

  const startAutoplay = useCallback(() => {
    if (cards.length <= 1) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(advance, intervalMs);
  }, [advance, cards.length, intervalMs]);

  const pauseAutoplay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(startAutoplay, resumeDelayMs);
  }, [resumeDelayMs, startAutoplay]);

  useEffect(() => {
    startAutoplay();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, [startAutoplay]);

  const handleMomentumEnd = useCallback(
    (e: any) => {
      const y = e.nativeEvent.contentOffset.y;
      const next = Math.round(y / CARD_HEIGHT);
      if (next < cards.length) {
        indexRef.current = next;
      }
    },
    [cards.length]
  );

  return (
    <View style={styles.carouselRow}>
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{ height: CARD_HEIGHT * loopCards.length }}
        showsVerticalScrollIndicator={false}
        pagingEnabled
        snapToInterval={CARD_HEIGHT}
        decelerationRate='fast'
        scrollEventThrottle={16}
        onScrollBeginDrag={pauseAutoplay}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {loopCards.map(({ key, ...card }, i) => (
          <View key={`${key}-${i}`} style={{ height: CARD_HEIGHT }}>
            <AiPracticeCard
              {...card}
              onPress={() => {
                pauseAutoplay();
                card.onPress();
              }}
            />
          </View>
        ))}
      </Animated.ScrollView>
    </View>
  );
}

export function buildDefaultAiCards(opts: {
  onChatPress: () => void;
  onCallPress: () => void;
}): AiPracticeCardData[] {
  return [
    {
      key: 'ai-chat',
      title: 'Chat with IMPULSE AI',
      description: 'Talk with AI to improve your English skills',
      icon: Bot,
      colors: ['#f63582', '#c90741'],
      glowColor: '#f63582',
      onPress: opts.onChatPress,
    },
    {
      key: 'ai-call',
      title: 'Practice with AI Call',
      description: 'Have a live phone call with your AI tutor',
      buttonLabel: 'Call',
      icon: Phone,
      colors: ['#645fff', 'rgb(76, 10, 190)'],
      glowColor: '#645fff',
      onPress: opts.onCallPress,
    },
  ];
}

const styles = StyleSheet.create({
  carouselRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  scroll: {
    height: CARD_HEIGHT,
    overflow: 'hidden',
  },
  glowWrap: {
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
  },
  pressable: {
    flex: 1,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: CARD_RADIUS,
    paddingHorizontal: SPACING.sm,
    overflow: 'hidden',
    elevation: 0,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  content: {
    flex: 1,
    gap: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  description: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    lineHeight: 14,
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 12,
  },
});
