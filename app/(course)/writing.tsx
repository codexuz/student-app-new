import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  Lightbulb,
  Link2,
  MessageSquare,
  PenLine,
  RotateCcw,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DuoButton } from '@/components/lesson/duo-button';
import { FeedbackCard } from '@/components/lesson/feedback-card';
import { AvoidKeyboard } from '@/components/ui/avoid-keyboard';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useSoundEffect } from '@/hooks/useSoundEffect';
import { ApiError } from '@/lib/api/client';
import type { Exercise, ExerciseSubmissionSummary, WritingAssessment } from '@/lib/api/curriculum-types';
import { getExercise } from '@/lib/api/exercises';
import { submitHomeworkSection } from '@/lib/api/homework';
import { BORDER_RADIUS, SPACING } from '@/theme/globals';

const MIN_WORDS = 20;

function countWords(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

function scoreColor(score: number, colors: { emerald: string; orange: string; red: string }) {
  if (score >= 80) return colors.emerald;
  if (score >= 50) return colors.orange;
  return colors.red;
}

function scoreLabel(score: number) {
  if (score >= 80) return { label: 'Excellent!', emoji: '🌟' };
  if (score >= 50) return { label: 'Good effort!', emoji: '👍' };
  return { label: 'Keep practicing', emoji: '🤔' };
}

interface WritingResult {
  score: number;
  assessment: WritingAssessment | null;
}

/** Parses the `submission` route param (a JSON-serialized `ExerciseSubmissionSummary`) set when opening an already-graded writing exercise, so its result and text can seed initial state directly instead of via an effect. */
function parseExistingSubmission(param: string | undefined): { draft: string; result: WritingResult | null } {
  if (!param) return { draft: '', result: null };
  try {
    const parsed: ExerciseSubmissionSummary = JSON.parse(param);
    const draft = typeof parsed.answers?.writing === 'string' ? (parsed.answers.writing as string) : '';
    return {
      draft,
      result: { score: parsed.score ?? 0, assessment: (parsed.answers?.assessment as WritingAssessment | undefined) ?? null },
    };
  } catch {
    return { draft: '', result: null };
  }
}

function WritingResultView({
  result,
  submittedText,
  onContinue,
  onRetake,
}: {
  result: WritingResult;
  submittedText: string;
  onContinue: () => void;
  onRetake: () => void;
}) {
  const muted = useColor('textMuted');
  const emerald = useColor('emerald');
  const orange = useColor('orange');
  const red = useColor('red');
  const primary = useColor('primary');
  const border = useColor('border');
  const insets = useSafeAreaInsets();

  const { assessment, score } = result;
  const resultColor = scoreColor(score, { emerald, orange, red });
  const { label, emoji } = scoreLabel(score);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + SPACING.lg }]}
      >
        <Card style={styles.card}>
          <View style={styles.scoreRow}>
            <View>
              <Text variant='caption' style={{ color: muted }}>
                Your Score
              </Text>
              <Text style={[styles.scoreValue, { color: resultColor }]}>{score}%</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 32 }}>{emoji}</Text>
              <Text style={{ fontWeight: '700', color: resultColor }}>{label}</Text>
            </View>
          </View>

          <View style={[styles.statusRow, { borderTopColor: border }]}>
            <Icon name={assessment ? CheckCircle2 : Clock} size={18} color={assessment ? emerald : orange} />
            <Text style={{ fontWeight: '700', color: assessment ? emerald : orange }}>
              {assessment ? 'Checked by AI Teacher' : 'Submitted — awaiting review'}
            </Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text variant='body' style={{ fontWeight: '700' }}>
            Your Writing
          </Text>
          <View style={[styles.quoteBlock, { borderLeftColor: border }]}>
            <Text variant='body' style={{ color: muted, lineHeight: 24 }}>
              {submittedText}
            </Text>
          </View>
        </Card>

        {assessment && (
          <>
            <Card style={styles.card}>
              <Text variant='body' style={{ fontWeight: '700' }}>
                Assessment Breakdown
              </Text>
              <View style={styles.scoreGrid}>
                {[
                  { label: 'Grammar', value: assessment.grammarScore, color: primary },
                  { label: 'Vocabulary', value: assessment.vocabularyScore, color: emerald },
                  { label: 'Coherence', value: assessment.coherenceScore, color: '#a855f7' },
                  { label: 'Task Response', value: assessment.taskResponseScore, color: orange },
                ].map((item) => (
                  <View key={item.label} style={[styles.scoreBox, { backgroundColor: `${item.color}1A` }]}>
                    <Text variant='caption' style={{ color: muted }}>
                      {item.label}
                    </Text>
                    <Text style={{ fontSize: 20, fontWeight: '700' }}>{item.value}%</Text>
                  </View>
                ))}
              </View>
            </Card>

            {!!assessment.correctedText && (
              <Card style={styles.card}>
                <Text variant='body' style={{ fontWeight: '700' }}>
                  Corrected Version
                </Text>
                <View style={[styles.correctedBlock, { backgroundColor: `${emerald}1A`, borderLeftColor: emerald }]}>
                  <Text variant='body' style={{ color: muted, lineHeight: 24 }}>
                    {assessment.correctedText}
                  </Text>
                </View>
              </Card>
            )}

            <FeedbackCard
              icon={MessageSquare}
              iconColor={primary}
              title='Overall Feedback'
              feedback={assessment.overallFeedback}
            />
            <FeedbackCard
              icon={ClipboardCheck}
              iconColor={primary}
              title='Grammar Feedback'
              feedback={assessment.grammarFeedback}
            />
            <FeedbackCard
              icon={BookOpen}
              iconColor={emerald}
              title='Vocabulary Feedback'
              feedback={assessment.vocabularyFeedback}
            />
            <FeedbackCard
              icon={Link2}
              iconColor='#a855f7'
              title='Coherence Feedback'
              feedback={assessment.coherenceFeedback}
            />
            <FeedbackCard
              icon={Lightbulb}
              iconColor={orange}
              title='Task Response Feedback'
              feedback={assessment.taskResponseFeedback}
            />
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <View style={styles.footerRow}>
          <Pressable
            onPress={onRetake}
            style={[styles.retryButton, { borderColor: resultColor }]}
            hitSlop={8}
            accessibilityRole='button'
            accessibilityLabel='Retake'
          >
            <Icon name={RotateCcw} size={20} color={resultColor} />
          </Pressable>
          <DuoButton color={resultColor} onPress={onContinue} style={{ flex: 1 }}>
            Continue Learning
          </DuoButton>
        </View>
      </View>
    </View>
  );
}

