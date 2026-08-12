import { StyleSheet } from 'react-native';
import type { LucideProps } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';

interface FeedbackCardProps {
  icon: React.ComponentType<LucideProps>;
  iconColor: string;
  title: string;
  feedback: string;
  /** Optional score badge shown beside the title, e.g. for a per-criterion breakdown. */
  score?: number;
}

/** A titled feedback block used on graded result screens (writing, speaking). */
export function FeedbackCard({ icon, iconColor, title, feedback, score }: FeedbackCardProps) {
  const muted = useColor('textMuted');

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name={icon} size={18} color={iconColor} />
          <Text variant='body' style={{ fontWeight: '700' }}>
            {title}
          </Text>
        </View>
        {score != null && <Text style={{ fontWeight: '700', color: iconColor }}>{score}%</Text>}
      </View>
      <Text variant='body' style={{ color: muted, lineHeight: 22 }}>
        {feedback}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.sm,
    elevation: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
});
