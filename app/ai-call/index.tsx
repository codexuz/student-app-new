import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColor } from '@/hooks/useColor';
import { Colors } from '@/theme/colors';

interface CardDef {
  mode: string;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradientStart: string;
  gradientEnd: string;
  accentKey: keyof typeof Colors.light & keyof typeof Colors.dark;
}

const CARDS: CardDef[] = [
  {
    mode: 'default',
    title: 'AI English Tutor',
    subtitle: 'Free Conversation',
    description: 'Practice speaking on any topic with your personal AI tutor.',
    icon: 'sparkles',
    gradientStart: '#007AFF',
    gradientEnd: '#5856D6',
    accentKey: 'primary',
  },
  {
    mode: 'ielts',
    title: 'IELTS Examiner',
    subtitle: 'Official Test Format',
    description:
      'Practice the full IELTS Speaking test — Parts 1, 2, and 3 — with a realistic AI examiner.',
    icon: 'school',
    gradientStart: '#5AC8FA',
    gradientEnd: '#007AFF',
    accentKey: 'teal',
  },
];

export default function AiCallIndexScreen() {
  const background = useColor('background');
  const card = useColor('card');
  const text = useColor('text');
  const textMuted = useColor('textMuted');
  const primary = useColor('primary');
  const teal = useColor('teal');
  const insets = useSafeAreaInsets();

  const accentColors: Record<CardDef['accentKey'], string> = {
    primary,
    teal,
  } as Record<CardDef['accentKey'], string>;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: background, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View
        style={[styles.header, { backgroundColor: card, paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: text }]}>AI Voice Call</Text>
        <View style={{ width: 28 }} />
      </View>

      <Text style={[styles.subtitle, { color: textMuted }]}>
        Choose your AI instructor
      </Text>

      <View style={styles.cards}>
        {CARDS.map((cardDef) => {
          const accent = accentColors[cardDef.accentKey];
          return (
            <TouchableOpacity
              key={cardDef.mode}
              activeOpacity={0.82}
              onPress={() =>
                router.push(`/ai-call/teacher?mode=${cardDef.mode}` as never)
              }
              style={[styles.card, { backgroundColor: card }]}
            >
              <View style={styles.cardTop}>
                <LinearGradient
                  colors={[cardDef.gradientStart, cardDef.gradientEnd]}
                  style={styles.iconWrap}
                >
                  <Ionicons name={cardDef.icon} size={26} color="#fff" />
                </LinearGradient>
                <Ionicons name="chevron-forward" size={20} color={textMuted} />
              </View>

              <Text style={[styles.cardTitle, { color: text }]}>{cardDef.title}</Text>
              <Text style={[styles.cardSubtitle, { color: accent }]}>
                {cardDef.subtitle}
              </Text>
              <Text style={[styles.cardDesc, { color: textMuted }]}>
                {cardDef.description}
              </Text>

              <View style={styles.cardFooter}>
                <View style={[styles.pill, { backgroundColor: accent + '22' }]}>
                  <Ionicons name="time-outline" size={12} color={accent} />
                  <Text style={[styles.pillText, { color: accent }]}>20 min</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  subtitle: {
    fontSize: 15,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  cards: { paddingHorizontal: 16, gap: 14, marginTop: 8 },
  card: {
    borderRadius: 20,
    padding: 18,
    gap: 6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardSubtitle: { fontSize: 13, fontWeight: '600' },
  cardDesc: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pillText: { fontSize: 12, fontWeight: '600' },
});
