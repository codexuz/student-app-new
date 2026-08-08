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
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
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
  const primary = useColor('primary');
  const primaryForeground = useColor('primaryForeground');
  const red = useColor('red');
  const muted = useColor('textMuted');

  const [questions, setQuestions] = useState<IeltsPart1Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, QuestionResponse>>({});
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

  const currentQuestion = questions?.[currentIndex];
  const currentResponse = responses[currentIndex];
  const isLast = questions ? currentIndex === questions.length - 1 : false;

  const startRecording = async () => {
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
        <Text variant='heading'>Nice work!</Text>
        <Text variant='caption'>Here&apos;s what you said:</Text>

        {Object.values(responses).map((response, index) => (
          <View key={index} style={styles.summaryItem}>
            <Text variant='body' style={{ fontWeight: '600' }}>
              {response.question}
            </Text>
            <Text variant='caption' style={{ color: muted }}>
              {response.transcription}
            </Text>
          </View>
        ))}

        <Button
          size='lg'
          style={{ width: '100%', marginTop: SPACING.lg }}
          onPress={() => router.dismissTo({ pathname: '/lesson', params: { lessonId } })}
        >
          Done
        </Button>
      </ScrollView>
    );
  }

  if (!currentQuestion) return null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <Text variant='caption' style={{ color: muted }}>
          Question {currentIndex + 1} of {questions.length}
        </Text>
        <Text variant='title'>{currentQuestion.question}</Text>

        {!!currentQuestion.audio_url && <AudioPlayer url={currentQuestion.audio_url} />}

        <View style={styles.recordArea}>
          <Pressable
            onPress={recorderState.isRecording ? stopRecording : startRecording}
            disabled={processing}
            style={[
              styles.recordButton,
              { backgroundColor: recorderState.isRecording ? red : primary },
            ]}
          >
            <Icon name={recorderState.isRecording ? Square : Mic} size={28} color={primaryForeground} />
          </Pressable>
          <Text variant='caption' style={{ color: muted }}>
            {processing
              ? 'Processing…'
              : recorderState.isRecording
                ? 'Tap to stop'
                : currentResponse
                  ? 'Tap to re-record'
                  : 'Tap to record your answer'}
          </Text>
        </View>

        {!!currentResponse && (
          <View style={styles.transcript}>
            <Text variant='caption' style={{ fontWeight: '600' }}>
              Your response
            </Text>
            <Text variant='body'>{currentResponse.transcription}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          size='lg'
          style={{ width: '100%' }}
          onPress={handleNext}
          disabled={!currentResponse || processing}
        >
          {isLast ? 'Complete Exercise' : 'Next Question'}
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
  transcript: {
    gap: SPACING.xs,
  },
  summaryItem: {
    gap: 2,
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
