import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Sparkles } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';

export default function HomeScreen() {
  const primary = useColor('primary');
  const accent = useColor('accent');
  const muted = useColor('textMuted');

  return (
    <View style={styles.container}>
      <Text variant='heading'>Welcome back</Text>

      <Pressable onPress={() => router.push('/(ai-chat)')}>
        <Card>
          <View style={styles.cardRow}>
            <View style={[styles.iconBadge, { backgroundColor: accent }]}>
              <Icon name={Sparkles} size={22} color={primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text variant='body' style={{ fontWeight: '600' }}>
                AI Chat
              </Text>
              <Text variant='caption' style={{ marginTop: 2 }}>
                Ask your AI tutor about grammar, vocabulary, or IELTS prep
              </Text>
            </View>

            <Icon name={ChevronRight} size={20} color={muted} />
          </View>
        </Card>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
