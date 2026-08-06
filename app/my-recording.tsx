import { Mic } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';

export default function MyRecordingScreen() {
  const muted = useColor('textMuted');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm }}>
      <Icon name={Mic} size={40} color={muted} />
      <Text variant='subtitle'>My Recordings</Text>
      <Text variant='caption'>Your speaking recordings are coming soon.</Text>
    </View>
  );
}
