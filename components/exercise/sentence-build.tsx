import { useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import DuoDragDrop, { type DuoDragDropRef } from '@jamsch/react-native-duo-drag-drop';

import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';
import type { SentenceBuildAnswer } from '@/components/exercise/answer-types';
import type { Question, SentenceBuildItem } from '@/lib/api/curriculum-types';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function SentenceWidget({
  item,
  answer,
  onAnswered,
  showResult,
}: {
  item: SentenceBuildItem;
  answer: string;
  onAnswered: (sentence: string) => void;
  showResult: boolean;
}) {
  const ref = useRef<DuoDragDropRef>(null);
  const words = useMemo(() => shuffle(item.correct_answer.split(' ').filter(Boolean)), [item]);
  const border = useColor('border');
  const green = useColor('green');
  const red = useColor('red');
  const isCorrect = showResult
    ? answer.trim().toLowerCase() === item.correct_answer.trim().toLowerCase()
    : null;

  return (
    <View>
      {!!item.given_text && (
        <Text variant='caption' style={styles.prompt}>
          {item.given_text}
        </Text>
      )}
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
          onDrop={() => onAnswered(ref.current?.getAnsweredWords().join(' ') ?? '')}
        />
      </View>
    </View>
  );
}

export function SentenceBuildQuestion({
  question,
  value,
  onChange,
  showResult,
}: {
  question: Question;
  value: SentenceBuildAnswer;
  onChange: (value: SentenceBuildAnswer) => void;
  showResult: boolean;
}) {
  const items = question.sentence_build ?? [];

  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <SentenceWidget
          key={item.id}
          item={item}
          answer={value.sentences[index] ?? ''}
          showResult={showResult}
          onAnswered={(sentence) => {
            const sentences = [...value.sentences];
            sentences[index] = sentence;
            onChange({ sentences });
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: SPACING.lg,
  },
  prompt: {
    marginBottom: SPACING.xs,
  },
  widget: {
    minHeight: 180,
    borderWidth: 1.5,
    borderRadius: SPACING.sm,
    padding: SPACING.sm,
  },
});
