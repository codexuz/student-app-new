import { useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import DuoDragDrop, { type DuoDragDropRef } from '@jamsch/react-native-duo-drag-drop';

import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';
import type { TranslationAnswer } from '@/components/exercise/answer-types';
import type { Question } from '@/lib/api/curriculum-types';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function TranslationQuestion({
  question,
  value,
  onChange,
  showResult,
}: {
  question: Question;
  value: TranslationAnswer;
  onChange: (value: TranslationAnswer) => void;
  showResult: boolean;
}) {
  const ref = useRef<DuoDragDropRef>(null);
  const border = useColor('border');
  const green = useColor('green');
  const red = useColor('red');
  const data = question.translation;

  // Alternate accepted answers are packed as `answer one/answer two` — only
  // the first is buildable as a word bank.
  const words = useMemo(
    () => shuffle((data?.correct_answer.split('/')[0] ?? '').split(' ').filter(Boolean)),
    [data]
  );

  const isCorrect = showResult
    ? value.text.trim().toLowerCase() ===
      (data?.correct_answer.split('/')[0] ?? '').trim().toLowerCase()
    : null;

  if (!data) return null;

  return (
    <View>
      <Text variant='body' style={styles.prompt}>
        {data.given_text}
      </Text>
      <View
        style={[
          styles.widget,
          { borderColor: isCorrect === null ? border : isCorrect ? green : red },
        ]}
      >
        <DuoDragDrop
          ref={ref}
          words={words}
          gesturesDisabled={showResult}
          onDrop={() => onChange({ text: ref.current?.getAnsweredWords().join(' ') ?? '' })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: {
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  widget: {
    minHeight: 180,
    borderWidth: 1.5,
    borderRadius: SPACING.sm,
    padding: SPACING.sm,
  },
});
