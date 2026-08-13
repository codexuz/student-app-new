import { StyleSheet } from 'react-native';

import { OptionCard } from '@/components/exercise/option-card';
import { View } from '@/components/ui/view';
import { useHaptics } from '@/hooks/useHaptics';
import { SPACING } from '@/theme/globals';
import type { MultipleChoiceAnswer } from '@/components/exercise/answer-types';
import type { Question } from '@/lib/api/curriculum-types';

export function MultipleChoiceQuestion({
  question,
  value,
  onChange,
  showResult,
}: {
  question: Question;
  value: MultipleChoiceAnswer;
  onChange: (value: MultipleChoiceAnswer) => void;
  showResult: boolean;
}) {
  const feedback = useHaptics(true);
  const choices = question.choices ?? [];

  return (
    <View style={styles.list}>
      {choices.map((choice) => (
        <OptionCard
          key={choice.id}
          label={choice.option_text}
          isCorrectOption={choice.is_correct}
          isSelected={value.selectedChoiceId === choice.id}
          showResult={showResult}
          onPress={() => {
            feedback('selection');
            onChange({ selectedChoiceId: choice.id });
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: SPACING.sm,
  },
});
