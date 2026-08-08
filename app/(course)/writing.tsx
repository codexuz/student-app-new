import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';

import { Button } from '@/components/ui/button';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { ApiError } from '@/lib/api/client';
import type { Exercise } from '@/lib/api/curriculum-types';
import { getExercise } from '@/lib/api/exercises';
import { submitHomeworkSection } from '@/lib/api/homework';
import { BORDER_RADIUS, SPACING } from '@/theme/globals';

const MIN_WORDS = 50;

function countWords(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

export default function WritingScreen() {
  const { exerciseId, lessonId } = useLocalSearchParams<{ exerciseId: string; lessonId: string }>();
  const navigation = useNavigation();
  const toast = useToast();
  const card = useColor('card');
  const text = useColor('text');
  const muted = useColor('textMuted');

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!exerciseId) return;
    let isMounted = true;

    getExercise(exerciseId)
      .then((data) => {
        if (isMounted) setExercise(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load this task.');
      });

    return () => {
      isMounted = false;
    };
  }, [exerciseId]);

  useEffect(() => {
    if (exercise) navigation.setOptions({ title: exercise.title });
  }, [exercise, navigation]);

  const wordCount = useMemo(() => countWords(draft), [draft]);
  const canSubmit = wordCount >= MIN_WORDS && !submitting && !submitted;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitHomeworkSection({
        lesson_id: lessonId,
        exercise_id: exerciseId,
        section: 'writing',
        answers: { writing: draft },
      });
      setSubmitted(true);
      toast.success('Submitted', 'Your teacher/AI will review it shortly.');
      router.back();
    } catch (err) {
      toast.error('Submission failed', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <View style={styles.centerFill}>
        <Text variant='caption' style={{ textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={styles.centerFill}>
        <Spinner size='lg' />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <Text variant='title'>{exercise.title}</Text>
        {!!exercise.instructions && <Text variant='caption'>{exercise.instructions}</Text>}

        <TextInput
          value={draft}
          onChangeText={setDraft}
          editable={!submitting && !submitted}
          multiline
          textAlignVertical='top'
          placeholder='Write your response…'
          placeholderTextColor={muted}
          style={[styles.input, { backgroundColor: card, color: text }]}
        />

        <Text variant='caption' style={{ color: wordCount >= MIN_WORDS ? muted : undefined }}>
          {wordCount}/{MIN_WORDS} words minimum
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button size='lg' style={{ width: '100%' }} onPress={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Submitting…' : 'Submit'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  container: {
    flexGrow: 1,
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  input: {
    minHeight: 220,
    borderRadius: BORDER_RADIUS,
    padding: SPACING.md,
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
