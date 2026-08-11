import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Package } from 'lucide-react-native';

import { BottomSheet, useBottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useAuth } from '@/providers/auth-provider';
import { ApiError } from '@/lib/api/client';
import {
  getShopCategories,
  getShopItems,
  purchaseItem,
  type ShopCategory,
  type ShopItem,
} from '@/lib/api/shop';
import { getMyStudentProfile } from '@/lib/api/student-profile';
import { SPACING } from '@/theme/globals';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = SPACING.sm;
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - GRID_GAP) / 2;

function ItemCard({ item, onPress }: { item: ShopItem; onPress: () => void }) {
  const card = useColor('card');
  const border = useColor('border');
  const muted = useColor('textMuted');
  const yellow = useColor('yellow');
  const outOfStock = item.stock != null && item.stock <= 0;

  return (
    <Pressable onPress={onPress} style={[styles.card, { width: CARD_WIDTH, backgroundColor: card }]}>
      <View style={[styles.cardImageWrap, { backgroundColor: border }]}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} contentFit='cover' />
        ) : (
          <Icon name={Package} size={28} color={muted} />
        )}
        {item.stock != null && (
          <View style={[styles.stockBadge, outOfStock && styles.stockBadgeEmpty]}>
            <Text style={styles.stockBadgeText}>{outOfStock ? 'Out of stock' : `${item.stock} left`}</Text>
          </View>
        )}
      </View>
      <Text variant='body' style={styles.cardName} numberOfLines={1}>
        {item.name}
      </Text>
      <View style={styles.cardPriceRow}>
        <Image source={require('@/assets/images/coin-noanimted.png')} style={styles.coinIconMd} contentFit='contain' />
        <Text style={[styles.cardPrice, { color: yellow }]}>{item.price}</Text>
      </View>
    </Pressable>
  );
}

