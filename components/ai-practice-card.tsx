import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bot, Phone, LucideProps } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
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
  return (
    <View style={[styles.glowWrap, { backgroundColor: colors[0] }]}>
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
    </View>
  );
}

interface AiPracticeCarouselProps {
  cards: AiPracticeCardData[];
  intervalMs?: number;
  resumeDelayMs?: number;
}

export function AiPracticeCarousel({
  cards,
}: AiPracticeCarouselProps) {
  const cardData = cards.find((c) => c.key === 'ai-call') ?? cards[cards.length - 1];
  if (!cardData) return null;

  const { key, ...card } = cardData;

  return (
    <View style={{ height: CARD_HEIGHT }}>
      <AiPracticeCard key={key} {...card} />
    </View>
  );
}

export function buildDefaultAiCards(opts: {
  onCallPress: () => void;
}): AiPracticeCardData[] {
  return [
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
  glowWrap: {
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
    elevation: 0,
    shadowColor: '#645fff',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
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
