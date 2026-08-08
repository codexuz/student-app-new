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
  const leftItems = useMemo(() => shuffle(pairs.map((p) => ({ id: p.id, text: p.left_item }))), [pairs]);
  const rightItems = useMemo(() => shuffle(pairs.map((p) => ({ id: p.id, text: p.right_item }))), [pairs]);

  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const matchedRightIds = new Set(Object.values(value.matches));

  const rightIdForLeftId = (leftId: string) => value.matches[leftId];

  const selectLeft = (leftId: string) => {
    if (showResult || rightIdForLeftId(leftId)) return;
    feedback('selection');
    setSelectedLeftId(selectedLeftId === leftId ? null : leftId);
  };

  const selectRight = (rightId: string) => {
    if (showResult || matchedRightIds.has(rightId) || !selectedLeftId) return;
    feedback('selection');
    onChange({ matches: { ...value.matches, [selectedLeftId]: rightId } });
    setSelectedLeftId(null);
  };

  const isPairCorrect = (leftId: string) => value.matches[leftId] === leftId;

  return (
    <View style={styles.columns}>
      <View style={styles.column}>
        {leftItems.map(({ id, text }) => {
          const matched = !!rightIdForLeftId(id);
          const correct = showResult && matched ? isPairCorrect(id) : null;
          const highlighted = selectedLeftId === id || matched;
          const backgroundColor =
            correct === true ? `${green}22` : correct === false ? `${red}22` : highlighted ? `${primary}18` : card;
          const borderColor =
            correct === true ? green : correct === false ? red : highlighted ? primary : border;

          return (
            <Pressable
              key={id}
              disabled={showResult || matched}
              onPress={() => selectLeft(id)}
              style={[styles.chip, { backgroundColor, borderColor }]}
            >
              <Text variant='caption'>{text}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.column}>
        {rightItems.map(({ id, text }) => {
          const matched = matchedRightIds.has(id);
          const leftIdForThis = Object.entries(value.matches).find(([, r]) => r === id)?.[0];
          const correct = showResult && leftIdForThis ? isPairCorrect(leftIdForThis) : null;
          const backgroundColor =
            correct === true ? `${green}22` : correct === false ? `${red}22` : matched ? `${primary}18` : card;
          const borderColor = correct === true ? green : correct === false ? red : matched ? primary : border;

          return (
            <Pressable
              key={id}
              disabled={showResult || matched}
              onPress={() => selectRight(id)}
              style={[styles.chip, { backgroundColor, borderColor }]}
            >
              <Text variant='caption'>{text}</Text>
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