export default function ShopScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const muted = useColor('textMuted');
  const border = useColor('border');
  const yellow = useColor('yellow');
  const destructive = useColor('destructive');
  const primary = useColor('primary');

  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [prevActiveCategory, setPrevActiveCategory] = useState(activeCategory);
  const [items, setItems] = useState<ShopItem[] | null>(null);
  const [coins, setCoins] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const confirmSheet = useBottomSheet();

  const loadBalance = useCallback(() => {
    if (!user?.user_id) return;
    getMyStudentProfile(user.user_id)
      .then((profile) => setCoins(profile?.coins ?? 0))
      .catch(() => setCoins(0));
  }, [user]);

  useEffect(() => {
    getShopCategories().catch(() => []).then((data) => setCategories(data ?? []));
    loadBalance();
  }, [loadBalance]);

  // Reset the grid to loading synchronously during render when the active
  // category changes, rather than inside the effect below — avoids both an
  // extra committed render and the set-state-in-effect lint rule.
  if (activeCategory !== prevActiveCategory) {
    setPrevActiveCategory(activeCategory);
    setItems(null);
  }

  useEffect(() => {
    getShopItems(activeCategory ? { categoryId: activeCategory } : undefined)
      .then(setItems)
      .catch(() => setItems([]));
  }, [activeCategory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [categoriesData, itemsData] = await Promise.all([
        getShopCategories().catch(() => []),
        getShopItems(activeCategory ? { categoryId: activeCategory } : undefined).catch(() => []),
      ]);
      setCategories(categoriesData ?? []);
      setItems(itemsData);
      loadBalance();
    } finally {
      setRefreshing(false);
    }
  }, [activeCategory, loadBalance]);

  const openConfirm = useCallback(
    (item: ShopItem) => {
      setSelectedItem(item);
      confirmSheet.open();
    },
    [confirmSheet]
  );

  const canAfford = selectedItem != null && coins != null && coins >= selectedItem.price;

  const handleBuy = useCallback(async () => {
    if (!selectedItem) return;
    setIsBuying(true);
    try {
      await purchaseItem(selectedItem.id, 1);
      confirmSheet.close();
      toast.success('Order placed', 'Your order will be delivered once an admin approves it.');
      loadBalance();
      setItems((prev) => prev?.map((it) => (it.id === selectedItem.id && it.stock != null ? { ...it, stock: Math.max(0, (it.stock ?? 0) - 1) } : it)) ?? null);
    } catch (error) {
      toast.error('Purchase failed', error instanceof ApiError ? error.message : 'Please try again.');
    } finally {
      setIsBuying(false);
    }
  }, [selectedItem, confirmSheet, toast, loadBalance]);

  const gridRows = useMemo(() => {
    if (!items) return [];
    const rows: ShopItem[][] = [];
    for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
    return rows;
  }, [items]);

  return (
    <View style={{ flex: 1 }}>
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
          style={styles.categoryScroll}
        >
          <Pressable
            onPress={() => setActiveCategory(null)}
            style={[styles.categoryChip, { borderColor: border }, activeCategory === null && styles.categoryChipActive]}
          >
            <Text style={[styles.categoryChipText, activeCategory === null && styles.categoryChipTextActive]}>All</Text>
          </Pressable>
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setActiveCategory(cat.id)}
              style={[styles.categoryChip, { borderColor: border }, activeCategory === cat.id && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryChipText, activeCategory === cat.id && styles.categoryChipTextActive]}>{cat.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primary} />}
      >
        {items === null ? (
          <View style={styles.gridRow}>
            <Skeleton width={CARD_WIDTH} height={150} variant='rounded' />
            <Skeleton width={CARD_WIDTH} height={150} variant='rounded' />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name={Package} size={40} color={muted} />
            <Text variant='caption'>No items available yet.</Text>
          </View>
        ) : (
          gridRows.map((row, i) => (
            <View key={i} style={styles.gridRow}>
              {row.map((item) => (
                <ItemCard key={item.id} item={item} onPress={() => openConfirm(item)} />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <BottomSheet isVisible={confirmSheet.isVisible} onClose={confirmSheet.close} snapPoints={[0.45]}>
        {selectedItem && (
          <View style={{ gap: SPACING.md, paddingBottom: SPACING.md }}>
            <Text variant='title' style={{ textAlign: 'center' }}>
              {selectedItem.name}
            </Text>
            <View style={styles.confirmPriceRow}>
              <Image source={require('@/assets/images/coin.png')} style={styles.coinIconLg} contentFit='contain' />
              <Text style={[styles.confirmPrice, { color: yellow }]}>{selectedItem.price} coins</Text>
            </View>
            {!canAfford && (
              <Text variant='caption' style={{ textAlign: 'center', color: destructive }}>
                You have {coins ?? 0} coins — not enough. Exchange points or streaks for more.
              </Text>
            )}
            <View style={{ gap: SPACING.sm }}>
              {canAfford ? (
                <Button variant='default' size='lg' loading={isBuying} onPress={handleBuy} style={{ width: '100%' }}>
                  Confirm Purchase
                </Button>
              ) : (
                <Button
                  variant='default'
                  size='lg'
                  onPress={() => {
                    confirmSheet.close();
                    router.push('/(shop)/exchange');
                  }}
                  style={{ width: '100%' }}
                >
                  Exchange for Coins
                </Button>
              )}
              <Button variant='secondary' size='lg' onPress={confirmSheet.close} style={{ width: '100%' }}>
                Cancel
              </Button>
            </View>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  coinIconMd: {
    width: 30,
    height: 30,
  },
  coinIconLg: {
    width: 60,
    height: 60,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  categoryChipActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  grid: {
    padding: SPACING.lg,
    gap: GRID_GAP,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  card: {
    borderRadius: 16,
    padding: 10,
    gap: 6,
  },
  cardImageWrap: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  stockBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockBadgeEmpty: {
    backgroundColor: 'rgba(220,38,38,0.85)',
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  cardName: {
    fontWeight: '600',
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.xl,
    width: '100%',
  },
  confirmPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmPrice: {
    fontSize: 18,
    fontWeight: '800',
  },
});
