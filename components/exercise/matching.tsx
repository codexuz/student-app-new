import { useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useHaptics } from '@/hooks/useHaptics';
import { SPACING } from '@/theme/globals';
import type { MatchingAnswer } from '@/components/exercise/answer-types';
import type { Question } from '@/lib/api/curriculum-types';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function MatchingQuestion({
  question,
  value,
  onChange,
  showResult,
}: {
  question: Question;
  value: MatchingAnswer;
  onChange: (value: MatchingAnswer) => void;
  showResult: boolean;
}) {
  const card = useColor('card');
  const border = useColor('border');
  const primary = useColor('primary');
  const green = useColor('green');
  const red = useColor('red');
  const feedback = useHaptics(true);

  const pairs = useMemo(() => question.matching_pairs ?? [], [question.matching_pairs]);
  const leftItems = useMemo(() => shuffle(pairs.map((p) => p.left_item)), [pairs]);
  const rightItems = useMemo(() => shuffle(pairs.map((p) => p.right_item)), [pairs]);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const matchedRight = new Set(Object.values(value.matches));

  const rightForLeft = (left: string) => value.matches[left];

  const selectLeft = (left: string) => {
    if (showResult || rightForLeft(left)) return;
    feedback('selection');
    setSelectedLeft(selectedLeft === left ? null : left);
  };

  const selectRight = (right: string) => {
    if (showResult || matchedRight.has(right) || !selectedLeft) return;
    feedback('selection');
    onChange({ matches: { ...value.matches, [selectedLeft]: right } });
    setSelectedLeft(null);
  };

  const isPairCorrect = (left: string) => {
    const pair = pairs.find((p) => p.left_item === left);
    return pair && value.matches[left] === pair.right_item;
  };

  return (
    <View style={styles.columns}>
      <View style={styles.column}>
        {leftItems.map((left) => {
          const matched = !!rightForLeft(left);
          const correct = showResult && matched ? isPairCorrect(left) : null;
          const backgroundColor =
            correct === true ? `${green}22` : correct === false ? `${red}22` : selectedLeft === left ? `${primary}18` : card;
          const borderColor =
            correct === true ? green : correct === false ? red : selectedLeft === left ? primary : border;

          return (
            <Pressable
              key={left}
              disabled={showResult || matched}
              onPress={() => selectLeft(left)}
              style={[styles.chip, { backgroundColor, borderColor }]}
            >
              <Text variant='caption'>{left}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.column}>
        {rightItems.map((right) => {
          const matched = matchedRight.has(right);
          const leftForThis = Object.entries(value.matches).find(([, r]) => r === right)?.[0];
          const correct = showResult && leftForThis ? isPairCorrect(leftForThis) : null;
          const backgroundColor = correct === true ? `${green}22` : correct === false ? `${red}22` : card;
          const borderColor = correct === true ? green : correct === false ? red : border;

          return (
            <Pressable
              key={right}
              disabled={showResult || matched}
              onPress={() => selectRight(right)}
              style={[styles.chip, { backgroundColor, borderColor }]}
            >
              <Text variant='caption'>{right}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  columns: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  column: {
    flex: 1,
    gap: SPACING.sm,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: SPACING.xs,
    padding: SPACING.sm,
  },
});
