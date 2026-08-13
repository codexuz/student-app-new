import { StyleSheet, TextInput } from 'react-native';

import { AvoidKeyboard } from '@/components/ui/avoid-keyboard';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { CORNERS, SPACING } from '@/theme/globals';
import { gradeQuestion } from '@/components/exercise/grading';
import type { ShortAnswerAnswer } from '@/components/exercise/answer-types';
import type { Question } from '@/lib/api/curriculum-types';

export function ShortAnswerQuestion({
  question,
  value,
  onChange,
  showResult,
}: {
  question: Question;
  value: ShortAnswerAnswer;
  onChange: (value: ShortAnswerAnswer) => void;
  showResult: boolean;
}) {
  const card = useColor('card');
  const text = useColor('text');
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const green = useColor('green');
  const red = useColor('red');
  const border = useColor('border');

  const isCorrect = showResult ? gradeQuestion(question, value).isCorrect : null;
  const borderColor = isCorrect === null ? (value.text ? primary : border) : isCorrect ? green : red;

  return (
    <View>
      <TextInput
        value={value.text}
        onChangeText={(text) => onChange({ text })}
        editable={!showResult}
        placeholder='Type your answer…'
        placeholderTextColor={muted}
        style={[styles.input, { backgroundColor: card, color: text, borderColor }]}
      />

      <AvoidKeyboard fastHide />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: CORNERS,
    borderWidth: 2,
    borderBottomWidth: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 16,
  },
});
