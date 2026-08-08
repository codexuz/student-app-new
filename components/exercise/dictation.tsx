import { StyleSheet, TextInput } from 'react-native';

import { AudioPlayer } from '@/components/ui/audio-player';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { BORDER_RADIUS, SPACING } from '@/theme/globals';
import { gradeQuestion } from '@/components/exercise/grading';
import type { DictationAnswer } from '@/components/exercise/answer-types';
import type { Question } from '@/lib/api/curriculum-types';

export function DictationQuestion({
  question,
  value,
  onChange,
  showResult,
}: {
  question: Question;
  value: DictationAnswer;
  onChange: (value: DictationAnswer) => void;
  showResult: boolean;
}) {
  const card = useColor('card');
  const text = useColor('text');
  const muted = useColor('textMuted');
  const green = useColor('green');
  const red = useColor('red');
  const border = useColor('border');
  const data = question.dictation;

  const isCorrect = showResult ? gradeQuestion(question, value).isCorrect : null;
  const borderColor = isCorrect === null ? border : isCorrect ? green : red;

  if (!data) return null;

  return (
    <View style={styles.container}>
      <AudioPlayer url={data.audio} />
      <TextInput
        value={value.text}
        onChangeText={(text) => onChange({ text })}
        editable={!showResult}
        placeholder='Write what you hear…'
        placeholderTextColor={muted}
        style={[styles.input, { backgroundColor: card, color: text, borderColor }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  input: {
    borderRadius: BORDER_RADIUS,
    borderWidth: 1.5,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
  },
});
