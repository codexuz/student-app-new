import { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, GraduationCap, Lock, Play } from 'lucide-react-native';

import { CircularProgress } from '@/components/ui/circular-progress';
import { Icon } from '@/components/ui/icon';
import { RoadmapHeader } from '@/components/roadmap-header';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { ApiError } from '@/lib/api/client';
import type { RoadmapLesson, RoadmapUnit } from '@/lib/api/curriculum-types';
import { getRoadmap } from '@/lib/api/roadmap';
import { ROADMAP_UNIT_GRADIENTS } from '@/theme/colors';
import { SPACING } from '@/theme/globals';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Width of the row lesson cards align within — the screen minus the
// scroll container's horizontal padding — so connector-line coordinates
// land under the cards' actual flex-start/flex-end edges.
const SCREEN_ROW_WIDTH = SCREEN_WIDTH - SPACING.lg * 2;
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.62, 200);
const CARD_HEIGHT = 96;
const ROW_GAP = 34;

// Rotating background photos for lesson cards until each lesson carries its
// own `image_url` from the backend — swap for
// <Image source={{ uri: lesson.image_url }}> once that field exists.
const LESSON_CARD_IMAGES = [
  require('@/assets/images/roadmap/card_1.jpg'),
  require('@/assets/images/roadmap/card_2.jpg'),
  require('@/assets/images/roadmap/card_3.jpg'),
  require('@/assets/images/roadmap/card-4.jpg'),
];

function LessonStatusPill({ lesson }: { lesson: RoadmapLesson }) {
  const locked = lesson.status === 'locked';
  const label = lesson.is_completed ? 'Done' : locked ? 'Locked' : 'Start';

  return (
    <View style={[styles.pill, { backgroundColor: 'rgba(255,255,255,0.94)' }]}>
      {lesson.is_completed ? (
        <Icon name={Check} size={11} color='#16A34A' strokeWidth={3} />
      ) : locked ? (
        <Icon name={Lock} size={10} color='#334155' />
      ) : (
        <Icon name={Play} size={9} color='#0F172A' strokeWidth={2.5} />
      )}
      <Text style={[styles.pillText, { color: '#0F172A' }]}>{label}</Text>
    </View>
  );
}

