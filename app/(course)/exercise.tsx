import { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Award, CheckCircle2, Coins, Flame } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useHaptics } from '@/hooks/useHaptics';
import { ApiError } from '@/lib/api/client';
import type { Exercise } from '@/lib/api/curriculum-types';
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
  rewards: { coins: number; streak: number; bonusPoints: number } | null;
}

export default function ExerciseRunnerScreen() {
  const { exerciseId, lessonId } = useLocalSearchParams<{ exerciseId: string; lessonId: string }>();
  const navigation = useNavigation();
  const feedback = useHaptics(true);
  const primary = useColor('primary');
  const muted = useColor('textMuted');
  const border = useColor('border');
  const green = useColor('green');

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, QuestionAnswerValue>>({});
  const [showResult, setShowResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState<FinishedState | null>(null);

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

  const handleContinue = async () => {
    if (!isLast) {
      setCurrentIndex((i) => i + 1);
      setShowResult(false);
      return;
    }

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
    } catch {
      // Submission failing shouldn't trap the student on a finished exercise —
      // still show their local score, just without server-confirmed rewards.
      setFinished({ correctCount, totalQuestions: questions.length, percentage, rewards: null });
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

  if (!exercise || !currentQuestion) {
    return (
      <View style={styles.centerFill}>
        <Spinner size='lg' />
      </View>
    );
  }

  if (finished) {
    return (
      <View style={styles.centerFill}>
        <View style={[styles.resultBadge, { backgroundColor: `${green}18` }]}>
          <Icon name={CheckCircle2} size={40} color={green} />
        </View>
        <Text variant='heading'>{finished.percentage}%</Text>
        <Text variant='caption'>
          {finished.correctCount}/{finished.totalQuestions} correct
        </Text>

        {finished.rewards && (
          <View style={styles.rewardsRow}>
            <View style={styles.rewardChip}>
              <Icon name={Coins} size={16} color={muted} />
              <Text variant='caption'>+{finished.rewards.coins}</Text>
            </View>
            <View style={styles.rewardChip}>
              <Icon name={Flame} size={16} color={muted} />
              <Text variant='caption'>+{finished.rewards.streak}</Text>
            </View>
            <View style={styles.rewardChip}>
              <Icon name={Award} size={16} color={muted} />
              <Text variant='caption'>+{finished.rewards.bonusPoints}</Text>
            </View>
          </View>
        )}

        <Button
          size='lg'
          style={{ width: '100%', marginTop: SPACING.lg }}
          onPress={() => router.dismissTo({ pathname: '/lesson', params: { lessonId } })}
        >
          Continue
        </Button>
      </View>
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
  resultBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
