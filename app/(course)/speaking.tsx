import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import {
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import {
  BookOpen,
  CheckCheck,
  CheckCircle2,
  Clock,
  Gauge,
  Lightbulb,
  Mic,
  MessageSquare,
  RotateCcw,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AudioHeroPlayer } from '@/components/lesson/audio-hero-player';
import { DuoButton } from '@/components/lesson/duo-button';
import { FeedbackCard } from '@/components/lesson/feedback-card';
import { MicButton } from '@/components/lesson/mic-button';
import { PhraseCard } from '@/components/lesson/phrase-card';
import { LessonProgressBar } from '@/components/lesson/progress-bar';
import { Card } from '@/components/ui/card';
import { CircularProgress } from '@/components/ui/circular-progress';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useHaptics } from '@/hooks/useHaptics';
import { useSoundEffect } from '@/hooks/useSoundEffect';
import { useMediaPermission } from '@/providers/media-permission-provider';
import { ApiError } from '@/lib/api/client';
import type { IeltsPart1Question, SpeakingAssessment, SpeakingResponse } from '@/lib/api/curriculum-types';
import { transcribeAudio, uploadFile } from '@/lib/api/media';
import { getPart1Questions, submitSpeakingResponse } from '@/lib/api/speaking';
import { useAuth } from '@/providers/auth-provider';
import { SPACING } from '@/theme/globals';

interface QuestionResponse {
  question: string;
  transcription: string;
  audioUrl: string;
}

interface SpeakingResult {
  overallScore: number;
  assessment: SpeakingAssessment | null;
}

function isSpeakingAssessment(result: SpeakingResponse['result']): result is SpeakingAssessment {
  return !!result && typeof result === 'object' && 'fluency' in result;
}

