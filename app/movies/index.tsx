import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Eye, Film, Play } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { getMovies, type Movie } from '@/lib/api/movies';
import { SPACING } from '@/theme/globals';

const GRID_GAP = SPACING.sm;

function formatViews(views?: number): string {
  const count = views ?? 0;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

function MovieCard({ movie, width, index }: { movie: Movie; width: number; index: number }) {
  const card = useColor('card');
  const foreground = useColor('foreground');
  const height = Math.round(width * 1.2);

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).duration(400)}>
      <Pressable
        style={[styles.card, { width, backgroundColor: card, shadowColor: foreground }]}
        onPress={() => router.push({ pathname: '/movies/[id]', params: { id: movie.id } })}
      >
        <View style={{ width, height }}>
          {movie.thumbnail ? (
            <Image source={{ uri: movie.thumbnail }} style={StyleSheet.absoluteFill} contentFit='cover' />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.thumbnailFallback]}>
              <Icon name={Film} size={32} color='rgba(255, 255, 255, 0.6)' />
            </View>
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.75)']}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.topRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{movie.type === 'cartoon' ? 'CARTOON' : 'MOVIE'}</Text>
            </View>
            {movie.level ? (
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{movie.level}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.playBadge}>
            <Icon name={Play} size={18} color='#FFFFFF' fill='#FFFFFF' />
          </View>

          <View style={styles.bottomInfo}>
            <Text style={styles.movieTitle} numberOfLines={2}>
              {movie.title}
            </Text>
            <View style={styles.viewsRow}>
              <Icon name={Eye} size={12} color='rgba(255, 255, 255, 0.85)' />
              <Text style={styles.viewsText}>{formatViews(movie.views)}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function MoviesScreen() {
  const { width } = useWindowDimensions();
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const [movies, setMovies] = useState<Movie[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const cardWidth = (width - SPACING.lg * 2 - GRID_GAP) / 2;

  useEffect(() => {
    getMovies()
      .then(setMovies)
      .catch(() => setMovies([]));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setMovies(await getMovies());
    } catch {
      setMovies([]);
    } finally {
      setRefreshing(false);
    }
  };

  if (movies === null) {
    return (
      <View style={styles.skeletonGrid}>
        <View style={styles.skeletonRow}>
          <Skeleton width={cardWidth} height={cardWidth * 1.2} variant='rounded' />
          <Skeleton width={cardWidth} height={cardWidth * 1.2} variant='rounded' />
        </View>
        <View style={styles.skeletonRow}>
          <Skeleton width={cardWidth} height={cardWidth * 1.2} variant='rounded' />
          <Skeleton width={cardWidth} height={cardWidth * 1.2} variant='rounded' />
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={movies}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.columnWrapper}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primary} />}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Icon name={Film} size={36} color={muted} />
          </View>
          <Text variant='subtitle' style={styles.emptyTitle}>
            No Movies Yet
          </Text>
          <Text variant='caption' style={styles.emptyText}>
            Check back later for new content.
          </Text>
        </View>
      }
      renderItem={({ item, index }) => <MovieCard movie={item} width={cardWidth} index={index} />}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: SPACING.lg,
    gap: GRID_GAP,
  },
  columnWrapper: {
    gap: GRID_GAP,
  },
  skeletonGrid: {
    padding: SPACING.lg,
    gap: GRID_GAP,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 0.4,
  },
  thumbnailFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
  },
  topRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  typeBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  levelBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    marginTop: -20,
    marginLeft: -20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  bottomInfo: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    gap: 4,
  },
  movieTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 17,
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewsText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  emptyState: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
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
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
