import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import {
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

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { ApiError } from '@/lib/api/client';
import type { ExerciseCategory, LessonFull } from '@/lib/api/curriculum-types';
import { getLessonFull } from '@/lib/api/lessons';
import { SPACING } from '@/theme/globals';

function TaskCard({
  icon,
  label,
  subtitle,
  onPress,
}: {
  icon: React.ComponentType<LucideProps>;
  label: string;
  subtitle: string;
  onPress: () => void;
}) {
  const accent = useColor('accent');
  const primary = useColor('primary');
  const muted = useColor('textMuted');

  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={styles.cardRow}>
          <View style={[styles.iconBadge, { backgroundColor: accent }]}>
            <Icon name={icon} size={22} color={primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant='body' style={{ fontWeight: '600' }}>
              {label}
            </Text>
            <Text variant='caption' style={{ marginTop: 2 }}>
              {subtitle}
            </Text>
          </View>
          <Icon name={ChevronRight} size={20} color={muted} />
        </View>
      </Card>
    </Pressable>
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
  const navigation = useNavigation();
  const muted = useColor('textMuted');
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

  useEffect(() => {
    if (lesson) navigation.setOptions({ title: lesson.title });
  }, [lesson, navigation]);

  const exercisesByCategory = useMemo(() => {
    const counts: Record<ExerciseCategory, number> = { grammar: 0, reading: 0, listening: 0, writing: 0 };
    for (const exercise of lesson?.exercises ?? []) {
      counts[exercise.exercise_type] += 1;
    }
    return counts;
  }, [lesson]);

  if (error) {
    return (
      <View style={styles.centerFill}>
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
      <View style={styles.centerFill}>
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

  if (isEmpty) {
    return (
      <View style={styles.centerFill}>
        <Icon name={Coffee} size={40} color={muted} />
        <Text variant='subtitle' style={{ textAlign: 'center' }}>
          Nothing assigned yet
        </Text>
        <Text variant='caption' style={{ textAlign: 'center' }}>
          This lesson has no tasks to complete right now.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      {hasTheory && (
        <TaskCard
          icon={BookOpen}
          label='Theory'
          subtitle={`${lesson.theory.length} lesson${lesson.theory.length === 1 ? '' : 's'}`}
          onPress={() => router.push({ pathname: '/theory', params: { lessonId } })}
        />
      )}

      {categoryEntries.map((category) => {
        const meta = CATEGORY_META[category];
        return (
          <TaskCard
            key={category}
            icon={meta.icon}
            label={meta.label}
            subtitle={`${exercisesByCategory[category]} exercise${exercisesByCategory[category] === 1 ? '' : 's'}`}
            onPress={() =>
              router.push({
                pathname: '/exercise-list',
                params: { lessonId, type: category },
              })
            }
          />
        );
      })}

      {hasSpeaking && (
        <TaskCard
          icon={Mic}
          label='Speaking'
          subtitle={`${lesson.speaking.length} task${lesson.speaking.length === 1 ? '' : 's'}`}
          onPress={() => router.push({ pathname: '/speaking-list', params: { lessonId } })}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
