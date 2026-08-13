import { StyleSheet } from 'react-native';

import { AudioHeroPlayer } from '@/components/lesson/audio-hero-player';
import { OptionCard } from '@/components/exercise/option-card';
import { View } from '@/components/ui/view';
import { useHaptics } from '@/hooks/useHaptics';
import { SPACING } from '@/theme/globals';
import type { ListenAndChooseAnswer } from '@/components/exercise/answer-types';
import type { Question } from '@/lib/api/curriculum-types';

export function ListenAndChooseQuestion({
  question,
  value,
  onChange,
  showResult,
}: {
  question: Question;
  value: ListenAndChooseAnswer;
  onChange: (value: ListenAndChooseAnswer) => void;
  showResult: boolean;
}) {
  const feedback = useHaptics(true);
  const data = question.listen_and_choose;

  if (!data) return null;

  return (
    <View style={styles.container}>
      <AudioHeroPlayer url={data.audio} />

      <View style={styles.list}>
        {data.options.map((option, index) => (
          <OptionCard
            key={index}
            label={option.text}
            isCorrectOption={option.is_correct}
            isSelected={value.selectedIndex === index}
            showResult={showResult}
            onPress={() => {
              feedback('selection');
              onChange({ selectedIndex: index });
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  list: {
    gap: SPACING.sm,
  },
});
