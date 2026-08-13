import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import {
  Blocks,
  ChevronRight,
  Ear,
  Inbox,
  Info,
  Languages,
  ListChecks,
  MessageSquare,
  RotateCcw,
  Shuffle,
  SquarePen,
  ToggleLeft,
  Volume2,
  Wrench,
} from 'lucide-react-native';
import type { LucideProps } from 'lucide-react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CircularProgress } from '@/components/ui/circular-progress';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { ApiError } from '@/lib/api/client';
import type { ExerciseCategory, ExerciseSummary, Question, QuestionType } from '@/lib/api/curriculum-types';
import { getExercisesByType } from '@/lib/api/exercises';
import { SPACING } from '@/theme/globals';

const CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  grammar: 'Grammar',
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
};

const QUESTION_TYPE_META: Record<QuestionType, { label: string; icon: React.ComponentType<LucideProps> }> = {
  multiple_choice: { label: 'Multiple Choice', icon: ListChecks },
  fill_in_the_blank: { label: 'Gap Filling', icon: SquarePen },
  true_false: { label: 'True / False', icon: ToggleLeft },
  short_answer: { label: 'Short Answer', icon: MessageSquare },
  matching: { label: 'Matching', icon: Shuffle },
  sentence_build: { label: 'Sentence Build', icon: Blocks },
  translation: { label: 'Translation', icon: Languages },
  dictation: { label: 'Dictation', icon: Ear },
  listen_and_choose: { label: 'Listen & Choose', icon: Volume2 },
  sentence_surgery: { label: 'Sentence Surgery', icon: Wrench },
};

const GRADIENT_LOCATIONS: [number, number] = [0, 0.4];

interface QuestionTypeSummary {
  type: QuestionType;
  lengthLabel: string;
}

/**
 * One entry per distinct question type in an exercise, each carrying a
 * type-appropriate "length": gap count for gap-filling and pair count for
 * matching (both count sub-items rather than questions), plain question
 * count for every other type.
 */
function summarizeQuestionTypes(questions: Question[] | undefined): QuestionTypeSummary[] {
  if (!questions || questions.length === 0) return [];

  const order: QuestionType[] = [];
  const groups = new Map<QuestionType, Question[]>();
  for (const question of questions) {
    if (!groups.has(question.question_type)) {
      groups.set(question.question_type, []);
      order.push(question.question_type);
    }
    groups.get(question.question_type)!.push(question);
  }

  return order.map((type) => {
    const group = groups.get(type)!;
    if (type === 'fill_in_the_blank') {
      const blanks = group.reduce((sum, q) => sum + (q.gap_filling?.length ?? 0), 0);
      return { type, lengthLabel: `${blanks} blank${blanks === 1 ? '' : 's'}` };
    }
    if (type === 'matching') {
      const pairs = group.reduce((sum, q) => sum + (q.matching_pairs?.length ?? 0), 0);
      return { type, lengthLabel: `${pairs} pair${pairs === 1 ? '' : 's'}` };
    }
    return { type, lengthLabel: `${group.length} question${group.length === 1 ? '' : 's'}` };
  });
}

function scoreColor(score: number, colors: { emerald: string; orange: string; red: string }) {
  if (score >= 80) return colors.emerald;
  if (score >= 50) return colors.orange;
  return colors.red;
}

function QuestionTypeChip({ type, lengthLabel }: QuestionTypeSummary) {
  const primary = useColor('primary');
  const secondary = useColor('secondary');
  const meta = QUESTION_TYPE_META[type];
  if (!meta) return null;

  return (
    <View style={[styles.chip, { backgroundColor: secondary }]}>
      <Icon name={meta.icon} size={12} color={primary} strokeWidth={2.2} />
      <Text style={[styles.chipText, { color: primary }]}>
        {meta.label} · {lengthLabel}
      </Text>
    </View>
  );
}

function ExerciseCard({ exercise, onPress }: { exercise: ExerciseSummary; onPress: () => void }) {
  const emerald = useColor('emerald');
  const orange = useColor('orange');
  const red = useColor('red');
  const muted = useColor('textMuted');
  const border = useColor('border');

  const typeSummaries = useMemo(() => summarizeQuestionTypes(exercise.questions), [exercise.questions]);
  const totalQuestions = exercise.questions?.length ?? 0;
  const score = exercise.score ?? 0;
  const resultColor = scoreColor(score, { emerald, orange, red });

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <Card style={styles.card}>
        <View style={styles.row}>
          {exercise.isCompleted ? (
            <CircularProgress percentage={score} size={36} strokeWidth={3.5} color={resultColor}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: resultColor }}>{score}%</Text>
            </CircularProgress>
          ) : (
            <View style={[styles.statusCircle, { borderColor: border }]} />
          )}

          <View style={{ flex: 1, gap: 2 }}>
            <Text variant='body' style={{ fontWeight: '700' }} numberOfLines={2}>
              {exercise.title}
            </Text>
            {totalQuestions > 0 && (
              <Text variant='caption' style={{ color: muted, fontSize: 12 }}>
                {totalQuestions} question{totalQuestions === 1 ? '' : 's'}
              </Text>
            )}
          </View>

          <Icon name={ChevronRight} size={20} color={muted} />
        </View>

        {typeSummaries.length > 0 && (
          <View style={styles.chipRow}>
            {typeSummaries.map((summary) => (
              <QuestionTypeChip key={summary.type} {...summary} />
            ))}
          </View>
        )}
      </Card>
    </Pressable>
  );
}

