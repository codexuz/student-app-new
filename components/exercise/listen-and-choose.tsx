import { Pressable, StyleSheet } from 'react-native';
import { Check, X } from 'lucide-react-native';

import { AudioPlayer } from '@/components/ui/audio-player';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useHaptics } from '@/hooks/useHaptics';
import { SPACING } from '@/theme/globals';
import type { ListenAndChooseAnswer } from '@/components/exercise/answer-types';
import type { Question } from '@/lib/api/curriculum-types';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

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
  const card = useColor('card');
  const border = useColor('border');
  const primary = useColor('primary');
  const primaryForeground = useColor('primaryForeground');
  const green = useColor('green');
  const red = useColor('red');
  const feedback = useHaptics(true);
  const data = question.listen_and_choose;

  if (!data) return null;

  return (
    <View style={styles.container}>
      <AudioPlayer url={data.audio} />

      <View style={styles.list}>
        {data.options.map((option, index) => {
          const isSelected = value.selectedIndex === index;
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
                onChange({ selectedIndex: index });
              }}
              style={[styles.option, { backgroundColor, borderColor }]}
            >
              <View style={[styles.letterBadge, { backgroundColor: isSelected ? primary : border }]}>
                <Text style={{ color: isSelected ? primaryForeground : undefined, fontWeight: '700' }}>
                  {LETTERS[index] ?? index + 1}
                </Text>
              </View>
              <Text variant='body' style={{ flex: 1 }}>
                {option.text}
              </Text>
              {revealCorrect && <Icon name={Check} size={18} color={green} />}
              {revealWrong && <Icon name={X} size={18} color={red} />}
            </Pressable>
          );
        })}
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: SPACING.sm,
    borderWidth: 1.5,
  },
  letterBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
