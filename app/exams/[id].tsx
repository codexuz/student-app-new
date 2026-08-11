import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { CalendarDays, LayoutGrid, MessageCircle, RotateCcw } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { CircularProgress } from '@/components/ui/circular-progress';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useAuth } from '@/providers/auth-provider';
import { getExamResult, type ExamResult } from '@/lib/api/exams';
import { SPACING } from '@/theme/globals';

function getScoreColor(percentage: number, colors: { green: string; blue: string; orange: string; red: string }) {
  if (percentage >= 90) return colors.green;
  if (percentage >= 70) return colors.blue;
  if (percentage >= 60) return colors.orange;
  return colors.red;
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ExamResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const green = useColor('green');
  const blue = useColor('blue');
  const orange = useColor('orange');
  const red = useColor('red');
  const muted = useColor('textMuted');
  const primary = useColor('primary');

  const [result, setResult] = useState<ExamResult | null | undefined>(undefined);

  useEffect(() => {
    if (!id || !user?.user_id) return;
    getExamResult(id, user.user_id)
      .then(setResult)
      .catch(() => setResult(null));
  }, [id, user?.user_id]);

  if (result === undefined) {
    return (
      <View style={styles.center}>
        <Spinner size='lg' />
      </View>
    );
  }

  if (result === null) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIconWrap}>
          <Icon name={RotateCcw} size={32} color={muted} />
        </View>
        <Text variant='subtitle' style={styles.centerText}>
          No results yet
        </Text>
        <Text variant='caption' style={styles.centerText}>
          Results will show up here once this exam has been graded.
        </Text>
      </View>
    );
  }

  const percentage = Math.round(result.percentage ?? 0);
  const scoreColor = getScoreColor(percentage, { green, blue, orange, red });
  const passed = (result.result || '').toLowerCase() === 'passed';
  const resultColor = passed ? green : red;
  const heroGradient: [string, string] = [scoreColor, '#0B1220'];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      <Animated.View entering={FadeInDown.delay(80).duration(450)} style={styles.heroGlow}>
        <LinearGradient
          colors={heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBokeh} />

          <View style={[styles.resultBadge, { backgroundColor: resultColor }]}>
            <Text style={styles.resultText}>{(result.result || 'unknown').toUpperCase()}</Text>
          </View>

          <Text style={styles.examTitle} numberOfLines={2}>
            {result.exam?.title || 'Exam Assessment'}
          </Text>

          <View style={styles.scoreRing}>
            <CircularProgress
              percentage={percentage}
              size={156}
              strokeWidth={13}
              color='#FFFFFF'
              trackColor='rgba(255, 255, 255, 0.22)'
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.scorePercentage}>{percentage}%</Text>
                <Text style={styles.scoreLabel}>Score</Text>
              </View>
            </CircularProgress>
          </View>

          <Text style={styles.scoreText}>
            {result.score ?? 0} / {result.max_score ?? 0} points
          </Text>

          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Icon name={LayoutGrid} size={13} color='#FFFFFF' />
              <Text style={styles.chipText}>{result.exam?.level || 'N/A'}</Text>
            </View>
            <View style={styles.chip}>
              <Icon name={CalendarDays} size={13} color='#FFFFFF' />
              <Text style={styles.chipText}>{formatDate(result.created_at)}</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {result.feedback ? (
        <Animated.View entering={FadeIn.delay(300).duration(450)}>
          <Card
            style={{
              ...styles.feedbackCard,
              backgroundColor: `${primary}12`,
              borderWidth: 1,
              borderColor: `${primary}30`,
            }}
          >
            <MessageCircle
              size={90}
              color={`${primary}14`}
              style={styles.feedbackWatermark}
            />
            <View style={styles.feedbackHeader}>
              <View style={[styles.feedbackIconWrap, { backgroundColor: `${primary}22` }]}>
                <Icon name={MessageCircle} size={16} color={primary} />
              </View>
              <Text variant='subtitle' style={{ color: primary }}>
                Teacher&apos;s Feedback
              </Text>
            </View>
            <Text style={styles.feedbackText}>{result.feedback}</Text>
          </Card>
        </Animated.View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    gap: SPACING.md,
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
  heroGlow: {
    borderRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  hero: {
    alignItems: 'center',
    borderRadius: 28,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  heroBokeh: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  resultBadge: {
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: SPACING.md,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  examTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  scoreRing: {
    marginBottom: SPACING.md,
  },
  scorePercentage: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: -2,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: SPACING.md,
  },
  chipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  feedbackCard: {
    gap: SPACING.sm,
    elevation: 0,
    overflow: 'hidden',
  },
  feedbackWatermark: {
    position: 'absolute',
    right: -20,
    bottom: -24,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  feedbackIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackText: {
    lineHeight: 20,
  },
});
