import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Package, Receipt } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { getMyPurchases, type PurchaseStatus, type ShopPurchase } from '@/lib/api/shop';
import { SPACING } from '@/theme/globals';

const STATUS_COLORS: Record<PurchaseStatus, string> = {
  pending: '#F59E0B',
  approved: '#22C55E',
  rejected: '#DC2626',
  delivered: '#2563EB',
};

const STATUS_LABELS: Record<PurchaseStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  delivered: 'Delivered',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function PurchaseRow({ purchase }: { purchase: ShopPurchase }) {
  const card = useColor('card');
  const border = useColor('border');
  const muted = useColor('textMuted');
  const statusColor = STATUS_COLORS[purchase.status];

  return (
    <View style={[styles.row, { backgroundColor: card }]}>
      <View style={[styles.imageWrap, { backgroundColor: border }]}>
        {purchase.item?.image_url ? (
          <Image source={{ uri: purchase.item.image_url }} style={styles.image} contentFit='cover' />
        ) : (
          <Icon name={Package} size={20} color={muted} />
        )}
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.topRow}>
          <Text variant='body' style={styles.itemName} numberOfLines={1}>
            {purchase.item?.name ?? 'Item'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[purchase.status]}</Text>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.priceRow}>
            <Image source={require('@/assets/images/coin-noanimted.png')} style={styles.coinIcon} contentFit='contain' />
            <Text style={styles.priceText}>{purchase.total_price}</Text>
          </View>
          <Text variant='caption'>×{purchase.quantity}</Text>
          <Text variant='caption'>{formatDate(purchase.createdAt)}</Text>
        </View>

        {purchase.admin_note ? (
          <Text variant='caption' style={styles.adminNote}>
            {purchase.admin_note}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function PurchasesScreen() {
  const muted = useColor('textMuted');
  const [purchases, setPurchases] = useState<ShopPurchase[] | null>(null);

  useEffect(() => {
    getMyPurchases()
      .then(setPurchases)
      .catch(() => setPurchases([]));
  }, []);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      {purchases === null ? (
        <>
          <Skeleton height={72} variant='rounded' />
          <Skeleton height={72} variant='rounded' />
          <Skeleton height={72} variant='rounded' />
        </>
      ) : purchases.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name={Receipt} size={40} color={muted} />
          <Text variant='caption'>No orders yet.</Text>
        </View>
      ) : (
        purchases.map((purchase) => <PurchaseRow key={purchase.id} purchase={purchase} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: 16,
  },
  imageWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  itemName: {
    flex: 1,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  coinIcon: {
    width: 30,
    height: 30,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  adminNote: {
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.xl,
  },
});
