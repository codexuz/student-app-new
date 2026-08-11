import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CalendarDays, ChevronRight, Clock, FileText, GraduationCap, HelpCircle } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useAuth } from '@/providers/auth-provider';
import { getMyExams, type Exam, type ExamStatus } from '@/lib/api/exams';
import { BORDER_RADIUS, SPACING } from '@/theme/globals';

const STATUS_COLORS: Record<ExamStatus, string> = {
  scheduled: '#3b82f6',
  ongoing: '#10b981',
  completed: '#8b5cf6',
  cancelled: '#ef4444',
};

const DEFAULT_STATUS_COLOR = '#6b7280';
const HERO_GRADIENT: [string, string] = ['#4F46E5', '#1E1B6E'];

function formatDate(dateString?: string): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function ExamsHero({ exams }: { exams: Exam[] }) {
  const completed = exams.filter((exam) => exam.status === 'completed').length;
  const upcoming = exams.filter((exam) => exam.status === 'scheduled' || exam.status === 'ongoing').length;

  return (
    <View style={styles.heroGlow}>
      <LinearGradient colors={HERO_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroBokeh} />
        <GraduationCap size={140} color='rgba(255, 255, 255, 0.12)' style={styles.heroWatermark} />

        <Text style={styles.heroLabel}>YOUR PROGRESS</Text>
        <Text style={styles.heroTitle}>{exams.length} Exam{exams.length === 1 ? '' : 's'}</Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{completed}</Text>
            <Text style={styles.heroStatLabel}>Completed</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{upcoming}</Text>
            <Text style={styles.heroStatLabel}>Upcoming</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function ExamRow({ exam, index }: { exam: Exam; index: number }) {
  const card = useColor('card');
  const foreground = useColor('foreground');
  const muted = useColor('textMuted');
  const statusColor = exam.status ? STATUS_COLORS[exam.status] : DEFAULT_STATUS_COLOR;
  const scheduledDate = formatDate(exam.scheduled_at);

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(400)}>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: card, shadowColor: foreground, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={() => router.push({ pathname: '/exams/[id]', params: { id: String(exam.id) } })}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${statusColor}1F` }]}>
          <Icon name={FileText} size={22} color={statusColor} />
        </View>

        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.title} numberOfLines={1}>
            {exam.title}
          </Text>

          <View style={styles.metaRow}>
            {scheduledDate ? (
              <View style={styles.metaChip}>
                <Icon name={CalendarDays} size={12} color={muted} />
                <Text style={styles.metaText}>{scheduledDate}</Text>
              </View>
            ) : null}
            {exam.duration ? (
              <View style={styles.metaChip}>
                <Icon name={Clock} size={12} color={muted} />
                <Text style={styles.metaText}>{exam.duration} min</Text>
              </View>
            ) : null}
            {exam.total_questions ? (
              <View style={styles.metaChip}>
                <Icon name={HelpCircle} size={12} color={muted} />
                <Text style={styles.metaText}>{exam.total_questions}q</Text>
              </View>
            ) : null}
          </View>

          {exam.status ? (
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}1F` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.chevronWrap, { backgroundColor: `${statusColor}14` }]}>
          <Icon name={ChevronRight} size={18} color={statusColor} strokeWidth={2.5} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function ExamsScreen() {
  const { user } = useAuth();
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.user_id) return;
    getMyExams(user.user_id)
      .then(setExams)
      .catch(() => setExams([]));
  }, [user?.user_id]);

  const onRefresh = async () => {
    if (!user?.user_id) return;
    setRefreshing(true);
    try {
      setExams(await getMyExams(user.user_id));
    } catch {
      setExams([]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primary} />}
    >
      {exams === null ? (
        <>
          <Skeleton height={150} variant='rounded' />
          <Skeleton height={92} variant='rounded' />
          <Skeleton height={92} variant='rounded' />
          <Skeleton height={92} variant='rounded' />
        </>
      ) : exams.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Icon name={FileText} size={36} color={muted} />
          </View>
          <Text variant='subtitle' style={styles.emptyTitle}>
            No Exams Yet
          </Text>
          <Text variant='caption' style={styles.emptyText}>
            There are no exams available at the moment. Check back later!
          </Text>
        </View>
      ) : (
        <>
          <ExamsHero exams={exams} />
          {exams.map((exam, index) => (
            <ExamRow key={exam.id} exam={exam} index={index} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  heroGlow: {
    borderRadius: 26,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: SPACING.xs,
  },
  hero: {
    borderRadius: 26,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  heroBokeh: {
    position: 'absolute',
    top: -50,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroWatermark: {
    position: 'absolute',
    right: -24,
    bottom: -24,
    transform: [{ rotate: '-10deg' }],
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  heroStat: {
    gap: 2,
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
