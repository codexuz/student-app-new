import { useCallback, useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LeaderboardHexagonAvatar } from '@/components/leaderboard-hexagon-avatar';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useAuth } from '@/providers/auth-provider';
import {
  getOverallLeaderboard,
  getWeeklyLeaderboard,
  type LeaderboardUser,
  type OverallLeaderboardEntry,
  type WeeklyLeaderboardEntry,
} from '@/lib/api/leaderboard';
import { SPACING } from '@/theme/globals';

type Period = 'weekly' | 'overall';

// A normalized row shape both endpoints get mapped into, since their raw
// shapes differ (overall: flat points/coins/streaks; weekly: weekly_points
// nested alongside the lifetime profile).
interface LeaderboardRow {
  user_id: string;
  user: LeaderboardUser;
  points: number;
}

function normalizeOverall(entries: OverallLeaderboardEntry[]): LeaderboardRow[] {
  return entries.map((e) => ({ user_id: e.user_id, user: e.user, points: e.points }));
}

function normalizeWeekly(entries: WeeklyLeaderboardEntry[]): LeaderboardRow[] {
  return entries.map((e) => ({ user_id: e.user_id, user: e.user, points: e.weekly_points }));
}

function displayName(user: LeaderboardUser): string {
  const full = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  return full || user.username;
}

const PAGE_SIZE = 20;
const LOAD_MORE_THRESHOLD_PX = 200;

const PODIUM_COLORS: Record<number, string> = {
  1: '#F59E0B',
  2: '#38BDF8',
  3: '#F472B6',
};

function PodiumSlot({ row, rank }: { row: LeaderboardRow; rank: number }) {
  const size = rank === 1 ? 88 : 72;
  const color = PODIUM_COLORS[rank];

  return (
    <View style={[styles.podiumSlot, rank === 1 && styles.podiumSlotFirst]}>
      <LeaderboardHexagonAvatar
        size={size}
        avatarUrl={row.user.avatar_url}
        fallbackLetter={displayName(row.user).charAt(0).toUpperCase()}
        borderColor={color}
        rank={rank}
        rankColor={color}
      />
      <Text style={styles.podiumName} numberOfLines={1}>
        {displayName(row.user)}
      </Text>
      <View style={styles.podiumXpRow}>
        <Icon name={Zap} size={12} color='#FACC15' />
        <Text style={styles.podiumXp}>{row.points} XP</Text>
      </View>
    </View>
  );
}

const RANK_RING_COLORS = ['#4ADE80', '#22C55E', '#16A34A'];

