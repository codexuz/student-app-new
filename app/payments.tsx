import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { CreditCard, Receipt } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { ApiError } from '@/lib/api/client';
import { getMyPayments, type Payment } from '@/lib/api/payments';
import { useAuth } from '@/providers/auth-provider';
import { SPACING } from '@/theme/globals';

function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PaymentsScreen() {
  const { user } = useAuth();
  const { toast } = useToast();
  const primary = useColor('primary');
  const border = useColor('border');
  const muted = useColor('textMuted');
  const background = useColor('background');
  const green = useColor('green');
  const orange = useColor('orange');
  const red = useColor('red');

  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPayments = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      const data = await getMyPayments(user.user_id);
      setPayments(data);
    } catch (err) {
      const description =
        err instanceof ApiError ? err.message : 'Failed to load payment history.';
      toast({ variant: 'error', title: 'Error', description });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.user_id, toast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPayments();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
        return green;
      case 'pending':
        return orange;
      case 'overdue':
      case 'failed':
        return red;
      default:
        return muted;
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
        data={payments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name={CreditCard} size={48} color={muted} />
            <Text variant='subtitle' style={styles.emptyTitle}>
              No Payments Found
            </Text>
            <Text variant='caption' style={styles.emptyText}>
              Your payment history will appear here once you make your first transaction.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusColor = getStatusColor(item.status);
          return (
            <Card style={{ ...styles.card, borderColor: border }}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.iconBadge, { backgroundColor: `${statusColor}1A` }]}>
                    <Icon name={Receipt} size={20} color={statusColor} />
                  </View>
                  <View style={styles.headerText}>
                    <Text style={styles.amount}>{item.amount.toLocaleString()} UZS</Text>
                    <Text variant='caption' style={{fontSize: 16}}>{formatDate(item.payment_date)}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1A` }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: border }]} />

              <View style={styles.details}>
                {item.payment_method && (
                  <View style={styles.detailRow}>
                    <Text variant='caption' style={{fontSize: 16}}>Method</Text>
                    <Text style={styles.detailValue}>{item.payment_method}</Text>
                  </View>
                )}
                {item.manager && (
                  <View style={styles.detailRow}>
                    <Text variant='caption' style={{fontSize: 16}}>Manager</Text>
                    <Text style={styles.detailValue}>
                      {item.manager.first_name} {item.manager.last_name}
                    </Text>
                  </View>
                )}
                {item.next_payment_date && (
                  <View style={styles.detailRow}>
                    <Text variant='caption' style={{fontSize: 16}}>Next Payment</Text>
                    <Text style={styles.detailValue}>{formatDate(item.next_payment_date)}</Text>
                  </View>
                )}
                {item.notes && (
                  <View style={styles.detailRow}>
                    <Text variant='caption' style={{fontSize: 16}}>Notes</Text>
                    <Text style={styles.detailValue} numberOfLines={2}>
                      {item.notes}
                    </Text>
                  </View>
                )}
              </View>
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
  card: {
    borderWidth: 1,
    marginBottom: SPACING.md,
    elevation: 0.4
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  iconBadge: {
    padding: 10,
    borderRadius: 12,
  },
  headerText: {
    flex: 1,
  },
  amount: {
    fontSize: 17,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    marginVertical: SPACING.md,
  },
  details: {
    gap: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
});
