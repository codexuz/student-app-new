import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView as RNScrollView,
  StyleSheet,
} from 'react-native';
import { Headphones, Mic, PenLine, SpellCheck } from 'lucide-react-native';
import type { LucideProps } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useAuth } from '@/providers/auth-provider';
import { getStudentHomeworkStats } from '@/lib/api/homework';
import type { HomeworkSection, HomeworkStats } from '@/lib/api/curriculum-types';
import { SPACING } from '@/theme/globals';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_WIDTH = SCREEN_WIDTH - SPACING.lg * 2;
const CARD_GAP = SPACING.sm;
const CARD_WIDTH = (PAGE_WIDTH - CARD_GAP) / 2;

// Reading is intentionally excluded — only these four sections render as cards.
const SKILLS: { key: HomeworkSection; label: string; icon: React.ComponentType<LucideProps>; color: string }[] = [
  { key: 'grammar', label: 'Grammar', icon: SpellCheck, color: '#FB923C' },
  { key: 'listening', label: 'Listening', icon: Headphones, color: '#4ADE80' },
  { key: 'speaking', label: 'Speaking', icon: Mic, color: '#C084FC' },
  { key: 'writing', label: 'Writing', icon: PenLine, color: '#60A5FA' },
];

// Two cards per swipeable page, so 4 skills become 2 pages.
const PAGES = [SKILLS.slice(0, 2), SKILLS.slice(2, 4)];

function SkillCard({
  label,
  icon,
  percentage,
  accentColor,
}: {
  label: string;
  icon: React.ComponentType<LucideProps>;
  percentage: number;
  accentColor: string;
}) {
  return (
    <View style={[styles.card, { width: CARD_WIDTH }]}>
      <View style={styles.cardTop}>
        <Icon name={icon} size={16} color={accentColor} />
        <Text style={styles.cardLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.cardPercentage, { color: accentColor }]}>{percentage}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${percentage}%`, backgroundColor: accentColor },
          ]}
        />
      </View>
    </View>
  );
}

export function RoadmapSkillStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<HomeworkStats | null>(null);
  const [page, setPage] = useState(0);
  const scrollRef = useRef<RNScrollView>(null);

  useEffect(() => {
    if (!user?.user_id) return;
    let isMounted = true;

    getStudentHomeworkStats(user.user_id)
      .then((data) => {
        if (isMounted) setStats(data);
      })
      .catch(() => {
        if (isMounted) setStats(null);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.user_id]);

  const onMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / PAGE_WIDTH);
    setPage(index);
  }, []);

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={{ width: PAGE_WIDTH, flexGrow: 0 }}
      >
        {PAGES.map((skills, pi) => (
          <View key={pi} style={[styles.page, { width: PAGE_WIDTH }]}>
            {skills.map(({ key, label, icon, color }) => {
              if (!stats) {
                return (
                  <Skeleton
                    key={key}
                    width={CARD_WIDTH}
                    height={64}
                    variant='rounded'
                    style={{ opacity: 0.15 }}
                  />
                );
              }
              const percentage = Math.round(stats.sections[key]?.average ?? 0);
              return (
                <SkillCard key={key} label={label} icon={icon} percentage={percentage} accentColor={color} />
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: CARD_GAP,
  },
  card: {
    padding: 12,
    gap: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  cardPercentage: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 16,
    backgroundColor: '#fff',
  },
});
