import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronRight, RotateCcw } from 'lucide-react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { ApiError } from '@/lib/api/client';
import type { SpeakingTask } from '@/lib/api/curriculum-types';
import { getSpeakingByLesson } from '@/lib/api/speaking';
import { SPACING } from '@/theme/globals';

const GRADIENT_LOCATIONS: [number, number] = [0, 0.4];

type TaskDestination = '/speaking' | '/pronunciation';

function SpeakingCard({
  task,
  groupLabel,
  onPress,
}: {
  task: SpeakingTask;
  groupLabel: string;
  onPress: () => void;
}) {
  const green = useColor('green');
  const muted = useColor('textMuted');
  const border = useColor('border');
  const secondary = useColor('secondary');
  const primary = useColor('primary');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <Card style={{elevation: 0}}>
        <View style={styles.row}>
          {task.isSubmitted ? (
            <View style={[styles.statusCircle, { backgroundColor: `${green}1A`, borderColor: 'transparent' }]}>
              <Icon name={Check} size={20} color={green} />
            </View>
          ) : (
            <View style={[styles.statusCircle, { borderColor: border }]} />
          )}

          <View style={{ flex: 1, gap: 4 }}>
            <Text variant='body' style={{ fontWeight: '700' }} numberOfLines={2}>
              {task.title}
            </Text>
            <View style={[styles.badge, { backgroundColor: secondary, alignSelf: 'flex-start' }]}>
              <Text style={[styles.badgeText, { color: primary }]}>{groupLabel}</Text>
            </View>
          </View>

          <Icon name={ChevronRight} size={20} color={muted} />
        </View>
      </Card>
    </Pressable>
  );
}

function SpeakingGroup({
  title,
  tasks,
  onPress,
}: {
  title: string;
  tasks: SpeakingTask[];
  onPress: (task: SpeakingTask) => void;
}) {
  const muted = useColor('textMuted');

  if (tasks.length === 0) return null;

  const completedCount = tasks.filter((t) => t.isSubmitted).length;

  return (
    <View style={styles.group}>
      <Text variant='caption' style={{ color: muted }}>
        {completedCount}/{tasks.length} completed
      </Text>

      {tasks.map((task) => (
        <SpeakingCard key={task.id} task={task} groupLabel={title} onPress={() => onPress(task)} />
      ))}
    </View>
  );
}

function RetakeTaskSheet({
  task,
  onConfirm,
  onCancel,
}: {
  task: SpeakingTask | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const primary = useColor('primary');
  const secondary = useColor('secondary');
  const muted = useColor('textMuted');

  return (
    <BottomSheet isVisible={!!task} onClose={onCancel} snapPoints={[0.45]}>
      <View style={{ alignItems: 'center', gap: SPACING.xs, paddingTop: SPACING.xs }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: secondary,
          }}
        >
          <Icon name={RotateCcw} size={26} color={primary} />
        </View>

        <Text variant='subtitle' style={{ fontWeight: '700', textAlign: 'center', marginTop: SPACING.sm }}>
          Retake this task?
        </Text>
        <Text variant='caption' style={{ color: muted, textAlign: 'center' }}>
          {task ? `You've already submitted "${task.title}". Retaking it will let you try again.` : ''}
        </Text>

        <View style={{ width: '100%', gap: SPACING.sm, marginTop: SPACING.md }}>
          <Button onPress={onConfirm} style={{ alignSelf: 'stretch' }}>
            Retake Task
          </Button>
          <Button variant='secondary' onPress={onCancel} style={{ alignSelf: 'stretch' }}>
            Cancel
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

export default function SpeakingListScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const background = useColor('background');
  const secondary = useColor('secondary');
  const [speaking, setSpeaking] = useState<SpeakingTask[]>([]);
  const [pronunciation, setPronunciation] = useState<SpeakingTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retakeTarget, setRetakeTarget] = useState<{ task: SpeakingTask; destination: TaskDestination } | null>(
    null
  );

  useEffect(() => {
    if (!lessonId) return;
    let isMounted = true;

    Promise.all([getSpeakingByLesson(lessonId, 'speaking'), getSpeakingByLesson(lessonId, 'pronunciation')])
      .then(([speakingTasks, pronunciationTasks]) => {
        if (!isMounted) return;
        setSpeaking(speakingTasks);
        setPronunciation(pronunciationTasks);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load speaking tasks.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [lessonId]);

  if (error) {
    return (
      <View style={styles.page}>
        <LinearGradient colors={[secondary, background]} locations={GRADIENT_LOCATIONS} style={StyleSheet.absoluteFill} />
        <View style={styles.centerFill}>
          <Text variant='caption' style={{ textAlign: 'center' }}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.page}>
        <LinearGradient colors={[secondary, background]} locations={GRADIENT_LOCATIONS} style={StyleSheet.absoluteFill} />
        <View style={styles.centerFill}>
          <Spinner size='lg' />
        </View>
      </View>
    );
  }

  const openTask = (destination: TaskDestination, task: SpeakingTask) => {
    router.push({
      pathname: destination,
      params: {
        speakingId: task.id,
        lessonId,
        // A completed speaking task already carries its graded submission —
        // pass it along so the screen can show the result instead of an empty composer.
        ...(destination === '/speaking' && task.submissionDetails
          ? { submission: JSON.stringify(task.submissionDetails) }
          : {}),
      },
    });
  };

  return (
    <View style={styles.page}>
      <LinearGradient colors={[secondary, background]} locations={GRADIENT_LOCATIONS} style={StyleSheet.absoluteFill} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <SpeakingGroup
          title='Speaking'
          tasks={speaking}
          onPress={(task) => openTask('/speaking', task)}
        />
        <SpeakingGroup
          title='Pronunciation'
          tasks={pronunciation}
          onPress={(task) =>
            task.isSubmitted
              ? setRetakeTarget({ task, destination: '/pronunciation' })
              : openTask('/pronunciation', task)
          }
        />
      </ScrollView>

      <RetakeTaskSheet
        task={retakeTarget?.task ?? null}
        onConfirm={() => {
          const target = retakeTarget;
          setRetakeTarget(null);
          if (target) openTask(target.destination, target.task);
        }}
        onCancel={() => setRetakeTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    gap: SPACING.lg,
    padding: SPACING.lg,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  pressed: {
    opacity: 0.75,
  },
  group: {
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});
