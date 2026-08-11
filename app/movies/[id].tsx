import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AlertCircle, Clapperboard, Eye, LayoutGrid } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { getMovieById, incrementMovieView, type MovieDetail } from '@/lib/api/movies';
import { SPACING } from '@/theme/globals';

function formatViews(views?: number): string {
  const count = views ?? 0;
  return count.toLocaleString();
}

function VideoHero({ url, height }: { url: string; height: number }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height }}
      nativeControls
      contentFit='contain'
    />
  );
}

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const card = useColor('card');
  const muted = useColor('textMuted');
  const primary = useColor('primary');

  const [movie, setMovie] = useState<MovieDetail | null | undefined>(undefined);
  const viewedRef = useRef(false);
  const thumbnailHeight = Math.round(width * 0.62);

  useEffect(() => {
    if (!id) return;
    getMovieById(id)
      .then(setMovie)
      .catch(() => setMovie(null));
  }, [id]);

  useEffect(() => {
    if (!id || viewedRef.current) return;
    viewedRef.current = true;
    incrementMovieView(id).catch(() => {});
  }, [id]);

  if (movie === undefined) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.container, { paddingTop: insets.top }]}>
        <Skeleton height={Math.round(width * 0.62)} variant='rounded' />
        <Skeleton height={28} width='70%' variant='rounded' />
        <Skeleton height={72} variant='rounded' />
      </ScrollView>
    );
  }

  if (movie === null) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIconWrap}>
          <Icon name={AlertCircle} size={32} color={muted} />
        </View>
        <Text variant='subtitle' style={styles.centerText}>
          Movie not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scrollContent, { paddingTop: SPACING.xl + insets.bottom }]}
    >
      {movie.url ? (
        <VideoHero url={movie.url} height={thumbnailHeight} />
      ) : (
        <View style={{ width: '100%', height: thumbnailHeight }}>
          {movie.thumbnail ? (
            <Image source={{ uri: movie.thumbnail }} style={StyleSheet.absoluteFill} contentFit='cover' />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.thumbnailFallback]}>
              <Icon name={Clapperboard} size={40} color='rgba(255, 255, 255, 0.6)' />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.55)']}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.content}>
        <Text style={styles.title}>{movie.title}</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: card }]}>
            <Icon name={Eye} size={16} color={primary} />
            <Text style={styles.statValue} numberOfLines={1}>
              {formatViews(movie.views)}
            </Text>
            <Text variant='caption' style={styles.statLabel}>
              Views
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: card }]}>
            <Icon name={LayoutGrid} size={16} color={primary} />
            <Text style={styles.statValue} numberOfLines={1}>
              {movie.level || 'N/A'}
            </Text>
            <Text variant='caption' style={styles.statLabel}>
              Level
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: card }]}>
            <Icon name={Clapperboard} size={16} color={primary} />
            <Text style={styles.statValue} numberOfLines={1}>
              {movie.type === 'cartoon' ? 'Cartoon' : 'Movie'}
            </Text>
            <Text variant='caption' style={styles.statLabel}>
              Type
            </Text>
          </View>
        </View>

        {movie.description ? (
          <View style={styles.descriptionBlock}>
            <Text variant='subtitle' style={styles.descriptionTitle}>
              About
            </Text>
            <Text style={styles.descriptionText}>{movie.description}</Text>
          </View>
        ) : null}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  centerText: {
    textAlign: 'center',
  },
  emptyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(107, 114, 128, 0.12)',
    marginBottom: SPACING.xs,
  },
  thumbnailFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    borderRadius: 16,
    paddingVertical: SPACING.sm,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  descriptionBlock: {
    gap: SPACING.xs,
  },
  descriptionTitle: {
    marginBottom: 2,
  },
  descriptionText: {
    lineHeight: 21,
  },
});
