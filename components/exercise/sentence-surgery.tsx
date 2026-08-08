import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Check, X } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useHaptics } from '@/hooks/useHaptics';
import { SPACING } from '@/theme/globals';
import type { SentenceSurgeryAnswer } from '@/components/exercise/answer-types';
import type { Question } from '@/lib/api/curriculum-types';

interface Token {
  text: string;
  start: number;
  end: number;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    tokens.push({ text: match[0], start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

export function SentenceSurgeryQuestion({
  question,
  value,
  onChange,
  showResult,
}: {
  question: Question;
  value: SentenceSurgeryAnswer;
  onChange: (value: SentenceSurgeryAnswer) => void;
  showResult: boolean;
}) {
  const card = useColor('card');
  const border = useColor('border');
  const primary = useColor('primary');
  const green = useColor('green');
  const red = useColor('red');
  const feedback = useHaptics(true);
  const data = question.sentence_surgery;

  const tokens = useMemo(() => tokenize(question.question_text), [question.question_text]);
  const errorTokenIndex = useMemo(() => {
    if (!data) return -1;
    return tokens.findIndex((t) => t.start <= data.error_start && data.error_end <= t.end);
  }, [tokens, data]);

  if (!data) return null;

  const foundError = value.foundIndex != null;

  const tapWord = (index: number) => {
    if (showResult || foundError) return;
    if (index === errorTokenIndex) {
      feedback('success');
      onChange({ ...value, foundIndex: index });
    } else {
      feedback('error');
    }
  };

  return (
    <View style={styles.container}>
      <Text variant='caption' style={{ marginBottom: SPACING.xs }}>
        {foundError ? 'Now choose the correction:' : 'Tap the word that has a mistake.'}
      </Text>

      <View style={styles.words}>
        {tokens.map((token, index) => {
          const isFound = value.foundIndex === index;
          return (
            <Pressable
              key={index}
              onPress={() => tapWord(index)}
              style={[
                styles.wordChip,
                isFound && { backgroundColor: `${red}22`, borderColor: red },
              ]}
            >
              <Text variant='body'>{token.text}</Text>
            </Pressable>
          );
        })}
      </View>

      {foundError && (
        <View style={styles.options}>
          {data.options.map((option, index) => {
            const isSelected = value.selectedOptionIndex === index;
            const revealCorrect = showResult && option.is_correct;
            const revealWrong = showResult && isSelected && !option.is_correct;
            const backgroundColor = revealCorrect
              ? `${green}22`
              : revealWrong
                ? `${red}22`
                : isSelected
                  ? `${primary}18`
                  : card;
            const borderColor = revealCorrect ? green : revealWrong ? red : isSelected ? primary : border;

            return (
              <Pressable
                key={index}
                disabled={showResult}
                onPress={() => {
                  feedback('selection');
                  onChange({ ...value, selectedOptionIndex: index });
                }}
                style={[styles.option, { backgroundColor, borderColor }]}
              >
                <Text variant='body' style={{ flex: 1 }}>
                  {option.text}
                </Text>
                {revealCorrect && <Icon name={Check} size={18} color={green} />}
                {revealWrong && <Icon name={X} size={18} color={red} />}
              </Pressable>
            );
          })}

          {showResult && !!question.sample_answer && (
            <View style={[styles.explanation, { backgroundColor: `${primary}10` }]}>
              <Text variant='caption' style={{ color: primary }}>
                {question.sample_answer}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  words: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  wordChip: {
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
  },
  options: {
    gap: SPACING.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: SPACING.sm,
    borderWidth: 1.5,
  },
  explanation: {
    padding: SPACING.sm,
    borderRadius: SPACING.sm,
  },
});
