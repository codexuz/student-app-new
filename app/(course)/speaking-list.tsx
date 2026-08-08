import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronRight, Mic, Waves } from 'lucide-react-native';

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

function SpeakingGroup({
  title,
  icon,
  tasks,
  onPress,
}: {
  title: string;
  icon: typeof Mic;
  tasks: SpeakingTask[];
  onPress: (task: SpeakingTask) => void;
}) {
  const green = useColor('green');
  const muted = useColor('textMuted');
  const accent = useColor('accent');
  const primary = useColor('primary');

  if (tasks.length === 0) return null;

  return (
    <View style={styles.group}>
      <Text variant='subtitle'>{title}</Text>
      {tasks.map((task) => (
        <Pressable key={task.id} onPress={() => onPress(task)}>
          <Card>
            <View style={styles.row}>
              <View style={[styles.iconBadge, { backgroundColor: accent }]}>
                <Icon name={icon} size={20} color={primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant='body' style={{ fontWeight: '600' }} numberOfLines={1}>
                  {task.title}
                </Text>
                {task.isSubmitted && (
                  <Text variant='caption' style={{ color: muted }}>
                    Submitted
                  </Text>
                )}
              </View>
              {task.isSubmitted ? (
                <Icon name={Check} size={20} color={green} />
              ) : (
                <Icon name={ChevronRight} size={20} color={muted} />
              )}
            </View>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

export default function SpeakingListScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const [speaking, setSpeaking] = useState<SpeakingTask[]>([]);
  const [pronunciation, setPronunciation] = useState<SpeakingTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      <View style={styles.centerFill}>
        <Text variant='caption' style={{ textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <Spinner size='lg' />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      <SpeakingGroup
        title='Speaking'
        icon={Mic}
        tasks={speaking}
        onPress={(task) =>
          router.push({ pathname: '/speaking', params: { speakingId: task.id, lessonId } })
        }
      />
      <SpeakingGroup
        title='Pronunciation'
        icon={Waves}
        tasks={pronunciation}
        onPress={(task) =>
          !task.isSubmitted &&
          router.push({ pathname: '/pronunciation', params: { speakingId: task.id, lessonId } })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  group: {
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
