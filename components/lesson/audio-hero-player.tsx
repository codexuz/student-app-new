import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pause, Play } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';
import { formatPlaybackTime } from './format-time';

interface AudioHeroPlayerProps {
  url: string;
}

const BAR_COUNT = 32;
const MAX_BAR_HEIGHT = 28;
const MIN_BAR_HEIGHT_RATIO = 0.28;

/**
 * Deterministic pseudo-random bar heights seeded by the clip's URL — the
 * backend gives us no real amplitude data, so this is a stand-in waveform
 * (stable per clip, not reshuffled on every render) rather than a flat bar.
 */
function useWaveform(seed: string, count: number): number[] {
  return useMemo(() => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    let state = (hash >>> 0) || 1;
    const heights: number[] = [];
    for (let i = 0; i < count; i++) {
      // xorshift32 — a tiny, dependency-free deterministic PRNG.
      state ^= state << 13;
      state >>>= 0;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      heights.push(MIN_BAR_HEIGHT_RATIO + (state / 4294967296) * (1 - MIN_BAR_HEIGHT_RATIO));
    }
    return heights;
  }, [seed, count]);
}

/**
 * A Telegram-style voice-message bubble: circular play/pause button, a
 * tap-to-seek waveform that fills as playback progresses, and a time label.
 */
export function AudioHeroPlayer({ url }: AudioHeroPlayerProps) {
  const primary = useColor('primary');
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const bars = useWaveform(url, BAR_COUNT);
  const [trackWidth, setTrackWidth] = useState(0);

  const togglePlay = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || status.currentTime >= status.duration) {
      player.seekTo(0);
    }
    player.play();
  };

  const seekToFraction = (fraction: number) => {
    if (status.duration > 0) {
      player.seekTo(status.duration * Math.min(Math.max(fraction, 0), 1));
    }
  };

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;
  const timeLabel = formatPlaybackTime(status.currentTime > 0 ? status.currentTime : status.duration);

  return (
    <View style={[styles.bubble, { backgroundColor: primary }]}>
      <Pressable onPress={togglePlay} style={styles.playButton} hitSlop={8}>
        <Icon name={status.playing ? Pause : Play} size={18} color={primary} />
      </Pressable>

      <View style={styles.trackColumn}>
        <Pressable
          onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
          onPress={(e) => {
            if (trackWidth > 0) seekToFraction(e.nativeEvent.locationX / trackWidth);
          }}
          style={styles.waveform}
          hitSlop={6}
        >
          {bars.map((height, index) => (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  height: height * MAX_BAR_HEIGHT,
                  backgroundColor: index / bars.length <= progress ? '#fff' : 'rgba(255,255,255,0.35)',
                },
              ]}
            />
          ))}
        </Pressable>
        <Text style={styles.timeText}>{timeLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackColumn: {
    flex: 1,
    gap: 4,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: MAX_BAR_HEIGHT,
  },
  bar: {
    flex: 1,
    minWidth: 2,
    borderRadius: 2,
  },
  timeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
});
