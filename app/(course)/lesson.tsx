import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Coffee,
  Headphones,
  Mic,
  Pencil,
  ScrollText,
  SpellCheck,
} from 'lucide-react-native';
import type { LucideProps } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { ApiError } from '@/lib/api/client';
import type { ExerciseCategory, LessonFull } from '@/lib/api/curriculum-types';
import { getLessonFull } from '@/lib/api/lessons';
import { withOpacity } from '@/theme/colors';
import { SPACING } from '@/theme/globals';

// Fades from `primary` to `background` within the top ~32% of the screen,
// then holds flat at `background` — a colored header wash rather than a
// hard-edged block.
const GRADIENT_LOCATIONS: [number, number] = [0, 0.32];
const NODE_COLUMN_WIDTH = 72;
const NODE_SIZE_ACTIVE = 62;
const NODE_SIZE = 50;
const CONNECTOR_HEIGHT = 26;

interface Step {
  key: string;
  icon: React.ComponentType<LucideProps>;
  label: string;
  subtitle: string;
  onPress: () => void;
}

function StepNode({ step, isFirst }: { step: Step; isFirst: boolean }) {
  const primary = useColor('primary');
  const border = useColor('border');
  const muted = useColor('textMuted');
  const text = useColor('text');
  const glowSize = (isFirst ? NODE_SIZE_ACTIVE : NODE_SIZE) + 16;

  return (
    <View>
      {!isFirst && (
        <View style={styles.connectorColumn}>
          <View style={[styles.connectorLine, { backgroundColor: border }]} />
        </View>
      )}
      <Pressable onPress={step.onPress} style={styles.stepRow}>
        <View style={styles.nodeColumn}>
          <View
            style={[
              styles.nodeGlow,
              {
                width: glowSize,
                height: glowSize,
                borderRadius: glowSize / 2,
                backgroundColor: withOpacity(primary, isFirst ? 0.18 : 0.12),
              },
            ]}
          />
          <View
            style={[
              isFirst ? styles.nodeCircleActive : styles.nodeCircle,
              { backgroundColor: primary },
            ]}
          >
            <Icon name={step.icon} size={isFirst ? 26 : 20} color='#fff' />
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.stepLabel,
              { color: isFirst ? text : muted, fontWeight: isFirst ? '800' : '600' },
            ]}
          >
            {step.label}
          </Text>
          <Text variant='caption' style={{ marginTop: 2 }}>
            {step.subtitle}
          </Text>
        </View>

        <Icon name={ChevronRight} size={18} color={muted} />
      </Pressable>
    </View>
  );
}

const CATEGORY_META: Record<ExerciseCategory, { label: string; icon: React.ComponentType<LucideProps> }> = {
  grammar: { label: 'Grammar', icon: SpellCheck },
  reading: { label: 'Reading', icon: ScrollText },
  listening: { label: 'Listening', icon: Headphones },
  writing: { label: 'Writing', icon: Pencil },
};

export default function LessonHubScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const insets = useSafeAreaInsets();
  const muted = useColor('textMuted');
  const background = useColor('background');
  const primary = useColor('primary');
  const [lesson, setLesson] = useState<LessonFull | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) return;
    let isMounted = true;

    getLessonFull(lessonId)
      .then((data) => {
        if (isMounted) setLesson(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load this lesson.');
      });

    return () => {
      isMounted = false;
    };
  }, [lessonId]);

  const exercisesByCategory = useMemo(() => {
    const counts: Record<ExerciseCategory, number> = { grammar: 0, reading: 0, listening: 0, writing: 0 };
    for (const exercise of lesson?.exercises ?? []) {
      counts[exercise.exercise_type] += 1;
    }
    return counts;
  }, [lesson]);

  if (error) {
    return (
      <View style={[styles.centerFill, { backgroundColor: background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackButtonLight />
        <Text variant='subtitle' style={{ textAlign: 'center' }}>
          Couldn&apos;t load this lesson
        </Text>
        <Text variant='caption' style={{ textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={[styles.centerFill, { backgroundColor: background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackButtonLight />
        <Spinner size='lg' />
      </View>
    );
  }

  const hasTheory = lesson.theory.length > 0;
  const hasSpeaking = lesson.speaking.length > 0;
  const categoryEntries = (Object.keys(CATEGORY_META) as ExerciseCategory[]).filter(
    (category) => exercisesByCategory[category] > 0
  );
  const isEmpty = !hasTheory && !hasSpeaking && categoryEntries.length === 0;

  const steps: Step[] = [];
  if (hasTheory) {
    steps.push({
      key: 'theory',
      icon: BookOpen,
      label: 'Theory',
      subtitle: `${lesson.theory.length} lesson${lesson.theory.length === 1 ? '' : 's'}`,
      onPress: () => router.push({ pathname: '/theory', params: { lessonId } }),
    });
  }
  for (const category of categoryEntries) {
    const meta = CATEGORY_META[category];
    steps.push({
      key: category,
      icon: meta.icon,
      label: meta.label,
      subtitle: `${exercisesByCategory[category]} exercise${exercisesByCategory[category] === 1 ? '' : 's'}`,
      onPress: () => router.push({ pathname: '/exercise-list', params: { lessonId, type: category } }),
    });
  }
  if (hasSpeaking) {
    steps.push({
      key: 'speaking',
      icon: Mic,
      label: 'Speaking',
      subtitle: `${lesson.speaking.length} task${lesson.speaking.length === 1 ? '' : 's'}`,
      onPress: () => router.push({ pathname: '/speaking-list', params: { lessonId } }),
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: background }}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={[primary, background]}
        locations={GRADIENT_LOCATIONS}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.headerRow, { paddingTop: insets.top + SPACING.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
          <Icon name={ArrowLeft} size={20} color='#fff' />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode='tail'>
          {lesson.title}
        </Text>
        <View style={{ width: 40, height: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <Icon name={Coffee} size={40} color={muted} />
            <Text variant='subtitle' style={{ textAlign: 'center' }}>
              Nothing assigned yet
            </Text>
            <Text variant='caption' style={{ textAlign: 'center' }}>
              This lesson has no tasks to complete right now.
            </Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {steps.map((step, index) => (
              <StepNode key={step.key} step={step} isFirst={index === 0} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function BackButtonLight() {
  const insets = useSafeAreaInsets();
  const text = useColor('text');
  const card = useColor('card');
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={8}
      style={[styles.backButtonLight, { top: insets.top + SPACING.sm, backgroundColor: card }]}
    >
      <Icon name={ArrowLeft} size={20} color={text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  backButtonLight: {
    position: 'absolute',
    left: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginHorizontal: SPACING.sm,
  },

  // Timeline
  timeline: {
    paddingHorizontal: SPACING.lg,
  },
  connectorColumn: {
    width: NODE_COLUMN_WIDTH,
    height: CONNECTOR_HEIGHT,
    alignItems: 'center',
  },
  connectorLine: {
    width: 2,
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  nodeColumn: {
    width: NODE_COLUMN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeGlow: {
    position: 'absolute',
  },
  nodeCircleActive: {
    width: NODE_SIZE_ACTIVE,
    height: NODE_SIZE_ACTIVE,
    borderRadius: NODE_SIZE_ACTIVE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1055F8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  nodeCircle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1055F8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  stepLabel: {
    fontSize: 17,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingTop: 80,
  },
});
