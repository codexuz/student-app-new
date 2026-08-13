import { useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import DuoDragDrop, { Word, type DuoDragDropRef } from '@jamsch/react-native-duo-drag-drop';

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
  const data = question.translation;
  const card = useColor('card');
  const border = useColor('border');
  const text = useColor('text');

  // Alternate accepted answers are packed as `answer one/answer two` — only
  // the first is buildable as a word bank.
  const words = useMemo(
    () => shuffle((data?.correct_answer.split('/')[0] ?? '').split(' ').filter(Boolean)),
    [data]
  );

  if (!data) return null;

  return (
    <View>
      <Text variant='body' style={styles.prompt}>
        {data.given_text}
      </Text>
      <DuoDragDrop
        ref={ref}
        words={words}
        gesturesDisabled={showResult}
        renderWord={() => (
          <Word containerStyle={{ backgroundColor: card, borderColor: border }} textStyle={{ color: text }} />
        )}
        onDrop={() => onChange({ text: ref.current?.getAnsweredWords().join(' ') ?? '' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: {
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
});
