import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { History, TrendingDown, TrendingUp } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { ApiError } from '@/lib/api/client';
import {
  getActivityTransactions,
  type ActivityTransaction,
} from '@/lib/api/activity-transactions';
import { useAuth } from '@/providers/auth-provider';
import { SPACING } from '@/theme/globals';

const PAGE_SIZE = 20;

function formatSource(source: string | null): string {
  if (!source) return 'Activity';
  return source
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ActivityHistoryScreen() {
  const { user } = useAuth();
  const { toast } = useToast();
  const primary = useColor('primary');
  const border = useColor('border');
  const muted = useColor('textMuted');
  const background = useColor('background');
  const green = useColor('green');
  const red = useColor('red');
  const yellow = useColor('yellow');

  const [transactions, setTransactions] = useState<ActivityTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const userId = user?.user_id;

  const loadPage = useCallback(
    async (offset: number) => {
      if (!userId) return;
      const page = await getActivityTransactions(userId, PAGE_SIZE, offset);
      setTransactions((prev) => (offset === 0 ? page.rows : [...prev, ...page.rows]));
      setTotalCount(page.count);
    },
    [userId]
  );

  useEffect(() => {
    if (!userId) return;
    // Fetches directly (rather than via `loadPage`) so the setState calls
    // live in this effect's own .then/.finally — calling a component-scoped
    // callback that sets state internally trips the set-state-in-effect lint.
    getActivityTransactions(userId, PAGE_SIZE, 0)
      .then((page) => {
        setTransactions(page.rows);
        setTotalCount(page.count);
      })
      .catch((err) => {
        const description = err instanceof ApiError ? err.message : 'Failed to load activity history.';
        toast({ variant: 'error', title: 'Error', description });
      })
      .finally(() => setIsLoading(false));
  }, [userId, toast]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadPage(0);
    } catch (err) {
      const description = err instanceof ApiError ? err.message : 'Failed to load activity history.';
      toast({ variant: 'error', title: 'Error', description });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || isLoading || transactions.length >= totalCount) return;
    setIsLoadingMore(true);
    try {
      await loadPage(transactions.length);
    } catch {
      // Silent — the user can retry by scrolling again.
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size='lg' />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={primary} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={handleLoadMore}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size='small' color={primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name={History} size={48} color={muted} />
            <Text variant='subtitle' style={styles.emptyTitle}>
              No Activity Yet
            </Text>
            <Text variant='caption' style={styles.emptyText}>
              Your coins and points activity will appear here as you earn and spend them.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isEarn = item.direction === 'earn';
          const directionColor = isEarn ? green : red;
          const currencyLabel = item.currency === 'coins' ? 'Coins' : 'Points';

          return (
            <Card style={{ ...styles.card, borderColor: border }}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBadge, { backgroundColor: `${directionColor}1A` }]}>
                    {item.currency === 'coins' ? (
                      <Image
                        source={require('@/assets/images/coin-noanimted.png')}
                        style={styles.coinIcon}
                        contentFit='contain'
                      />
                    ) : (
                      <Icon
                        name={isEarn ? TrendingUp : TrendingDown}
                        size={20}
                        color={directionColor}
                      />
                    )}
                  </View>
                  <View style={styles.textBlock}>
                    <Text style={styles.source}>{formatSource(item.source)}</Text>
                    <Text variant='caption' style={{ fontSize: 13 }}>
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                </View>
                <View style={styles.amountBlock}>
                  <Text style={[styles.amount, { color: directionColor }]}>
                    {isEarn ? '+' : '-'}
                    {item.amount.toLocaleString()}
                  </Text>
                  <Text variant='caption' style={{ fontSize: 11, color: yellow }}>
                    {currencyLabel}
                  </Text>
                </View>
              </View>

              {item.balance_after !== null && (
                <>
                  <View style={[styles.divider, { backgroundColor: border }]} />
                  <View style={styles.balanceRow}>
                    <Text variant='caption' style={{ fontSize: 12 }}>
                      Balance after
                    </Text>
                    <Text style={styles.balanceValue}>
                      {item.balance_after.toLocaleString()} {currencyLabel.toLowerCase()}
                    </Text>
                  </View>
                </>
              )}
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: SPACING.md,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.xs,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  footerLoading: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  card: {
    borderWidth: 1,
    marginBottom: SPACING.md,
    elevation: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinIcon: {
    width: 24,
    height: 24,
  },
  textBlock: {
    flex: 1,
  },
  source: {
    fontSize: 15,
    fontWeight: '600',
  },
  amountBlock: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 17,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: SPACING.sm,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceValue: {
    fontSize: 12,
    fontWeight: '500',
  },
});