function RetakeExerciseSheet({
  exercise,
  onConfirm,
  onCancel,
}: {
  exercise: ExerciseSummary | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const primary = useColor('primary');
  const secondary = useColor('secondary');
  const muted = useColor('textMuted');

  return (
    <BottomSheet isVisible={!!exercise} onClose={onCancel} snapPoints={[0.45]}>
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
          Retake this exercise?
        </Text>
        <Text variant='caption' style={{ color: muted, textAlign: 'center' }}>
          {exercise ? `You've already completed "${exercise.title}". Retaking it will let you try again.` : ''}
        </Text>

        <View style={{ width: '100%', gap: SPACING.sm, marginTop: SPACING.md }}>
          <Button onPress={onConfirm} style={{ alignSelf: 'stretch' }}>
            Retake Exercise
          </Button>
          <Button variant='secondary' onPress={onCancel} style={{ alignSelf: 'stretch' }}>
            Cancel
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

function CompletionInfoSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const muted = useColor('textMuted');

  return (
    <BottomSheet isVisible={visible} onClose={onClose} snapPoints={[0.35]} title='Completion rule'>
      <Text variant='body' style={{ textAlign: 'center' }}>
        An exercise only counts as completed once you score{' '}
        <Text variant='body' style={{ fontWeight: '700' }}>
          60% or higher
        </Text>
        . Anything below that stays marked as incomplete — retake it to raise your score.
      </Text>
      <Text variant='caption' style={{ color: muted, textAlign: 'center', marginTop: SPACING.sm }}>
        Tap an exercise anytime to try again.
      </Text>
    </BottomSheet>
  );
}

export default function ExerciseListScreen() {
  const { lessonId, type } = useLocalSearchParams<{ lessonId: string; type: ExerciseCategory }>();
  const navigation = useNavigation();
  const muted = useColor('textMuted');
  const background = useColor('background');
  const secondary = useColor('secondary');
  const [exercises, setExercises] = useState<ExerciseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retakeTarget, setRetakeTarget] = useState<ExerciseSummary | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (!type) return;
    navigation.setOptions({
      title: `${CATEGORY_LABEL[type]} Exercises`,
      headerRight: () => (
        <Pressable onPress={() => setShowInfo(true)} hitSlop={8}>
          <Icon name={Info} size={20} color={muted} />
        </Pressable>
      ),
    });
  }, [type, navigation, muted]);

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
      <View style={styles.page}>
        <LinearGradient colors={[secondary, background]} locations={GRADIENT_LOCATIONS} style={StyleSheet.absoluteFill} />
        <View style={styles.centerFill}>
          <Text variant='caption' style={{ textAlign: 'center' }}>
            {error}
          </Text>
        </View>
        <CompletionInfoSheet visible={showInfo} onClose={() => setShowInfo(false)} />
      </View>
    );
  }

  if (!exercises) {
    return (
      <View style={styles.page}>
        <LinearGradient colors={[secondary, background]} locations={GRADIENT_LOCATIONS} style={StyleSheet.absoluteFill} />
        <View style={styles.centerFill}>
          <Spinner size='lg' />
        </View>
        <CompletionInfoSheet visible={showInfo} onClose={() => setShowInfo(false)} />
      </View>
    );
  }

  if (exercises.length === 0) {
    return (
      <View style={styles.page}>
        <LinearGradient colors={[secondary, background]} locations={GRADIENT_LOCATIONS} style={StyleSheet.absoluteFill} />
        <View style={styles.centerFill}>
          <Icon name={Inbox} size={40} color={muted} />
          <Text variant='subtitle' style={{ textAlign: 'center', marginTop: SPACING.sm }}>
            No exercises yet
          </Text>
          <Text variant='caption' style={{ textAlign: 'center' }}>
            Check back once this section has exercises assigned.
          </Text>
        </View>
        <CompletionInfoSheet visible={showInfo} onClose={() => setShowInfo(false)} />
      </View>
    );
  }

  const completedCount = exercises.filter((e) => e.isCompleted).length;

  const openExercise = (exercise: ExerciseSummary) => {
    if (type === 'writing') {
      router.push({
        pathname: '/writing',
        params: {
          exerciseId: exercise.id,
          lessonId,
          // A completed writing exercise already carries its graded submission —
          // pass it along so the screen can show the result instead of an empty composer.
          ...(exercise.submission ? { submission: JSON.stringify(exercise.submission) } : {}),
        },
      });
    } else {
      router.push({ pathname: '/exercise', params: { exerciseId: exercise.id, lessonId } });
    }
  };

  return (
    <View style={styles.page}>
      <LinearGradient colors={[secondary, background]} locations={GRADIENT_LOCATIONS} style={StyleSheet.absoluteFill} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <Text variant='caption' style={{ color: muted }}>
          {completedCount}/{exercises.length} completed
        </Text>

        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onPress={() => {
              // Writing has its own graded-result screen — no need to confirm before
              // showing it, unlike retaking an auto-scored quiz.
              if (exercise.isCompleted && type !== 'writing') {
                setRetakeTarget(exercise);
              } else {
                openExercise(exercise);
              }
            }}
          />
        ))}
      </ScrollView>

      <RetakeExerciseSheet
        exercise={retakeTarget}
        onConfirm={() => {
          const exercise = retakeTarget;
          setRetakeTarget(null);
          if (exercise) openExercise(exercise);
        }}
        onCancel={() => setRetakeTarget(null)}
      />

      <CompletionInfoSheet visible={showInfo} onClose={() => setShowInfo(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    gap: SPACING.sm,
    padding: SPACING.lg,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.xl,
  },
  pressed: {
    opacity: 0.75,
  },
  card: {
    gap: SPACING.xs,
    padding: SPACING.sm + 2,
    elevation: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