export default function WritingScreen() {
  const { exerciseId, lessonId, submission: submissionParam } = useLocalSearchParams<{
    exerciseId: string;
    lessonId: string;
    /** A JSON-serialized `ExerciseSubmissionSummary` — set when opening an already-graded writing exercise, so its result shows immediately instead of an empty composer. */
    submission?: string;
  }>();
  const navigation = useNavigation();
  const toast = useToast();
  const playFinishSound = useSoundEffect(require('@/assets/sounds/game_end.mp3'));
  const card = useColor('card');
  const text = useColor('text');
  const muted = useColor('textMuted');
  const border = useColor('border');
  const primary = useColor('primary');
  const secondary = useColor('secondary');
  const mutedBg = useColor('muted');

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [{ draft: initialDraft, result: initialResult }] = useState(() => parseExistingSubmission(submissionParam));
  const [draft, setDraft] = useState(initialDraft);
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<WritingResult | null>(initialResult);

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

  useEffect(() => {
    navigation.setOptions({ headerShown: !result });
  }, [result, navigation]);

  const wordCount = useMemo(() => countWords(draft), [draft]);
  const hasContent = wordCount >= MIN_WORDS;
  const canSubmit = hasContent && !submitting && !result;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await submitHomeworkSection({
        lesson_id: lessonId,
        exercise_id: exerciseId,
        section: 'writing',
        answers: { writing: draft },
      });
      setResult({
        score: response.section.score ?? 0,
        assessment: (response.section.answers?.assessment as WritingAssessment | undefined) ?? null,
      });
      playFinishSound();
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

  if (result) {
    return (
      <WritingResultView
        result={result}
        submittedText={draft}
        onContinue={() => router.dismissTo({ pathname: '/lesson', params: { lessonId } })}
        onRetake={() => setResult(null)}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} keyboardShouldPersistTaps='handled'>
        <Card style={styles.promptCard}>
          <View style={styles.promptHeader}>
            <View style={[styles.iconBadge, { backgroundColor: secondary }]}>
              <Icon name={PenLine} size={18} color={primary} />
            </View>
            <Text variant='body' style={{ fontWeight: '700', flex: 1 }} numberOfLines={2}>
              {exercise.title}
            </Text>
          </View>
          {!!exercise.instructions && (
            <Text variant='body' style={styles.promptText}>
              {exercise.instructions}
            </Text>
          )}
        </Card>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          editable={!submitting}
          multiline
          textAlignVertical='top'
          placeholder='Write your response…'
          placeholderTextColor={muted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { backgroundColor: card, color: text, borderColor: focused ? primary : border }]}
        />

        <Text variant='caption' style={{ color: muted }}>
          {wordCount} word{wordCount === 1 ? '' : 's'}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <DuoButton color={hasContent ? primary : mutedBg} onPress={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Submitting…' : 'Submit'}
        </DuoButton>
      </View>

      <AvoidKeyboard fastHide />
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
  card: {
    gap: SPACING.sm,
    elevation: 0,
  },
  promptCard: {
    gap: SPACING.sm,
    elevation: 0,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: {
    lineHeight: 24,
  },
  input: {
    minHeight: 260,
    borderRadius: BORDER_RADIUS,
    borderWidth: 2,
    padding: SPACING.md,
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    padding: SPACING.lg,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  retryButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreValue: {
    fontSize: 40,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: SPACING.sm,
  },
  quoteBlock: {
    borderLeftWidth: 3,
    paddingLeft: SPACING.sm,
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  scoreBox: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: SPACING.sm,
    borderRadius: 6,
    gap: 2,
  },
  correctedBlock: {
    borderLeftWidth: 3,
    borderRadius: SPACING.sm,
    padding: SPACING.sm,
  },
});
