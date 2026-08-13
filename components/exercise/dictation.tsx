import { StyleSheet, TextInput } from 'react-native';

import { AudioHeroPlayer } from '@/components/lesson/audio-hero-player';
import { AvoidKeyboard } from '@/components/ui/avoid-keyboard';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { CORNERS, SPACING } from '@/theme/globals';
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
  const primary = useColor('primary');
  const green = useColor('green');
  const red = useColor('red');
  const border = useColor('border');
  const data = question.dictation;

  const isCorrect = showResult ? gradeQuestion(question, value).isCorrect : null;
  const borderColor = isCorrect === null ? (value.text ? primary : border) : isCorrect ? green : red;

  if (!data) return null;

  return (
    <View style={styles.container}>
      <Text variant='caption' style={{ color: muted, textAlign: 'center' }}>
        Listen and type what you hear
      </Text>

      <AudioHeroPlayer url={data.audio} />

      <TextInput
        value={value.text}
        onChangeText={(text) => onChange({ text })}
        editable={!showResult}
        placeholder='Write what you hear…'
        placeholderTextColor={muted}
        multiline
        style={[styles.input, { backgroundColor: card, color: text, borderColor }]}
      />

      {isCorrect === false && (
        <View style={[styles.solution, { borderColor: `${green}55`, backgroundColor: `${green}14` }]}>
          <Text variant='caption' style={{ color: green, fontWeight: '700' }}>
            Correct solution
          </Text>
          <Text variant='body' style={{ color: text }}>
            {data.correct_answer}
          </Text>
        </View>
      )}

      <AvoidKeyboard fastHide />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  input: {
    borderRadius: CORNERS,
    borderWidth: 2,
    borderBottomWidth: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 16,
    minHeight: 56,
  },
  solution: {
    borderWidth: 1.5,
    borderRadius: SPACING.sm,
    padding: SPACING.sm,
    gap: 2,
  },
});
