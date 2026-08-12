import { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';

import { AudioHeroPlayer } from '@/components/lesson/audio-hero-player';
import { Result } from '@/components/lesson/result';
import { Button } from '@/components/ui/button';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useHaptics } from '@/hooks/useHaptics';
import { ApiError } from '@/lib/api/client';
import type { Exercise, HomeworkRewards } from '@/lib/api/curriculum-types';
import { getExercise } from '@/lib/api/exercises';
import { submitHomeworkSection } from '@/lib/api/homework';
import { SPACING } from '@/theme/globals';
import { emptyAnswerFor, gradeQuestion, isAnswerComplete } from '@/components/exercise/grading';
import { QuestionRenderer } from '@/components/exercise/question-renderer';
import type { QuestionAnswerValue } from '@/components/exercise/answer-types';

interface FinishedState {
  correctCount: number;
  totalQuestions: number;
  percentage: number;
  rewards: HomeworkRewards | null;
}

export default function ExerciseRunnerScreen() {
  const { exerciseId, lessonId } = useLocalSearchParams<{ exerciseId: string; lessonId: string }>();
  const navigation = useNavigation();
  const feedback = useHaptics(true);
  const primary = useColor('primary');
  const muted = useColor('textMuted');
  const border = useColor('border');

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, QuestionAnswerValue>>({});
  const [showResult, setShowResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState<FinishedState | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const questions = useMemo(
    () => [...(exercise?.questions ?? [])].sort((a, b) => a.order_number - b.order_number),
    [exercise]
  );

  useEffect(() => {
    if (!exerciseId) return;
    let isMounted = true;

    getExercise(exerciseId)
      .then((data) => {
        if (!isMounted) return;
        setExercise(data);
        const initial: Record<number, QuestionAnswerValue> = {};
        [...data.questions]
          .sort((a, b) => a.order_number - b.order_number)
          .forEach((question, index) => {
            initial[index] = emptyAnswerFor(question);
          });
        setAnswers(initial);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load this exercise.');
      });

    return () => {
      isMounted = false;
    };
  }, [exerciseId]);

  useEffect(() => {
    if (exercise) navigation.setOptions({ title: exercise.title });
  }, [exercise, navigation]);

  useEffect(() => {
    navigation.setOptions({ headerShown: !finished });
  }, [finished, navigation]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentIndex];
  const canCheck = currentQuestion && currentAnswer ? isAnswerComplete(currentQuestion, currentAnswer) : false;
  const isLast = currentIndex === questions.length - 1;

  const handleCheck = () => {
    if (!currentQuestion || !currentAnswer) return;
    const result = gradeQuestion(currentQuestion, currentAnswer);
    feedback(result.isCorrect ? 'success' : 'error');
    setShowResult(true);
  };

  const submitResults = async () => {
    // Score every question up front so the submission reflects the whole
    // attempt, not just the last one checked.
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
    const earnedPoints = questions.reduce(
      (sum, q, index) => sum + gradeQuestion(q, answers[index]).points,
      0
    );
    const correctCount = questions.filter((q, index) => gradeQuestion(q, answers[index]).isCorrect).length;
    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitHomeworkSection({
        lesson_id: lessonId,
        exercise_id: exerciseId,
        section: exercise!.exercise_type,
        percentage,
        answers,
      });
      setFinished({
        correctCount,
        totalQuestions: questions.length,
        percentage: result.section.score ?? percentage,
        rewards: result.rewards,
      });
    } catch (err) {
      // Submission failing shouldn't trap the student on a finished exercise —
      // still show their local score, but flag that it wasn't saved so they
      // know to retry (otherwise this exercise silently never shows as
      // completed back on the exercise list).
      console.error('Failed to submit exercise results:', err);
      setFinished({ correctCount, totalQuestions: questions.length, percentage, rewards: null });
      setSubmitError(
        err instanceof ApiError ? err.message : 'Could not save your progress. Check your connection and retry.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (!isLast) {
      setCurrentIndex((i) => i + 1);
      setShowResult(false);
      return;
    }
    submitResults();
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

  if (!exercise || !currentQuestion) {
    return (
      <View style={styles.centerFill}>
        <Spinner size='lg' />
      </View>
    );
  }

  if (finished) {
    return (
      <Result
        percentage={finished.percentage}
        correctCount={finished.correctCount}
        totalQuestions={finished.totalQuestions}
        rewards={finished.rewards}
        submitError={submitError}
        submitting={submitting}
        onRetry={submitResults}
        onContinue={() => router.dismissTo({ pathname: '/lesson', params: { lessonId } })}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.progressTrack, { backgroundColor: border }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: primary, width: `${((currentIndex + 1) / questions.length) * 100}%` },
          ]}
        />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        {!!exercise.audio_url && <AudioHeroPlayer key={exercise.id} url={exercise.audio_url} />}

        <Text variant='caption' style={{ color: muted }}>
          Question {currentIndex + 1} of {questions.length}
        </Text>
        <Text variant='title'>{currentQuestion.question_text}</Text>

        {currentAnswer && (
          <QuestionRenderer
            question={currentQuestion}
            value={currentAnswer}
            onChange={(value) => setAnswers((prev) => ({ ...prev, [currentIndex]: value }))}
            showResult={showResult}
          />
        )}
      </ScrollView>

      <View style={{...styles.footer, borderTopColor: border}}>
        {showResult ? (
          <Button size='lg' style={{ width: '100%' }} onPress={handleContinue} disabled={submitting}>
            {submitting ? 'Submitting…' : isLast ? 'See Results' : 'Continue'}
          </Button>
        ) : (
          <Button size='lg' style={{ width: '100%' }} onPress={handleCheck} disabled={!canCheck}>
            Check Answer
          </Button>
        )}
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
  progressTrack: {
    height: 4,
    width: '100%',
  },
  progressFill: {
    height: 4,
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
