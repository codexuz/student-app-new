import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, GraduationCap, Lock } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { CircularProgress } from '@/components/ui/circular-progress';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { ApiError } from '@/lib/api/client';
import type { RoadmapLesson, RoadmapUnit } from '@/lib/api/curriculum-types';
import { getRoadmap } from '@/lib/api/roadmap';
import { SPACING } from '@/theme/globals';

function LessonRow({ lesson }: { lesson: RoadmapLesson }) {
  const border = useColor('border');
  const green = useColor('green');
  const muted = useColor('textMuted');
  const locked = lesson.status === 'locked';

  return (
    <Pressable
      disabled={locked}
      onPress={() =>
        router.push({ pathname: '/lesson', params: { lessonId: lesson.lesson_id } })
      }
      style={[styles.lessonRow, { borderColor: border }, locked && styles.lessonRowLocked]}
    >
      {lesson.is_completed ? (
        <View style={[styles.statusCircle, { backgroundColor: green }]}>
          <Icon name={Check} size={16} color='#fff' />
        </View>
      ) : locked ? (
        <View style={[styles.statusCircle, { backgroundColor: border }]}>
          <Icon name={Lock} size={14} color={muted} />
        </View>
      ) : (
        <CircularProgress percentage={lesson.task_percentage} size={32} strokeWidth={3} />
      )}

      <View style={{ flex: 1 }}>
        <Text variant='body' style={{ fontWeight: '600' }} numberOfLines={1}>
          {lesson.lesson_title}
        </Text>
        <Text variant='caption' style={{ color: muted }}>
          {locked ? 'Locked' : `${lesson.completed_tasks}/${lesson.total_tasks} tasks`}
        </Text>
      </View>
    </Pressable>
  );
}

function UnitSection({ unit }: { unit: RoadmapUnit }) {
  const muted = useColor('textMuted');

  return (
    <Card style={styles.unitCard}>
      <View style={styles.unitHeader}>
        <View style={{ flex: 1 }}>
          <Text variant='caption' style={{ color: muted }}>
            Unit {unit.unit_order}
          </Text>
          <Text variant='title' numberOfLines={1}>
            {unit.unit_title}
          </Text>
        </View>
        <CircularProgress percentage={unit.percentage} size={44} strokeWidth={4} />
      </View>

      <View style={styles.lessonList}>
        {unit.lessons.map((lesson) => (
          <LessonRow key={lesson.lesson_id} lesson={lesson} />
        ))}
      </View>
    </Card>
  );
}

export default function RoadmapScreen() {
  const { courseId, groupId } = useLocalSearchParams<{ courseId: string; groupId: string }>();
  const muted = useColor('textMuted');
  const [units, setUnits] = useState<RoadmapUnit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId || !groupId) return;
    let isMounted = true;

    getRoadmap(courseId, groupId)
      .then((data) => {
        if (isMounted) setUnits(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load your roadmap.');
      });

    return () => {
      isMounted = false;
    };
  }, [courseId, groupId]);

  if (error) {
    return (
      <View style={styles.centerFill}>
        <Icon name={GraduationCap} size={40} color={muted} />
        <Text variant='subtitle' style={{ textAlign: 'center' }}>
          Couldn&apos;t load your roadmap
        </Text>
        <Text variant='caption' style={{ textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (!units) {
    return (
      <View style={styles.centerFill}>
        <Spinner size='lg' />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      {units.map((unit) => (
        <UnitSection key={unit.unit_id} unit={unit} />
      ))}
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
  unitCard: {
    gap: SPACING.md,
  },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  lessonList: {
    gap: SPACING.xs,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  lessonRowLocked: {
    opacity: 0.5,
  },
  statusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
