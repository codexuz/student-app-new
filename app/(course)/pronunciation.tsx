import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { FeedbackBanner, type FeedbackTier } from '@/components/lesson/feedback-banner';
import { MicButton } from '@/components/lesson/mic-button';
import { PhraseCard } from '@/components/lesson/phrase-card';
import { LessonProgressBar } from '@/components/lesson/progress-bar';
import { Result } from '@/components/lesson/result';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useHaptics } from '@/hooks/useHaptics';
import { useSoundEffect } from '@/hooks/useSoundEffect';
import { ApiError } from '@/lib/api/client';
import type { PronunciationPhrase } from '@/lib/api/curriculum-types';
import { transcribeAudio } from '@/lib/api/media';
import { getPronunciationPhrases, submitSpeakingResponse } from '@/lib/api/speaking';
import { useAuth } from '@/providers/auth-provider';
import { useMediaPermission } from '@/providers/media-permission-provider';
import { SPACING } from '@/theme/globals';

interface FinishedState {
  percentage: number;
  passedCount: number;
  totalCount: number;
}

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ');
}

/** No phoneme-level scoring available client-side — a word-overlap heuristic
 * is the best available signal without a 3rd-party ASR/pronunciation API. */
function scoreSimilarity(spokenText: string, targetPhrase: string): number {
  const spoken = normalize(spokenText);
  const target = normalize(targetPhrase);
  if (!spoken) return 0;
  if (spoken === target || spoken.includes(target)) return 100;

  const targetWords = target.split(' ').filter(Boolean);
  const spokenWords = new Set(spoken.split(' ').filter(Boolean));
  if (targetWords.length === 0) return 0;
  const matched = targetWords.filter((word) => spokenWords.has(word)).length;
  return Math.round((matched / targetWords.length) * 100);
}

function tierFor(score: number): FeedbackTier {
  if (score >= 80) return 'great';
  if (score >= 60) return 'good';
  return 'retry';
}

const TIER_COPY: Record<FeedbackTier, string> = {
  great: 'Excellent!',
  good: 'Good job!',
  retry: "Let's try that again",
};

export default function PronunciationDrillScreen() {
  const { speakingId, lessonId } = useLocalSearchParams<{ speakingId: string; lessonId: string }>();
  const toast = useToast();
  const { user } = useAuth();
  const feedback = useHaptics(true);
  const playCorrect = useSoundEffect(require('@/assets/sounds/pronunciation_correct.mp3'));
  const playIncorrect = useSoundEffect(require('@/assets/sounds/pronunciation_incorrect.mp3'));

  const [phrases, setPhrases] = useState<PronunciationPhrase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [finished, setFinished] = useState<FinishedState | null>(null);

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

    getPronunciationPhrases(speakingId)
      .then((data) => {
        if (isMounted) setPhrases(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load phrases.');
      });

    return () => {
      isMounted = false;
    };
  }, [speakingId]);

  const currentPhrase = phrases?.[currentIndex];
  const isLast = phrases ? currentIndex === phrases.length - 1 : false;
  const progress = phrases && phrases.length > 0 ? (currentIndex + (currentScore != null ? 1 : 0)) / phrases.length : 0;

  const startRecording = async () => {
    setCurrentScore(null);
    setTranscript(null);
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopRecording = async () => {
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri || !currentPhrase) return;

    setProcessing(true);
    try {
      const { text } = await transcribeAudio({ uri, name: 'phrase.m4a', type: 'audio/m4a' });
      const score = scoreSimilarity(text, currentPhrase.word_to_pronunce);
      setCurrentScore(score);
      setTranscript(text);
      feedback(score >= 60 ? 'success' : 'warning');
      if (score >= 60) playCorrect();
      else playIncorrect();
    } catch (error) {
      if (__DEV__) console.error('Pronunciation audio processing failed:', error);
      toast.error('Something went wrong', 'Could not process your recording. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const retry = () => {
    setCurrentScore(null);
    setTranscript(null);
  };

  const advance = async () => {
    if (currentScore == null) return;
    const nextScores = [...scores, currentScore];

    if (!isLast) {
      setScores(nextScores);
      setCurrentScore(null);
      setCurrentIndex((i) => i + 1);
      return;
    }

    if (!user?.user_id) return;

    const average = Math.round(nextScores.reduce((sum, s) => sum + s, 0) / nextScores.length);
    setProcessing(true);
    try {
      await submitSpeakingResponse({
        speaking_id: speakingId,
        student_id: user.user_id,
        response_type: 'pronunciation',
        pronunciation_score: average,
      });
      setScores(nextScores);
      setFinished({
        percentage: average,
        passedCount: nextScores.filter((s) => s >= 60).length,
        totalCount: nextScores.length,
      });
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

  if (!phrases) {
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
        correctCount={finished.passedCount}
        totalQuestions={finished.totalCount}
        rewards={null}
        onContinue={() => router.dismissTo({ pathname: '/lesson', params: { lessonId } })}
        continueLabel='Done'
      />
    );
  }

  if (!currentPhrase) return null;

  const tier = currentScore != null ? tierFor(currentScore) : null;

  return (
    <View style={{ flex: 1 }}>
      <LessonProgressBar progress={progress} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <PhraseCard
          phrase={currentPhrase.word_to_pronunce}
          audioUrl={currentPhrase.audio_url}
          current={currentIndex + 1}
          total={phrases.length}
        />

        <View style={styles.recordArea}>
          <MicButton
            isRecording={recorderState.isRecording}
            processing={processing}
            disabled={processing}
            onPressIn={startRecording}
            onPressOut={stopRecording}
          />
          <Text variant='caption' style={{ textAlign: 'center' }}>
            {processing ? 'Processing…' : recorderState.isRecording ? 'Recording…' : 'Press and hold to record'}
          </Text>
        </View>
      </ScrollView>

      {currentScore != null && tier && (
        <FeedbackBanner
          tier={tier}
          title={TIER_COPY[tier]}
          subtitle={`Pronunciation score: ${currentScore}%`}
          transcript={tier === 'retry' ? (transcript ?? undefined) : undefined}
          primaryLabel={processing ? 'Submitting…' : isLast ? 'Finish' : 'Next'}
          primaryDisabled={processing}
          onPrimary={advance}
          onRetry={tier === 'retry' ? retry : undefined}
        />
      )}
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
});