/** Parses the `submission` route param (a JSON-serialized `SpeakingResponse`) set when opening an already-graded speaking task, so its result and Q&A list can seed initial state directly instead of via an effect. */
function parseExistingSubmission(param: string | undefined): {
  responses: Record<number, QuestionResponse>;
  result: SpeakingResult | null;
} {
  if (!param) return { responses: {}, result: null };
  try {
    const parsed: SpeakingResponse = JSON.parse(param);
    const assessment = isSpeakingAssessment(parsed.result) ? parsed.result : null;
    const detailList = parsed.result?.responses ?? [];
    const responses: Record<number, QuestionResponse> = {};
    detailList.forEach((detail, index) => {
      responses[index] = {
        // `detail.question` is the backend's best-effort split of the combined
        // transcript by "Question N:" markers, which the client never actually
        // sends — it's frequently misaligned (sometimes literally a student's
        // answer). The real question text is filled in from the `part1_questions`
        // list once loaded, by index, in `displayResponses` below.
        question: '',
        transcription: detail.transcription ?? '',
        audioUrl: detail.audio_url ?? '',
      };
    });
    return {
      responses,
      result: { overallScore: parsed.pronunciation_score ?? 0, assessment },
    };
  } catch {
    return { responses: {}, result: null };
  }
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

function ScoreChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.scoreChip}>
      <CircularProgress percentage={value} size={68} strokeWidth={6} color={color}>
        <Text style={{ fontSize: 16, fontWeight: '700', color }}>{value}</Text>
      </CircularProgress>
      <Text variant='caption' style={{ fontWeight: '600', textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}

function SpeakingResultView({
  result,
  responses,
  onContinue,
  onRetake,
}: {
  result: SpeakingResult;
  responses: QuestionResponse[];
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

  const { assessment, overallScore } = result;
  const resultColor = scoreColor(overallScore, { emerald, orange, red });
  const { label, emoji } = scoreLabel(overallScore);

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
                Overall Score
              </Text>
              <Text style={[styles.scoreValue, { color: resultColor }]}>{overallScore}%</Text>
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

        {assessment && (
          <>
            <Card style={styles.card}>
              <Text variant='body' style={{ fontWeight: '700' }}>
                Score Breakdown
              </Text>
              <View style={styles.chipRow}>
                <ScoreChip label='Fluency' value={assessment.fluency} color={primary} />
                <ScoreChip label='Grammar' value={assessment.grammar} color={emerald} />
                <ScoreChip label='Vocabulary' value={assessment.vocabulary} color='#a855f7' />
                <ScoreChip label='Pronunciation' value={assessment.pronunciation} color={orange} />
              </View>
            </Card>

            {!!assessment.feedback && (
              <FeedbackCard
                icon={MessageSquare}
                iconColor={primary}
                title='Overall Feedback'
                feedback={assessment.feedback}
              />
            )}
            {!!assessment.fluencyFeedback && (
              <FeedbackCard
                icon={Gauge}
                iconColor={primary}
                title='Fluency'
                feedback={assessment.fluencyFeedback}
                score={assessment.fluency}
              />
            )}
            {!!assessment.grammarFeedback && (
              <FeedbackCard
                icon={CheckCheck}
                iconColor={emerald}
                title='Grammar'
                feedback={assessment.grammarFeedback}
                score={assessment.grammar}
              />
            )}
            {!!assessment.vocabularyFeedback && (
              <FeedbackCard
                icon={BookOpen}
                iconColor='#a855f7'
                title='Vocabulary'
                feedback={assessment.vocabularyFeedback}
                score={assessment.vocabulary}
              />
            )}
            {!!assessment.pronunciationFeedback && (
              <FeedbackCard
                icon={Mic}
                iconColor={orange}
                title='Pronunciation'
                feedback={assessment.pronunciationFeedback}
                score={assessment.pronunciation}
              />
            )}
          </>
        )}

        {responses.length > 0 && (
          <Card style={styles.card}>
            <Text variant='body' style={{ fontWeight: '700' }}>
              Your Responses
            </Text>
            {responses.map((response, index) => (
              <View key={index} style={[styles.responseItem, { borderTopColor: border }, index === 0 && styles.responseItemFirst]}>
                <Text variant='body' style={{ fontWeight: '600' }}>
                  {response.question}
                </Text>
                {!!response.audioUrl && <AudioHeroPlayer url={response.audioUrl} />}
              </View>
            ))}
          </Card>
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

export default function SpeakingQAScreen() {
  const { speakingId, lessonId, submission: submissionParam } = useLocalSearchParams<{
    speakingId: string;
    lessonId: string;
    /** A JSON-serialized `SpeakingResponse` — set when opening an already-graded speaking task, so its result shows immediately instead of an empty composer. */
    submission?: string;
  }>();
  const navigation = useNavigation();
  const toast = useToast();
  const { user } = useAuth();
  const feedback = useHaptics(true);
  const playFinishSound = useSoundEffect(require('@/assets/sounds/game_end.mp3'));
  const primary = useColor('primary');
  const orange = useColor('orange');
  const muted = useColor('textMuted');
  const mutedBg = useColor('muted');

  const [questions, setQuestions] = useState<IeltsPart1Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [{ responses: initialResponses, result: initialResult }] = useState(() =>
    parseExistingSubmission(submissionParam)
  );
  const [responses, setResponses] = useState<Record<number, QuestionResponse>>(initialResponses);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<SpeakingResult | null>(initialResult);
  const [hintIndex, setHintIndex] = useState<number | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const { ensure: ensureMediaPermission } = useMediaPermission();

  useEffect(() => {
    ensureMediaPermission('microphone');
    setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  }, [ensureMediaPermission]);

  useEffect(() => {
    if (!speakingId) return;
    let isMounted = true;

    getPart1Questions(speakingId)
      .then((data) => {
        if (isMounted) setQuestions(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load questions.');
      });

    return () => {
      isMounted = false;
    };
  }, [speakingId]);

  useEffect(() => {
    navigation.setOptions({ headerShown: !result });
  }, [result, navigation]);

  const currentQuestion = questions?.[currentIndex];
  const currentResponse = responses[currentIndex];
  const isLast = questions ? currentIndex === questions.length - 1 : false;
  const progress = questions && questions.length > 0 ? (currentIndex + (currentResponse ? 1 : 0)) / questions.length : 0;
  const showHint = hintIndex === currentIndex;

  // Groups by index: the real question (once loaded) with its audio and transcription —
  // never the backend's `result.responses[].question`, which is unreliable (see parseExistingSubmission).
  const displayResponses: QuestionResponse[] = Object.entries(responses)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([indexStr, response]) => {
      const index = Number(indexStr);
      return {
        ...response,
        question: questions?.[index]?.question || `Question ${index + 1}`,
      };
    });

  const startRecording = async () => {
    feedback('impact-light');
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopRecording = async () => {
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri || !currentQuestion) return;

    setProcessing(true);
    try {
      const file = { uri, name: 'response.m4a', type: 'audio/m4a' };
      const [{ text }, { url }] = await Promise.all([transcribeAudio(file), uploadFile(file)]);
      setResponses((prev) => ({
        ...prev,
        [currentIndex]: { question: currentQuestion.question, transcription: text, audioUrl: url },
      }));
      feedback('selection');
    } catch {
      toast.error('Something went wrong', 'Could not process your recording. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleNext = async () => {
    if (!isLast) {
      setCurrentIndex((i) => i + 1);
      return;
    }
    if (!user?.user_id) return;

    setProcessing(true);
    try {
      const allResponses = Object.values(responses);
      const response = await submitSpeakingResponse({
        speaking_id: speakingId,
        student_id: user.user_id,
        response_type: 'part1',
        audio_url: allResponses.map((r) => r.audioUrl),
        transcription: allResponses.map((r) => r.transcription).join('\n\n'),
        result: { responses: allResponses },
      });
      setResult({
        overallScore: response.pronunciation_score ?? 0,
        assessment: isSpeakingAssessment(response.result) ? response.result : null,
      });
      playFinishSound();
    } catch (err) {
      toast.error('Submission failed', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRetake = () => {
    setResponses({});
    setCurrentIndex(0);
    setResult(null);
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

  if (result) {
    return (
      <SpeakingResultView
        result={result}
        responses={displayResponses}
        onContinue={() => router.dismissTo({ pathname: '/lesson', params: { lessonId } })}
        onRetake={handleRetake}
      />
    );
  }

  if (!questions) {
    return (
      <View style={styles.centerFill}>
        <Spinner size='lg' />
      </View>
    );
  }

  if (!currentQuestion) return null;

  return (
    <View style={{ flex: 1 }}>
      <LessonProgressBar progress={progress} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <PhraseCard
          key={currentQuestion.id}
          phrase={currentQuestion.question}
          audioUrl={currentQuestion.audio_url}
          current={currentIndex + 1}
          total={questions.length}
          autoPlay
        />

        {showHint && !!currentQuestion.sample_answer && (
          <Card style={{ ...styles.hintCard, borderColor: orange }}>
            <View style={styles.hintHeader}>
              <Icon name={Lightbulb} size={16} color={orange} />
              <Text variant='caption' style={{ fontWeight: '700', color: orange }}>
                Idea
              </Text>
            </View>
            <Text variant='body'>{currentQuestion.sample_answer}</Text>
          </Card>
        )}

        {!currentResponse && (
          <View style={styles.recordArea}>
            <MicButton
              isRecording={recorderState.isRecording}
              processing={processing}
              disabled={processing}
              onPress={recorderState.isRecording ? stopRecording : startRecording}
            />
            <Text variant='caption' style={{ color: muted, textAlign: 'center' }}>
              {processing ? 'Processing…' : recorderState.isRecording ? 'Tap to stop' : 'Tap to record your answer'}
            </Text>
          </View>
        )}

        {!!currentResponse && (
          <Card style={styles.transcript}>
            <Text variant='caption' style={{ fontWeight: '700' }}>
              Your response
            </Text>
            <Text variant='body'>{currentResponse.transcription}</Text>
          </Card>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          {!!currentQuestion.sample_answer && (
            <Pressable
              onPress={() => setHintIndex((prev) => (prev === currentIndex ? null : currentIndex))}
              style={[
                styles.ideaButton,
                { borderColor: orange, backgroundColor: showHint ? `${orange}1A` : 'transparent' },
              ]}
              hitSlop={8}
              accessibilityRole='button'
              accessibilityLabel='Show an idea for this answer'
            >
              <Icon name={Lightbulb} size={22} color={orange} />
            </Pressable>
          )}
          <DuoButton
            color={!currentResponse || processing ? mutedBg : primary}
            onPress={handleNext}
            disabled={!currentResponse || processing}
            style={{ flex: 1 }}
          >
            {processing ? 'Submitting…' : isLast ? 'Complete Exercise' : 'Next Question'}
          </DuoButton>
        </View>
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
  recordArea: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  hintCard: {
    gap: SPACING.xs,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    elevation: 0,
  },
  hintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transcript: {
    gap: SPACING.xs,
    elevation: 0,
  },
  footer: {
    padding: SPACING.lg,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  ideaButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    gap: SPACING.sm,
    elevation: 0,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: SPACING.sm,
  },
  scoreChip: {
    alignItems: 'center',
    gap: SPACING.xs,
    width: 76,
  },
  responseItem: {
    gap: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  responseItemFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  retryButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