function RankRow({ row, rank, isCurrentUser }: { row: LeaderboardRow; rank: number; isCurrentUser: boolean }) {
  const card = useColor('card');
  const border = useColor('border');
  const text = useColor('text');
  const ringColor = RANK_RING_COLORS[rank % RANK_RING_COLORS.length];

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: card },
        isCurrentUser && { borderWidth: 1.5, borderColor: '#22C55E' },
      ]}
    >
      <View style={[styles.rankCircle, { borderColor: ringColor }]}>
        <Text style={[styles.rankCircleText, { color: ringColor }]}>{rank}</Text>
      </View>

      {row.user.avatar_url ? (
        <Image source={{ uri: row.user.avatar_url }} style={styles.rowAvatar} contentFit='cover' />
      ) : (
        <View style={[styles.rowAvatar, styles.rowAvatarFallback, { backgroundColor: border }]}>
          <Text style={{ fontWeight: '700', color: text }}>
            {displayName(row.user).charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <Text style={[styles.rowName, { color: text }]} numberOfLines={1}>
        {displayName(row.user)}
        {isCurrentUser ? ' (You)' : ''}
      </Text>

      <View style={styles.rowXpWrap}>
        <Icon name={Zap} size={13} color='#F59E0B' />
        <Text style={styles.rowXp}>{row.points} XP</Text>
      </View>
    </View>
  );
}

function fetchPeriod(p: Period, limit: number): Promise<LeaderboardRow[]> {
  return p === 'weekly'
    ? getWeeklyLeaderboard(limit).then(normalizeWeekly)
    : getOverallLeaderboard(limit).then(normalizeOverall);
}

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const green = useColor('green');
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('weekly');
  const [prevPeriod, setPrevPeriod] = useState<Period>(period);
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // The backend only accepts a growing `limit`, not a cursor/offset — each
  // "load more" refetches from scratch with a bigger limit and replaces rows.
  const limitRef = useRef(PAGE_SIZE);

  // Reset paging state synchronously during render when `period` changes,
  // rather than inside the effect below — React re-renders immediately with
  // the reset state before painting, so this avoids both an extra committed
  // render and the set-state-in-effect lint rule.
  if (period !== prevPeriod) {
    setPrevPeriod(period);
    setRows(null);
    setHasMore(true);
  }

  useEffect(() => {
    limitRef.current = PAGE_SIZE;
    fetchPeriod(period, PAGE_SIZE)
      .then((data) => {
        setRows(data);
        setHasMore(data.length >= PAGE_SIZE);
      })
      .catch(() => {
        setRows([]);
        setHasMore(false);
      });
  }, [period]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || rows === null) return;
    setIsLoadingMore(true);
    const nextLimit = limitRef.current + PAGE_SIZE;

    fetchPeriod(period, nextLimit)
      .then((data) => {
        limitRef.current = nextLimit;
        setRows(data);
        setHasMore(data.length >= nextLimit);
      })
      .catch(() => {
        setHasMore(false);
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  }, [period, isLoadingMore, hasMore, rows]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchPeriod(period, PAGE_SIZE);
      limitRef.current = PAGE_SIZE;
      setRows(data);
      setHasMore(data.length >= PAGE_SIZE);
    } catch {
      setRows([]);
      setHasMore(false);
    } finally {
      setRefreshing(false);
    }
  }, [period]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distanceFromBottom < LOAD_MORE_THRESHOLD_PX) {
        loadMore();
      }
    },
    [loadMore]
  );

  const top3 = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];
  // Podium display order: 2nd, 1st, 3rd (matches the reference layout).
  const podiumOrder = [top3[1], top3[0], top3[2]];

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#22C55E', '#15803D']} style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <Text style={styles.headerTitle}>Leaderboard</Text>

        <View style={styles.toggleRow}>
          {(['weekly', 'overall'] as Period[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.toggleButton, period === p && styles.toggleButtonActive]}
            >
              <Text style={[styles.toggleText, period === p && styles.toggleTextActive]}>
                {p === 'weekly' ? 'This Week' : 'All Time'}
              </Text>
            </Pressable>
          ))}
        </View>

        {rows === null ? (
          <View style={styles.podiumRow}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width={72} height={110} variant='rounded' style={{ opacity: 0.2 }} />
            ))}
          </View>
        ) : top3.length > 0 ? (
          <View style={styles.podiumRow}>
            {podiumOrder.map((row, i) =>
              row ? (
                <PodiumSlot key={row.user_id} row={row} rank={i === 1 ? 1 : i === 0 ? 2 : 3} />
              ) : (
                <View key={i} style={styles.podiumSlot} />
              )
            )}
          </View>
        ) : (
          <Text style={styles.emptyPodiumText}>No rankings yet this period.</Text>
        )}
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        onScroll={onScroll}
        scrollEventThrottle={100}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={green} />}
      >
        {rows === null ? (
          <View style={styles.centerFill}>
            <Spinner size='lg' />
          </View>
        ) : (
          <>
            {rest.map((row, i) => (
              <RankRow key={row.user_id} row={row} rank={i + 4} isCurrentUser={row.user_id === user?.user_id} />
            ))}
            {isLoadingMore ? (
              <View style={styles.loadMoreFooter}>
                <Spinner size='sm' />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    padding: 3,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  toggleButtonActive: {
    backgroundColor: '#fff',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  toggleTextActive: {
    color: '#15803D',
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
    width: '100%',
  },
  podiumSlot: {
    alignItems: 'center',
    gap: 4,
    width: 88,
  },
  podiumSlotFirst: {
    marginBottom: 12,
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  podiumXpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  podiumXp: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  emptyPodiumText: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: SPACING.md,
  },
  list: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  centerFill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.xl,
  },
  loadMoreFooter: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: 16,
  },
  rankCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankCircleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  rowAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  rowXpWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowXp: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
});
