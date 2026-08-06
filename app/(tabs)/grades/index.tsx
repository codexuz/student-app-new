import { GraduationCap } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';

export default function GradesScreen() {
  const muted = useColor('textMuted');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm }}>
      <Icon name={GraduationCap} size={40} color={muted} />
      <Text variant='subtitle'>Grades</Text>
      <Text variant='caption'>Exam results and gradings are coming soon.</Text>
    </View>
  );
}
