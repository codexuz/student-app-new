import { useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import DuoDragDrop, { Word, type DuoDragDropRef } from '@jamsch/react-native-duo-drag-drop';

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
  onAnswered,
  showResult,
}: {
  item: SentenceBuildItem;
  onAnswered: (sentence: string) => void;
  showResult: boolean;
}) {
  const ref = useRef<DuoDragDropRef>(null);
  const words = useMemo(() => shuffle(item.correct_answer.split(' ').filter(Boolean)), [item]);
  const card = useColor('card');
  const border = useColor('border');
  const text = useColor('text');

  return (
    <View>
      <DuoDragDrop
        ref={ref}
        words={words}
        gesturesDisabled={showResult}
        renderWord={() => (
          <Word containerStyle={{ backgroundColor: card, borderColor: border }} textStyle={{ color: text }} />
        )}
        onDrop={() => onAnswered(ref.current?.getAnsweredWords().join(' ') ?? '')}
      />
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
});
