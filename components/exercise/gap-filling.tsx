import { useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Check, Plus } from 'lucide-react-native';

import { BottomSheet, useBottomSheet } from '@/components/ui/bottom-sheet';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useHaptics } from '@/hooks/useHaptics';
import { SPACING } from '@/theme/globals';
import type { GapFillingAnswer } from '@/components/exercise/answer-types';
import type { Question } from '@/lib/api/curriculum-types';

const BLANK_PATTERN = /\[blank\]|_{2,}|\.\.\./gi;

/** Splits `question_text` on blank markers, tagging each blank with its 1-based order. */
function splitIntoParts(text: string): { text: string; blankIndex?: number }[] {
  const parts: { text: string; blankIndex?: number }[] = [];
  let lastIndex = 0;
  let blankCount = 0;

  for (const match of text.matchAll(BLANK_PATTERN)) {
    if (match.index === undefined) continue;
    if (match.index > lastIndex) parts.push({ text: text.slice(lastIndex, match.index) });
    blankCount += 1;
    parts.push({ text: '', blankIndex: blankCount });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex) });
  return parts;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function GapFillingQuestion({
  question,
  value,
  onChange,
  showResult,
}: {
  question: Question;
  value: GapFillingAnswer;
  onChange: (value: GapFillingAnswer) => void;
  showResult: boolean;
}) {
  const primary = useColor('primary');
  const border = useColor('border');
  const secondary = useColor('secondary');
  const green = useColor('green');
  const red = useColor('red');
  const muted = useColor('textMuted');
  const feedback = useHaptics(true);
  const sheet = useBottomSheet();
  const [activeGap, setActiveGap] = useState<number | null>(null);
  // Tracks which *word-bank slot* (index) is assigned to each gap — rather than
  // which word *string* — so two gaps that happen to share the same correct
  // answer (e.g. both "last") each get their own bank entry instead of one
  // disabling the other.
  const [assignedIndex, setAssignedIndex] = useState<Record<number, number>>({});

  const parts = useMemo(() => splitIntoParts(question.question_text), [question.question_text]);
  const gaps = useMemo(() => question.gap_filling ?? [], [question.gap_filling]);

  const wordBank = useMemo(() => shuffle(gaps.map((gap) => gap.correct_answer[0] ?? '')), [gaps]);

  const usedIndices = new Set(Object.values(assignedIndex));

  const openPicker = (gapNumber: number) => {
    if (showResult) return;
    feedback('selection');
    setActiveGap(gapNumber);
    sheet.open();
  };

  const pickWord = (word: string, index: number) => {
    if (activeGap == null) return;
    onChange({ values: { ...value.values, [activeGap]: word } });
    setAssignedIndex((prev) => ({ ...prev, [activeGap]: index }));
    sheet.close();
  };

  const isGapCorrect = (gapNumber: number) => {
    const gap = gaps.find((g) => g.gap_number === gapNumber);
    const chosen = value.values[gapNumber];
    return !!gap && !!chosen && gap.correct_answer.some((c) => c.toLowerCase().trim() === chosen.toLowerCase().trim());
  };

  return (
    <View>
      <Text variant='body' style={styles.passage}>
        {parts.map((part, index) => {
          if (part.blankIndex == null) return part.text;

          const gapNumber = part.blankIndex;
          const chosen = value.values[gapNumber];
          const correct = showResult ? isGapCorrect(gapNumber) : null;
          const color = correct === true ? green : correct === false ? red : primary;

          if (!chosen) {
            return (
              <Pressable
                key={index}
                disabled={showResult}
                onPress={() => openPicker(gapNumber)}
                style={[styles.blankEmpty, { backgroundColor: secondary }]}
              >
                <Icon name={Plus} size={14} color={muted} strokeWidth={2.6} />
              </Pressable>
            );
          }

          return (
            <Text
              key={index}
              onPress={() => openPicker(gapNumber)}
              suppressHighlighting
              style={{ fontWeight: '700', color }}
            >
              {chosen}
            </Text>
          );
        })}
      </Text>

      <BottomSheet isVisible={sheet.isVisible} onClose={sheet.close} snapPoints={[0.9]} title='Choose a word'>
        <View style={styles.optionList}>
          {wordBank.map((word, index) => {
            const isSelected = activeGap != null && assignedIndex[activeGap] === index;
            const isUsed = usedIndices.has(index) && !isSelected;
            return (
              <Pressable
                key={`${word}-${index}`}
                disabled={isUsed}
                onPress={() => pickWord(word, index)}
                style={[
                  styles.optionRow,
                  { borderBottomColor: border },
                  isSelected && { backgroundColor: `${primary}14` },
                  isUsed && styles.optionRowUsed,
                  index === wordBank.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={[isUsed && { color: muted }, isSelected && { color: primary, fontWeight: '700' }]}>
                  {word}
                </Text>
                {isSelected && <Icon name={Check} size={18} color={primary} strokeWidth={2.4} />}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  passage: {
    lineHeight: 30,
  },
  blankEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    marginHorizontal: 3,
    minWidth: 44,
    minHeight: 26,
  },
  optionList: {
    borderRadius: SPACING.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionRowUsed: {
    opacity: 0.4,
  },
});
