import { Pressable, StyleSheet } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pause, Play } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * A single play/pause button + elapsed-time label backed by one `expo-audio`
 * player. Mount a fresh instance per clip (e.g. keyed by question id) rather
 * than swapping `url` on a shared instance — simpler than tracking `replace()`.
 */
export function AudioPlayer({ url, compact = false }: { url: string; compact?: boolean }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const primary = useColor('primary');
  const primaryForeground = useColor('primaryForeground');
  const muted = useColor('textMuted');

  const toggle = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || status.currentTime >= status.duration) {
      player.seekTo(0);
    }
    player.play();
  };

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <Pressable
        onPress={toggle}
        style={[styles.button, compact && styles.buttonCompact, { backgroundColor: primary }]}
        hitSlop={8}
      >
        <Icon name={status.playing ? Pause : Play} size={compact ? 14 : 16} color={primaryForeground} />
      </Pressable>
      {!compact && (
        <Text variant='caption' style={{ color: muted }}>
          {formatTime(status.currentTime)} / {formatTime(status.duration)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rowCompact: {
    gap: SPACING.xs,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompact: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
});
