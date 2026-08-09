import { useEffect, useRef } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import LottieView, { type AnimationObject } from 'lottie-react-native';

import { StreakCalendarSheet } from '@/components/streak-calendar-sheet';
import { useBottomSheet } from '@/components/ui/bottom-sheet';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { SPACING } from '@/theme/globals';

interface AutoPlayLottieProps {
  source: AnimationObject;
  style: { width: number; height: number };
  loop?: boolean;
}

// `autoPlay` on LottieView can silently no-op if the view mounts before its
// native layer is measured (common inside nested flex rows) — kicking off
// `.play()` from an effect after mount is the reliable way to start it.
function AutoPlayLottie({ source, style, loop = true }: AutoPlayLottieProps) {
  const ref = useRef<LottieView>(null);

  useEffect(() => {
    ref.current?.play();
  }, []);

  return <LottieView ref={ref} source={source} loop={loop} style={style} />;
}

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${amount}`;
}

function StreakChip({ value, onPress }: { value: number; onPress: () => void }) {
  const card = useColor('card');
  const foreground = useColor('foreground');

  return (
    <Pressable style={[styles.chip, { backgroundColor: card }]} onPress={onPress}>
      <AutoPlayLottie
        source={require('@/assets/animations/fire.json')}
        style={styles.statLottie}
      />
      <Text variant='body' style={[styles.chipText, { color: foreground }]}>
        {formatAmount(value)}
      </Text>
    </Pressable>
  );
}

function CoinsChip({ value }: { value: number }) {
  const card = useColor('card');
  const foreground = useColor('foreground');

  return (
    <View style={[styles.chip, { backgroundColor: card }]}>
      <AutoPlayLottie
        source={require('@/assets/animations/coin.json')}
        style={styles.coinLottie}
        loop={false}
      />
      <Text variant='body' style={[styles.chipText, { color: foreground }]}>
        {formatAmount(value)}
      </Text>
    </View>
  );
}

interface HomeHeaderProps {
  firstName: string;
  avatarUrl?: string;
  streak: number;
  coins: number;
}

export function HomeHeader({ firstName, avatarUrl, streak, coins }: HomeHeaderProps) {
  const primary = useColor('primary');
  const foreground = useColor('foreground');
  const avatarLetter = firstName.charAt(0).toUpperCase();
  const streakSheet = useBottomSheet();

  return (
    <View style={styles.container}>
      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: primary }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarLetter}>{avatarLetter}</Text>
          )}
        </View>
        <View style={{ flexShrink: 1 }}>
          <View style={styles.helloRow}>
            <Text variant='caption' style={{color: foreground, fontWeight: 600}}>Hello,</Text>
            <AutoPlayLottie
              source={require('@/assets/animations/wave.json')}
              style={styles.waveLottie}
              loop={false}
            />
          </View>
          <Text variant='subtitle' numberOfLines={1} ellipsizeMode='tail'>
            {firstName}
          </Text>
        </View>
      </View>

      <View style={styles.stats}>
        <StreakChip value={streak} onPress={streakSheet.open} />
        <CoinsChip value={coins} />
      </View>

      <StreakCalendarSheet
        isVisible={streakSheet.isVisible}
        onClose={streakSheet.close}
        streak={streak}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    marginRight: SPACING.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  stats: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: {
    fontWeight: '700',
    fontSize: 14,
    minWidth: 28,
  },
  statLottie: {
    width: 28,
    height: 28,
  },
  coinLottie: {
    width: 44,
    height: 44,
    margin: -8,
  },
  helloRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waveLottie: {
    width: 20,
    height: 20,
    marginLeft: 2,
  },
});
