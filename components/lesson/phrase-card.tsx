import { StyleSheet } from 'react-native';

import { AudioPlayer } from '@/components/ui/audio-player';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';

interface PhraseCardProps {
  phrase: string;
  audioUrl?: string | null;
  current: number;
  total: number;
  /** Plays the clip as soon as this card mounts — pass a `key` at the call site (e.g. the question id) so it re-fires per item. */
  autoPlay?: boolean;
}

/** Duolingo's "listen and repeat" phrase display. */
export function PhraseCard({ phrase, audioUrl, current, total, autoPlay = false }: PhraseCardProps) {
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const secondary = useColor('secondary');

  return (
    <Card style={styles.card}>
      <Text variant='caption' style={{ color: muted }}>
        Phrase {current} of {total}
      </Text>
      <Text variant='title' style={styles.phrase}>
        {phrase}
      </Text>
      {!!audioUrl && (
        <View style={[styles.audioPill, { backgroundColor: secondary }]}>
          <AudioPlayer url={audioUrl} compact autoPlay={autoPlay} />
          <Text variant='caption' style={{ color: primary, fontWeight: '600' }}>
            Listen
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: SPACING.md,
    elevation: 0.2,
  },
  phrase: {
    textAlign: 'center',
  },
  audioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingLeft: SPACING.xs,
    paddingRight: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
  },
});
