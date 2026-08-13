import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { OptionCard } from '@/components/exercise/option-card';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useHaptics } from '@/hooks/useHaptics';
import { CORNERS, SPACING } from '@/theme/globals';
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

function WordChip({
  text,
  isFound,
  disabled,
  shakeNonce,
  onPress,
}: {
  text: string;
  isFound: boolean;
  disabled: boolean;
  /** Bumped by the parent each time this specific word is tapped incorrectly. */
  shakeNonce: number | null;
  onPress: () => void;
}) {
  const border = useColor('border');
  const red = useColor('red');
  const shakeX = useSharedValue(0);
  const flash = useSharedValue(0);

  useEffect(() => {
    if (shakeNonce == null) return;
    shakeX.value = withSequence(
      withTiming(-6, { duration: 45 }),
      withTiming(6, { duration: 45 }),
      withTiming(-4, { duration: 45 }),
      withTiming(4, { duration: 45 }),
      withTiming(0, { duration: 45 })
    );
    flash.value = withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 250 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shakeNonce]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
    backgroundColor: isFound ? `${red}22` : interpolateColor(flash.value, [0, 1], [`${red}00`, `${red}40`]),
  }));

  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <Animated.View style={[styles.wordChip, { borderColor: isFound ? red : border }, animatedStyle]}>
        <Text variant='body'>{text}</Text>
      </Animated.View>
    </Pressable>
  );
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
  const primary = useColor('primary');
  const feedback = useHaptics(true);
  const data = question.sentence_surgery;
  const [wrongTap, setWrongTap] = useState<{ index: number; nonce: number } | null>(null);

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
      setWrongTap((prev) => ({ index, nonce: (prev?.nonce ?? 0) + 1 }));
    }
  };

  return (
    <View style={styles.container}>
      <Text variant='caption' style={{ marginBottom: SPACING.xs }}>
        {foundError ? 'Now choose the correction:' : 'Tap the word that has a mistake.'}
      </Text>

      <View style={styles.words}>
        {tokens.map((token, index) => (
          <WordChip
            key={index}
            text={token.text}
            isFound={value.foundIndex === index}
            disabled={showResult || foundError}
            shakeNonce={wrongTap?.index === index ? wrongTap.nonce : null}
            onPress={() => tapWord(index)}
          />
        ))}
      </View>

      {foundError && (
        <View style={styles.options}>
          {data.options.map((option, index) => (
            <OptionCard
              key={index}
              label={option.text}
              isCorrectOption={option.is_correct}
              isSelected={value.selectedOptionIndex === index}
              showResult={showResult}
              onPress={() => {
                feedback('selection');
                onChange({ ...value, selectedOptionIndex: index });
              }}
            />
          ))}

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
    borderWidth: 2,
    borderRadius: CORNERS,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  options: {
    gap: SPACING.sm,
  },
  explanation: {
    padding: SPACING.sm,
    borderRadius: SPACING.sm,
  },
});
