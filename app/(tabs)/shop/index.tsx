import { ShoppingBag } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';

export default function ShopScreen() {
  const muted = useColor('textMuted');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm }}>
      <Icon name={ShoppingBag} size={40} color={muted} />
      <Text variant='subtitle'>Shop</Text>
      <Text variant='caption'>Spend your coins on rewards — coming soon.</Text>
    </View>
  );
}
