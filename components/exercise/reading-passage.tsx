import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { BookOpen, ChevronRight } from 'lucide-react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';

function splitParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

interface ReadingPassageProps {
  title: string;
  content: string;
}

/** A tap-to-expand passage — kept out of the way while answering, but one tap away for re-reading. */
export function ReadingPassage({ title, content }: ReadingPassageProps) {
  const [open, setOpen] = useState(false);
  const primary = useColor('primary');
  const secondary = useColor('secondary');
  const muted = useColor('textMuted');
  const paragraphs = splitParagraphs(content);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [pressed && styles.pressed]}>
        <Card style={styles.card}>
          <View style={styles.header}>
            <View style={[styles.iconBadge, { backgroundColor: secondary }]}>
              <Icon name={BookOpen} size={18} color={primary} />
            </View>
            <Text variant='body' style={{ fontWeight: '700', flex: 1 }}>
              Reading Passage
            </Text>
            <Icon name={ChevronRight} size={18} color={muted} />
          </View>
          <Text variant='caption' style={{ color: muted }} numberOfLines={2}>
            {paragraphs[0] ?? content}
          </Text>
        </Card>
      </Pressable>

      <BottomSheet
        isVisible={open}
        onClose={() => setOpen(false)}
        snapPoints={[0.9]}
        title={title}
        disablePanGesture
      >
        <View style={styles.passageContainer}>
          {paragraphs.map((paragraph, index) => (
            <Text key={index} variant='body' style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.75,
  },
  card: {
    gap: SPACING.xs,
    elevation: 0,
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passageContainer: {
    gap: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  paragraph: {
    lineHeight: 27,
  },
});
