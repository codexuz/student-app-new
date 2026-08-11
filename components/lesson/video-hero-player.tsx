import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useEvent } from 'expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import Slider from '@react-native-community/slider';
import { Maximize2, Pause, Play } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';
import { formatPlaybackTime } from './format-time';

interface VideoHeroPlayerProps {
  title: string;
  url: string;
}

/**
 * Rounded video card with a custom overlay: centered play/pause, a bottom
 * scrim carrying the section title, and a scrubber row (play toggle, elapsed
 * time, seek bar, fullscreen). Controls hide while playing and reveal again
 * on tap, auto-hiding after a few seconds.
 */
export function VideoHeroPlayer({ title, url }: VideoHeroPlayerProps) {
  const primary = useColor('text');
  const videoRef = useRef<VideoView>(null);
  const player = useVideoPlayer(url, (p) => {
    p.timeUpdateEventInterval = 0.25;
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { currentTime } = useEvent(player, 'timeUpdate', {
    currentTime: player.currentTime,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: player.bufferedPosition,
  });

  // Controls are always visible while paused (derived straight from
  // `isPlaying`, no effect needed for that half). While playing they hide —
  // immediately on pressing play, or a couple seconds after being tapped
  // back into view via `tempRevealed` — so the overlay doesn't permanently
  // cover the video.
  const [tempRevealed, setTempRevealed] = useState(false);
  const showControls = !isPlaying || tempRevealed;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  useEffect(() => clearHideTimer, []);

  const togglePlay = () => {
    if (isPlaying) {
      player.pause();
      return;
    }
    if (player.duration > 0 && currentTime >= player.duration) {
      // eslint-disable-next-line react-hooks/immutability -- expo-video's documented seek API, see the scrubber's onSlidingComplete below.
      player.currentTime = 0;
    }
    player.play();
    clearHideTimer();
    setTempRevealed(false);
  };

  const revealControls = () => {
    setTempRevealed(true);
    clearHideTimer();
    hideTimer.current = setTimeout(() => setTempRevealed(false), 2500);
  };

  return (
    <View style={styles.videoCard}>
      <VideoView
        ref={videoRef}
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls={false}
        contentFit='cover'
      />

      {!showControls && (
        <Pressable style={StyleSheet.absoluteFill} onPress={revealControls} />
      )}

      {showControls && (
        <>
          <LinearGradient
            colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.8)']}
            style={StyleSheet.absoluteFill}
            pointerEvents='none'
          />

          <Pressable onPress={togglePlay} style={styles.playButtonWrap} hitSlop={16}>
            <View style={[styles.playButton, { backgroundColor: primary }]}>
              <Icon name={isPlaying ? Pause : Play} size={26} color='#fff' />
            </View>
          </Pressable>

          <View style={styles.bottomOverlay}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.scrubberRow}>
              <Pressable onPress={togglePlay} hitSlop={8}>
                <Icon name={isPlaying ? Pause : Play} size={16} color='#fff' />
              </Pressable>
              <Text style={styles.scrubberTime}>
                {formatPlaybackTime(currentTime)} / {formatPlaybackTime(player.duration)}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={player.duration || 1}
                value={currentTime}
                minimumTrackTintColor='#fff'
                maximumTrackTintColor='rgba(255,255,255,0.35)'
                thumbTintColor='#fff'
                onSlidingComplete={(value) => {
                  // expo-video's documented seek API — assigning `currentTime` seeks the
                  // player, it isn't React state the compiler needs to track.
                  // eslint-disable-next-line react-hooks/immutability
                  player.currentTime = value;
                }}
              />
              <Pressable onPress={() => videoRef.current?.enterFullscreen()} hitSlop={8}>
                <Icon name={Maximize2} size={16} color='#fff' />
              </Pressable>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  videoCard: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    justifyContent: 'flex-end',
  },
  playButtonWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  bottomOverlay: {
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scrubberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  scrubberTime: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  slider: {
    flex: 1,
    height: 24,
  },
});
