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
import { Mic, Square } from 'lucide-react-native';

import { AudioPlayer } from '@/components/ui/audio-player';
import { Button } from '@/components/ui/button';
import { CircularProgress } from '@/components/ui/circular-progress';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { ApiError } from '@/lib/api/client';
import type { PronunciationPhrase } from '@/lib/api/curriculum-types';
import { transcribeAudio } from '@/lib/api/media';
import { getPronunciationPhrases, submitSpeakingResponse } from '@/lib/api/speaking';
import { SPACING } from '@/theme/globals';

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

export default function PronunciationDrillScreen() {
  const { speakingId, lessonId } = useLocalSearchParams<{ speakingId: string; lessonId: string }>();
  const toast = useToast();
  const primary = useColor('primary');
  const primaryForeground = useColor('primaryForeground');
  const red = useColor('red');
  const green = useColor('green');
  const orange = useColor('orange');
  const muted = useColor('textMuted');

  const [phrases, setPhrases] = useState<PronunciationPhrase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [finished, setFinished] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  useEffect(() => {
    requestRecordingPermissionsAsync();
    setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  }, []);

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
  const scoreColor = currentScore == null ? primary : currentScore >= 80 ? green : currentScore >= 60 ? orange : red;

  const startRecording = async () => {
    setCurrentScore(null);
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
      setCurrentScore(scoreSimilarity(text, currentPhrase.word_to_pronunce));
    } catch {
      toast.error('Something went wrong', 'Could not process your recording. Please try again.');
    } finally {
      setProcessing(false);
    }
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

    const average = Math.round(nextScores.reduce((sum, s) => sum + s, 0) / nextScores.length);
    setProcessing(true);
    try {
      await submitSpeakingResponse({
        speaking_id: speakingId,
        response_type: 'pronunciation',
        pronunciation_score: average,
      });
    } catch {
      // Best-effort — the student still gets their locally-computed score below.
    } finally {
      setProcessing(false);
      setScores(nextScores);
      setFinished(true);
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
    const average = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
    return (
      <View style={styles.centerFill}>
        <CircularProgress percentage={average} size={100} strokeWidth={8} color={scoreColor} />
        <Text variant='caption' style={{ marginTop: SPACING.md, textAlign: 'center' }}>
          Estimated pronunciation score across {scores.length} phrase{scores.length === 1 ? '' : 's'}
        </Text>
        <Button
          size='lg'
          style={{ width: '100%', marginTop: SPACING.lg }}
          onPress={() => router.dismissTo({ pathname: '/lesson', params: { lessonId } })}
        >
          Done
        </Button>
      </View>
    );
  }

  if (!currentPhrase) return null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <Text variant='caption' style={{ color: muted }}>
          Phrase {currentIndex + 1} of {phrases.length}
        </Text>
        <Text variant='title'>{currentPhrase.word_to_pronunce}</Text>

        {!!currentPhrase.audio_url && <AudioPlayer url={currentPhrase.audio_url} />}

        <View style={styles.recordArea}>
          <Pressable
            onPressIn={startRecording}
            onPressOut={stopRecording}
            disabled={processing}
            style={[styles.recordButton, { backgroundColor: recorderState.isRecording ? red : primary }]}
          >
            <Icon name={recorderState.isRecording ? Square : Mic} size={28} color={primaryForeground} />
          </Pressable>
          <Text variant='caption' style={{ color: muted }}>
            {processing ? 'Processing…' : 'Press and hold to record'}
          </Text>
        </View>

        {currentScore != null && (
          <View style={styles.scoreArea}>
            <CircularProgress percentage={currentScore} size={80} strokeWidth={6} color={scoreColor} />
            {currentScore < 60 && (
              <Text variant='caption' style={{ color: muted, textAlign: 'center' }}>
                Give it another try
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button size='lg' style={{ width: '100%' }} onPress={advance} disabled={currentScore == null || processing}>
          {isLast ? 'Finish' : 'Next'}
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
  recordArea: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreArea: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
