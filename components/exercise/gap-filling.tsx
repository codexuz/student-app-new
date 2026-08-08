import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { BottomSheet, useBottomSheet } from '@/components/ui/bottom-sheet';
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
  const card = useColor('card');
  const border = useColor('border');
  const green = useColor('green');
  const red = useColor('red');
  const muted = useColor('textMuted');
  const feedback = useHaptics(true);
  const sheet = useBottomSheet();
  const activeGapRef = useRef<number | null>(null);
  const [activeGap, setActiveGap] = useState<number | null>(null);

  const parts = useMemo(() => splitIntoParts(question.question_text), [question.question_text]);
  const gaps = useMemo(() => question.gap_filling ?? [], [question.gap_filling]);

  const wordBank = useMemo(
    () => shuffle(gaps.map((gap) => gap.correct_answer[0] ?? '')),
    [gaps]
  );

  const usedWords = new Set(Object.values(value.values));

  const openPicker = (gapNumber: number) => {
    if (showResult) return;
    feedback('selection');
    activeGapRef.current = gapNumber;
    setActiveGap(gapNumber);
    sheet.open();
  };

  const pickWord = (word: string) => {
    const gapNumber = activeGapRef.current;
    if (gapNumber == null) return;
    onChange({ values: { ...value.values, [gapNumber]: word } });
    sheet.close();
  };

  const isGapCorrect = (gapNumber: number) => {
    const gap = gaps.find((g) => g.gap_number === gapNumber);
    const chosen = value.values[gapNumber];
    return !!gap && !!chosen && gap.correct_answer.some((c) => c.toLowerCase().trim() === chosen.toLowerCase().trim());
  };

  return (
    <View>
      <View style={styles.textWrap}>
        {parts.map((part, index) => {
          if (part.blankIndex == null) {
            return (
              <Text key={index} variant='body' style={styles.textPart}>
                {part.text}
              </Text>
            );
          }

          const chosen = value.values[part.blankIndex];
          const correct = showResult ? isGapCorrect(part.blankIndex) : null;
          const backgroundColor = correct === null ? `${primary}18` : correct ? `${green}22` : `${red}22`;
          const borderColor = correct === null ? primary : correct ? green : red;

          return (
            <Pressable
              key={index}
              disabled={showResult}
              onPress={() => openPicker(part.blankIndex!)}
              style={[styles.blank, { backgroundColor, borderColor }]}
            >
              <Text variant='body' style={{ fontWeight: '600' }}>
                {chosen || '_____'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <BottomSheet isVisible={sheet.isVisible} onClose={sheet.close} snapPoints={[0.4]} title='Choose a word'>
        <View style={styles.wordBank}>
          {wordBank.map((word, index) => {
            const isUsed = usedWords.has(word) && value.values[activeGap ?? -1] !== word;
            return (
              <Pressable
                key={`${word}-${index}`}
                disabled={isUsed}
                onPress={() => pickWord(word)}
                style={[
                  styles.wordChip,
                  { backgroundColor: card, borderColor: border },
                  isUsed && styles.wordChipUsed,
                ]}
              >
                <Text style={isUsed ? { color: muted } : undefined}>{word}</Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  textWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  textPart: {
    lineHeight: 28,
  },
  blank: {
    borderWidth: 1.5,
    borderRadius: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    minWidth: 64,
    alignItems: 'center',
  },
  wordBank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  wordChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  wordChipUsed: {
    opacity: 0.4,
  },
});
