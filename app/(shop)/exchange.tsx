import { useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Delete } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useHaptics } from '@/hooks/useHaptics';
import { useAuth } from '@/providers/auth-provider';
import { ApiError } from '@/lib/api/client';
import { exchangeToCoins, type ExchangeSource } from '@/lib/api/shop';
import { getMyStudentProfile, type StudentProfile } from '@/lib/api/student-profile';
import { CORNERS, SPACING } from '@/theme/globals';

// 1 coin = 100 points = 10 streaks (matches backend COINS_PER rates).
const RATES: Record<ExchangeSource, number> = { points: 100, streaks: 10 };
const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

export default function ExchangeScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const feedback = useHaptics();
  const insets = useSafeAreaInsets();

  const background = useColor('background');
  const foreground = useColor('foreground');
  const card = useColor('card');
  const border = useColor('border');
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const primaryForeground = useColor('primaryForeground');
  const secondary = useColor('secondary');
  const secondaryForeground = useColor('secondaryForeground');
  const orange = useColor('orange');
  const destructive = useColor('destructive');

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [source, setSource] = useState<ExchangeSource>('points');
  const [amountText, setAmountText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastGain, setLastGain] = useState(0);

  const successScale = useSharedValue(0.85);
  const successOpacity = useSharedValue(0);
  const shake = useSharedValue(0);

  const loadProfile = () => {
    if (!user?.user_id) return;
    getMyStudentProfile(user.user_id).then(setProfile).catch(() => setProfile(null));
  };

  useMemo(loadProfile, [user?.user_id]);

  const amount = parseInt(amountText, 10) || 0;
  const rate = RATES[source];
  const balance = source === 'points' ? profile?.points ?? 0 : profile?.streaks ?? 0;

  const validationError = useMemo(() => {
    if (!amountText) return null;
    if (amount <= 0) return 'Enter an amount greater than 0.';
    if (amount % rate !== 0) return `Must be a multiple of ${rate}.`;
    if (amount > balance) return `Insufficient ${source} balance.`;
    return null;
  }, [amountText, amount, rate, source, balance]);

  const coinsGained = amount > 0 && amount % rate === 0 ? amount / rate : 0;
  const canSubmit = amount > 0 && !validationError && !isSubmitting;

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const successStyle = useAnimatedStyle(() => ({
    opacity: successOpacity.value,
    transform: [{ scale: successScale.value }],
  }));

  const handleKeyPress = (key: string) => {
    feedback('selection');
    if (key === '') return;
    if (key === 'del') {
      setAmountText((t) => t.slice(0, -1));
      return;
    }
    setAmountText((t) => (t === '0' ? key : t + key).slice(0, 6));
  };

  const handleSourceChange = (next: ExchangeSource) => {
    feedback('selection');
    setSource(next);
    setAmountText('');
  };

  const runShake = () => {
    shake.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const handleSubmit = async () => {
    if (amount <= 0) return;
    if (validationError) {
      feedback('error');
      runShake();
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await exchangeToCoins(source, amount);
      setProfile(updated);
      setLastGain(coinsGained);
      setAmountText('');
      feedback('success');
      setShowSuccess(true);
      successOpacity.value = withTiming(1, { duration: 220 });
      successScale.value = withSpring(1, { damping: 14, stiffness: 180 });
    } catch (error) {
      feedback('error');
      toast.error('Exchange failed', error instanceof ApiError ? error.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSuccess = () => {
    successOpacity.value = withTiming(0, { duration: 160 });
    successScale.value = withTiming(0.85, { duration: 160 });
    setTimeout(() => setShowSuccess(false), 160);
  };

  const sourceImage =
    source === 'points'
      ? require('@/assets/images/point.png')
      : require('@/assets/images/fire2.png');

  return (
    <View style={{ flex: 1, backgroundColor: background }}>
      <LinearGradient
        colors={source === 'points' ? ['#F59E0B22', 'transparent'] : [`${orange}22`, 'transparent']}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={[styles.glassButton, { backgroundColor: `${foreground}14`, borderColor: `${foreground}1F` }]}
        >
          <Icon name={ArrowLeft} size={20} color={foreground} />
        </Pressable>
        <Text variant='subtitle' style={styles.headerTitle}>
          Redeem Coins
        </Text>
        <View style={{width: 40, height: 40}} />
      </View>

      <View style={styles.body}>
        <View style={styles.balanceBlock}>
          <Text variant='caption' style={{ color: muted }}>
            Your Coin Balance
          </Text>
          <View style={styles.balanceRow}>
            <Image source={require('@/assets/images/coin.png')} style={styles.coinHero} contentFit='contain' />
            <Text style={styles.coinBalance}>{profile?.coins ?? 0}</Text>
          </View>
        </View>

        <View style={[styles.segmentRow, { backgroundColor: secondary }]}>
          {(['points', 'streaks'] as ExchangeSource[]).map((s) => {
            const active = source === s;
            return (
              <Pressable
                key={s}
                onPress={() => handleSourceChange(s)}
                style={[styles.segmentButton, active && { backgroundColor: card }]}
              >
                <Image
                  source={s === 'points' ? require('@/assets/images/point.png') : require('@/assets/images/fire2.png')}
                  style={[styles.segmentIcon, !active && styles.segmentIconInactive]}
                  contentFit='contain'
                />
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? foreground : secondaryForeground },
                  ]}
                >
                  {s === 'points' ? 'Points' : 'Streaks'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Animated.View style={[styles.amountCard, { backgroundColor: card, borderColor: border }, shakeStyle]}>
          <View style={styles.amountRow}>
            <Image source={sourceImage} style={styles.amountIcon} contentFit='contain' />
            <Text style={styles.amountText} numberOfLines={1}>
              {amountText || '0'}
            </Text>
          </View>
          <Text variant='caption' style={{ color: validationError ? destructive : muted }}>
            {validationError ?? `Balance: ${balance} ${source} available`}
          </Text>

          <View style={[styles.previewDivider, { backgroundColor: border }]} />

          <View style={styles.previewRow}>
            <Text variant='caption' style={{ color: muted }}>
              You&apos;ll receive
            </Text>
            <View style={styles.previewValue}>
              <Image source={require('@/assets/images/coin-noanimted.png')} style={styles.coinSmall} contentFit='contain' />
              <Text style={styles.previewCoins}>{coinsGained}</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.keypad}>
          {KEYPAD_ROWS.map((row, ri) => (
            <View key={ri} style={styles.keypadRow}>
              {row.map((key, ki) =>
                key === '' ? (
                  <View key={ki} style={styles.keypadKey} />
                ) : (
                  <Pressable
                    key={ki}
                    onPress={() => handleKeyPress(key)}
                    style={({ pressed }) => [
                      styles.keypadKey,
                      pressed && { backgroundColor: `${foreground}0D` },
                    ]}
                  >
                    {key === 'del' ? (
                      <Icon name={Delete} size={22} color={foreground} />
                    ) : (
                      <Text style={styles.keypadText}>{key}</Text>
                    )}
                  </Pressable>
                )
              )}
            </View>
          ))}
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[
            styles.submitButton,
            { backgroundColor: primary },
            !canSubmit && styles.submitButtonDisabled,
          ]}
        >
          <Text style={[styles.submitText, { color: primaryForeground }]}>
            {isSubmitting ? 'Redeeming…' : 'Redeem'}
          </Text>
        </Pressable>

      </View>

      {showSuccess && (
        <View style={styles.successOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSuccess} />
          <Animated.View style={[styles.successCard, { backgroundColor: card }, successStyle]}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text variant='title' style={{ textAlign: 'center' }}>
              Redeem successful
            </Text>
            <Text variant='caption' style={{ textAlign: 'center', color: muted }}>
              {lastGain} coins were added to your balance.
            </Text>
            <Pressable onPress={closeSuccess} style={[styles.successButton, { backgroundColor: primary }]}>
              <Text style={{ color: primaryForeground, fontWeight: '700' }}>Done</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontWeight: '700',
  },
  glassButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  balanceBlock: {
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.xs,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  coinHero: {
    width: 40,
    height: 40,
  },
  coinBalance: {
    fontSize: 34,
    fontWeight: '800',
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: CORNERS,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: CORNERS - 4,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
  },
  segmentIcon: {
    width: 18,
    height: 18,
  },
  segmentIconInactive: {
    opacity: 0.6,
  },
  amountCard: {
    borderRadius: CORNERS,
    borderWidth: 1,
    padding: SPACING.md,
    gap: 4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  amountText: {
    fontSize: 34,
    fontWeight: '800',
    flexShrink: 1,
  },
  amountIcon: {
    width: 26,
    height: 26,
  },
  previewDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: SPACING.sm,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinSmall: {
    width: 20,
    height: 20,
  },
  previewCoins: {
    fontSize: 18,
    fontWeight: '800',
  },
  keypad: {
    gap: SPACING.xs,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  keypadKey: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  keypadText: {
    fontSize: 22,
    fontWeight: '600',
  },
  submitButton: {
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
  },
  successOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  successCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: CORNERS,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  successEmoji: {
    fontSize: 40,
  },
  successButton: {
    marginTop: SPACING.sm,
    width: '100%',
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
