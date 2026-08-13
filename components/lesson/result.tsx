import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DuoButton } from '@/components/lesson/duo-button';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useSoundEffect } from '@/hooks/useSoundEffect';
import type { HomeworkRewards } from '@/lib/api/curriculum-types';
import { SPACING } from '@/theme/globals';

function scoreColor(score: number, colors: { emerald: string; orange: string; red: string }) {
  if (score >= 80) return colors.emerald;
  if (score >= 50) return colors.orange;
  return colors.red;
}

interface ResultProps {
  percentage: number;
  correctCount: number;
  totalQuestions: number;
  rewards: HomeworkRewards | null;
  submitError?: string | null;
  submitting?: boolean;
  onRetry?: () => void;
  onContinue: () => void;
  continueLabel?: string;
}

/** The "you finished!" screen shown after an exercise, speaking task, or exam. */
export function Result({
  percentage,
  correctCount,
  totalQuestions,
  rewards,
  submitError,
  submitting,
  onRetry,
  onContinue,
  continueLabel = 'Continue',
}: ResultProps) {
  const primary = useColor('primary');
  const primaryForeground = useColor('primaryForeground');
  const muted = useColor('textMuted');
  const text = useColor('text');
  const border = useColor('border');
  const emerald = useColor('emerald');
  const orange = useColor('orange');
  const red = useColor('red');

  const resultColor = scoreColor(percentage, { emerald, orange, red });
  const incorrectCount = totalQuestions - correctCount;

  const playFinishSound = useSoundEffect(require('@/assets/sounds/game_end.mp3'));
  useEffect(() => {
    playFinishSound();
    // Only ever once, when the results screen first appears — not on every
    // re-render (e.g. a retry after a failed save).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <LottieView
          source={require('@/assets/animations/gift.json')}
          autoPlay
          loop={false}
          style={styles.lottie}
        />
      </View>

      <Text style={[styles.score, { color: resultColor }]}>{percentage}%</Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: emerald }]}>{correctCount}</Text>
          <Text variant='caption' style={{ color: muted }}>
            Correct
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: red }]}>{incorrectCount}</Text>
          <Text variant='caption' style={{ color: muted }}>
            Wrong
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: text }]}>{totalQuestions}</Text>
          <Text variant='caption' style={{ color: muted }}>
            Total
          </Text>
        </View>
      </View>

      {rewards && (
        <Card style={styles.rewardsCard}>
          <View style={[styles.rewardsHeader, { backgroundColor: primary }]}>
            <Text style={{ color: primaryForeground, fontWeight: '700', fontSize: 16 }}>Rewards Earned</Text>
          </View>
          <View style={styles.rewardsGrid}>
            <View style={styles.rewardItem}>
              <Image source={require('@/assets/images/point.png')} style={styles.rewardIcon} contentFit='contain' />
              <Text style={[styles.rewardValue, { color: primary }]}>+{rewards.totalEarnedPoints}</Text>
              <Text variant='caption' style={{ color: muted }}>
                XP
              </Text>
            </View>
            <View style={styles.rewardItem}>
              <Image
                source={require('@/assets/images/coin-noanimted.png')}
                style={{width: 40, height: 40}}
                contentFit='contain'
              />
              <Text style={[styles.rewardValue, { color: orange }]}>+{rewards.coins}</Text>
              <Text variant='caption' style={{ color: muted }}>
                Coins
              </Text>
            </View>
            <View style={styles.rewardItem}>
              <Image source={require('@/assets/images/fire2.png')} style={styles.rewardIcon} contentFit='contain' />
              <Text style={[styles.rewardValue, { color: orange }]}>+{rewards.streak}</Text>
              <Text variant='caption' style={{ color: muted }}>
                Streak
              </Text>
            </View>
          </View>
        </Card>
      )}

      {submitError && (
        <View style={[styles.errorBanner, { borderColor: red }]}>
          <Text variant='caption' style={{ color: red, textAlign: 'center' }}>
            {submitError}
          </Text>
          <Text variant='caption' style={{ color: muted, textAlign: 'center', marginTop: 2 }}>
            This exercise won&apos;t show as completed until it saves.
          </Text>
          {onRetry && (
            <Button variant='outline' size='sm' onPress={onRetry} disabled={submitting} style={{ marginTop: SPACING.sm }}>
              {submitting ? 'Retrying…' : 'Retry Save'}
            </Button>
          )}
        </View>
      )}

      <DuoButton color={resultColor} onPress={onContinue} style={{ marginTop: SPACING.lg }}>
        {continueLabel}
      </DuoButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  hero: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: 220,
    height: 220,
  },
  score: {
    fontSize: 56,
    fontWeight: '800',
    marginBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  rewardsCard: {
    width: '100%',
    padding: 0,
    overflow: 'hidden',
    elevation: 0,
  },
  rewardsHeader: {
    width: '100%',
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  rewardsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  rewardItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  rewardIcon: {
    width: 36,
    height: 36,
  },
  rewardValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  errorBanner: {
    width: '100%',
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: SPACING.sm,
    borderWidth: 1,
  },
});