function LessonCard({
  lesson,
  index,
  align,
}: {
  lesson: RoadmapLesson;
  index: number;
  align: 'left' | 'right';
}) {
  const locked = lesson.status === 'locked';
  const bgImage = LESSON_CARD_IMAGES[index % LESSON_CARD_IMAGES.length];

  return (
    <View style={[styles.lessonRowWrap, align === 'right' && styles.lessonRowRight]}>
      <Pressable
        disabled={locked}
        onPress={() =>
          router.push({ pathname: '/lesson', params: { lessonId: lesson.lesson_id } })
        }
        style={[styles.lessonCard, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
      >
        {/* Swap `source` for `{ uri: lesson.image_url }` once the backend provides it */}
        <Image
          source={bgImage}
          style={StyleSheet.absoluteFill}
          contentFit='cover'
          contentPosition='center'
          transition={150}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.lessonScrim, locked && styles.lessonScrimLocked]} />

        <View style={styles.lessonCardTop}>
          <View style={styles.lessonOrderBadge}>
            <Text style={styles.lessonOrderText}>{lesson.lesson_order}</Text>
          </View>
          {!locked ? (
            <CircularProgress
              percentage={lesson.is_completed ? 100 : lesson.task_percentage}
              size={20}
              strokeWidth={2.5}
              color='#fff'
              trackColor='rgba(255,255,255,0.3)'
            >
              {null}
            </CircularProgress>
          ) : null}
        </View>

        <View style={styles.lessonCardBottom}>
          <Text style={styles.lessonTitle} numberOfLines={1}>
            {lesson.lesson_title}
          </Text>
          <LessonStatusPill lesson={lesson} />
        </View>

        {locked ? (
          <View style={styles.lessonLockOverlay}>
            <Icon name={Lock} size={18} color='rgba(255,255,255,0.85)' />
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

// Dashed S-curve connecting the previous lesson card's bottom-center to the
// next lesson card's top-center, spanning the full row width so its
// coordinates line up with cards positioned via flex-start/flex-end.
function ZigzagConnector({
  fromAlign,
  toAlign,
}: {
  fromAlign: 'left' | 'right';
  toAlign: 'left' | 'right';
}) {
  const border = useColor('border');
  const height = ROW_GAP;
  const halfCard = CARD_WIDTH / 2;
  const startX = fromAlign === 'left' ? halfCard : SCREEN_ROW_WIDTH - halfCard;
  const endX = toAlign === 'left' ? halfCard : SCREEN_ROW_WIDTH - halfCard;

  const d = `M ${startX} 0 C ${startX} ${height * 0.6}, ${endX} ${height * 0.4}, ${endX} ${height}`;

  return (
    <View style={[styles.connectorWrap, { height }]} pointerEvents='none'>
      <Svg width={SCREEN_ROW_WIDTH} height={height}>
        <Path
          d={d}
          stroke={border}
          strokeWidth={2}
          strokeDasharray='6 7'
          fill='none'
          strokeLinecap='round'
        />
      </Svg>
    </View>
  );
}

function UnitHeroCard({ unit, colors }: { unit: RoadmapUnit; colors: [string, string] }) {
  return (
    <LinearGradient colors={colors} style={styles.unitHero}>
      <View style={{ flex: 1 }}>
        <Text style={styles.unitHeroLabel}>Unit {unit.unit_order}</Text>
        <Text style={styles.unitHeroTitle} numberOfLines={1}>
          {unit.unit_title}
        </Text>
      </View>
      <CircularProgress
        percentage={unit.percentage}
        size={34}
        strokeWidth={3}
        color='#fff'
        trackColor='rgba(255,255,255,0.28)'
      >
        <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>
          {Math.round(unit.percentage)}
        </Text>
      </CircularProgress>
    </LinearGradient>
  );
}

function UnitSection({ unit, index }: { unit: RoadmapUnit; index: number }) {
  const unitColors = ROADMAP_UNIT_GRADIENTS[index % ROADMAP_UNIT_GRADIENTS.length];

  return (
    <View style={styles.unitSection}>
      <UnitHeroCard unit={unit} colors={unitColors} />

      <View style={styles.zigzag}>
        {unit.lessons.map((lesson, i) => {
          const alignFor = (n: number): 'left' | 'right' => (n % 2 === 0 ? 'right' : 'left');
          const align = alignFor(i);
          return (
            <View key={lesson.lesson_id}>
              {i === 0 ? (
                <View style={{ height: SPACING.md }} />
              ) : (
                <ZigzagConnector fromAlign={alignFor(i - 1)} toAlign={align} />
              )}
              <LessonCard lesson={lesson} index={i} align={align} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function RoadmapScreen() {
  const { courseId, groupId } = useLocalSearchParams<{ courseId: string; groupId: string }>();
  const muted = useColor('textMuted');
  const [units, setUnits] = useState<RoadmapUnit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId || !groupId) return;
    let isMounted = true;

    getRoadmap(courseId, groupId)
      .then((data) => {
        if (isMounted) setUnits(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load your roadmap.');
      });

    return () => {
      isMounted = false;
    };
  }, [courseId, groupId]);

  if (error) {
    return (
      <View style={styles.centerFill}>
        <Stack.Screen options={{ headerShown: false }} />
        <Icon name={GraduationCap} size={40} color={muted} />
        <Text variant='subtitle' style={{ textAlign: 'center' }}>
          Couldn&apos;t load your roadmap
        </Text>
        <Text variant='caption' style={{ textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (!units) {
    return (
      <View style={styles.centerFill}>
        <Stack.Screen options={{ headerShown: false }} />
        <Spinner size='lg' />
      </View>
    );
  }

  const totalCompleted = units.reduce((sum, unit) => sum + unit.completed, 0);
  const totalLessons = units.reduce((sum, unit) => sum + unit.total, 0);
  const overallPercentage = totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <RoadmapHeader percentage={overallPercentage} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.container, { paddingTop: SPACING.lg }]}>
        {units.map((unit, index) => (
          <UnitSection key={unit.unit_id} unit={unit} index={index} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: SPACING.xl,
    padding: SPACING.lg,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },

  // Unit hero card
  unitSection: { gap: 0 },
  unitHero: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  unitHeroLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 1,
  },
  unitHeroTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Zigzag lesson chain
  zigzag: { alignItems: 'stretch' },
  connectorWrap: { width: '100%' },
  lessonRowWrap: { width: '100%', alignItems: 'flex-start' },
  lessonRowRight: { alignItems: 'flex-end' },
  lessonCard: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 10,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  lessonScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  lessonScrimLocked: { backgroundColor: 'rgba(15,23,42,0.55)' },
  lessonCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  lessonOrderBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lessonOrderText: { fontSize: 11, fontWeight: '800', color: '#0F172A' },
  lessonCardBottom: { gap: 6 },
  lessonTitle: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 16 },
  lessonLockOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pillText: { fontSize: 10, fontWeight: '700' },
});
