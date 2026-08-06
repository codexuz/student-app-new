import { UserCog } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';

export default function EditProfileScreen() {
  const muted = useColor('textMuted');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm }}>
      <Icon name={UserCog} size={40} color={muted} />
      <Text variant='subtitle'>Edit Profile</Text>
      <Text variant='caption'>Editing your name, phone, and email is coming soon.</Text>
    </View>
  );
}
