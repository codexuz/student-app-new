import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Lightbulb } from 'lucide-react-native';
import LottieView from 'lottie-react-native';

import { DuoButton } from '@/components/lesson/duo-button';
import { MicButton } from '@/components/lesson/mic-button';
import { PhraseCard } from '@/components/lesson/phrase-card';
import { LessonProgressBar } from '@/components/lesson/progress-bar';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useHaptics } from '@/hooks/useHaptics';
import { useSoundEffect } from '@/hooks/useSoundEffect';
import { ApiError } from '@/lib/api/client';
import type { IeltsPart1Question } from '@/lib/api/curriculum-types';
import { transcribeAudio, uploadFile } from '@/lib/api/media';
import { getPart1Questions, submitSpeakingResponse } from '@/lib/api/speaking';
import { useAuth } from '@/providers/auth-provider';
import { SPACING } from '@/theme/globals';

interface QuestionResponse {
  question: string;
  transcription: string;
  audioUrl: string;
}

export default function SpeakingQAScreen() {
  const { speakingId, lessonId } = useLocalSearchParams<{ speakingId: string; lessonId: string }>();
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
  const [responses, setResponses] = useState<Record<number, QuestionResponse>>({});
  const [processing, setProcessing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [hintIndex, setHintIndex] = useState<number | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  useEffect(() => {
    requestRecordingPermissionsAsync();
    setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  }, []);

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
    if (finished) playFinishSound();
    // Only once, when the summary screen first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const currentQuestion = questions?.[currentIndex];
  const currentResponse = responses[currentIndex];
  const isLast = questions ? currentIndex === questions.length - 1 : false;
  const progress = questions && questions.length > 0 ? (currentIndex + (currentResponse ? 1 : 0)) / questions.length : 0;
  const showHint = hintIndex === currentIndex;

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
      await submitSpeakingResponse({
        speaking_id: speakingId,
        student_id: user.user_id,
        response_type: 'part1',
        audio_url: allResponses.map((r) => r.audioUrl),
        transcription: allResponses.map((r) => r.transcription).join('\n\n'),
        result: { responses: allResponses },
      });
      setFinished(true);
    } catch (err) {
      toast.error('Submission failed', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setProcessing(false);
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

  if (!questions) {
    return (
      <View style={styles.centerFill}>
        <Spinner size='lg' />
      </View>
    );
  }

  if (finished) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <LottieView source={require('@/assets/animations/gift.json')} autoPlay loop={false} style={styles.lottie} />
        </View>
        <Text variant='heading' style={{ textAlign: 'center' }}>
          Nice work!
        </Text>
        <Text variant='caption' style={{ textAlign: 'center', color: muted }}>
          Here&apos;s what you said:
        </Text>

        {Object.values(responses).map((response, index) => (
          <Card key={index} style={styles.summaryItem}>
            <Text variant='body' style={{ fontWeight: '700' }}>
              {response.question}
            </Text>
            <Text variant='caption' style={{ color: muted }}>
              {response.transcription}
            </Text>
          </Card>
        ))}

        <DuoButton
          color={primary}
          onPress={() => router.dismissTo({ pathname: '/lesson', params: { lessonId } })}
          style={{ marginTop: SPACING.lg }}
        >
          Done
        </DuoButton>
      </ScrollView>
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
  hero: {
    width: 160,
    height: 160,
    alignSelf: 'center',
  },
  lottie: {
    width: 160,
    height: 160,
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
  },
  summaryItem: {
    gap: 2,
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
});
