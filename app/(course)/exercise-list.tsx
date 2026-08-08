import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { ApiError } from '@/lib/api/client';
import type { ExerciseCategory, ExerciseSummary } from '@/lib/api/curriculum-types';
import { getExercisesByType } from '@/lib/api/exercises';
import { SPACING } from '@/theme/globals';

export default function ExerciseListScreen() {
  const { lessonId, type } = useLocalSearchParams<{ lessonId: string; type: ExerciseCategory }>();
  const green = useColor('green');
  const muted = useColor('textMuted');
  const [exercises, setExercises] = useState<ExerciseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId || !type) return;
    let isMounted = true;

    getExercisesByType(type, lessonId)
      .then((data) => {
        if (isMounted) setExercises(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load exercises.');
      });

    return () => {
      isMounted = false;
    };
  }, [lessonId, type]);

  if (error) {
    return (
      <View style={styles.centerFill}>
        <Text variant='caption' style={{ textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (!exercises) {
    return (
      <View style={styles.centerFill}>
        <Spinner size='lg' />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      {exercises.map((exercise) => (
        <Pressable
          key={exercise.id}
          onPress={() =>
            type === 'writing'
              ? router.push({
                  pathname: '/writing',
                  params: { exerciseId: exercise.id, lessonId },
                })
              : router.push({
                  pathname: '/exercise',
                  params: { exerciseId: exercise.id, lessonId },
                })
          }
        >
          <Card>
            <View style={styles.row}>
              {exercise.isCompleted ? (
                <View style={[styles.statusCircle, { backgroundColor: green }]}>
                  <Icon name={Check} size={16} color='#fff' />
                </View>
              ) : (
                <View style={[styles.statusCircle, { backgroundColor: `${green}18` }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text variant='body' style={{ fontWeight: '600' }} numberOfLines={1}>
                  {exercise.title}
                </Text>
                {exercise.isCompleted && (
                  <Text variant='caption' style={{ color: muted }}>
                    Score: {exercise.score ?? 0}%
                  </Text>
                )}
              </View>
              <Icon name={ChevronRight} size={20} color={muted} />
            </View>
          </Card>
        </Pressable>
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
    paddingHorizontal: SPACING.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
