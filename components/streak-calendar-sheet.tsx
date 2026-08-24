import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useAuth } from '@/providers/auth-provider';
import { getStreakCalendar } from '@/lib/api/student-profile';
import { SPACING } from '@/theme/globals';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// Fixed pixel size for the day-of-month circles, instead of a percentage of
// the flex-sized dayCell — percentage width/height + borderRadius doesn't
// always re-resolve on the same layout pass when the week grid's row count
// changes (4 vs 5 vs 6 weeks across months), which showed up as circles
// rendering as squares right after switching months.
const SHEET_HORIZONTAL_PADDING = 16; // BottomSheet content padding
const CALENDAR_CARD_PADDING = SPACING.md;
const DAY_CELL_SIZE =
  (Dimensions.get('window').width - SHEET_HORIZONTAL_PADDING * 2 - CALENDAR_CARD_PADDING * 2) / 7;
const DAY_CIRCLE_SIZE = Math.round(DAY_CELL_SIZE * 0.78);

// Shows the streak count directly (no count-up animation, which would take
// longer and longer to settle as the streak grows) with just a UI-thread
// scale "pop" whenever the value changes.
function AnimatedStreakCount({ value, color }: { value: number; color: string }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(withTiming(1.15, { duration: 120 }), withTiming(1, { duration: 200 }));
  }, [value, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text style={[styles.countText, { color }, animatedStyle]}>
      {value}
    </Animated.Text>
  );
}

interface StreakCalendarSheetProps {
  isVisible: boolean;
  onClose: () => void;
  streak: number;
}

export function StreakCalendarSheet({ isVisible, onClose, streak }: StreakCalendarSheetProps) {
  const { user } = useAuth();
  const orange = useColor('orange');
  const card = useColor('card');
  const border = useColor('border');
  const muted = useColor('textMuted');
  const lottieRef = useRef<LottieView>(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set());
  const [isLoadingDates, setIsLoadingDates] = useState(true);

  // Reset to the current month each time the sheet is reopened. Adjusting
  // state during render on a prop transition (rather than in an effect)
  // resolves before paint instead of causing an extra post-commit render.
  // Tracked with `useState` rather than a ref — React Compiler (enabled for
  // this project) disallows reading refs during render.
  const [prevVisible, setPrevVisible] = useState(isVisible);
  if (prevVisible !== isVisible) {
    setPrevVisible(isVisible);
    if (isVisible) {
      setYear(now.getFullYear());
      setMonth(now.getMonth() + 1);
    }
  }

  // Same pattern for the loading flag: flip it back on as soon as the fetch
  // key (which user/month we're about to load) changes, rather than
  // synchronously inside the effect that kicks off the request below.
  const fetchKey = isVisible && user?.user_id ? `${user.user_id}:${year}:${month}` : null;
  const [prevFetchKey, setPrevFetchKey] = useState<string | null>(null);
  if (prevFetchKey !== fetchKey) {
    setPrevFetchKey(fetchKey);
    if (fetchKey) setIsLoadingDates(true);
  }

  useEffect(() => {
    if (!isVisible || !user?.user_id) return;
    let isMounted = true;

    getStreakCalendar(user.user_id, year, month)
      .then((days) => {
        if (isMounted) setActiveDates(new Set(days.map((d) => d.active_date.slice(0, 10))));
      })
      .catch(() => {
        if (isMounted) setActiveDates(new Set());
      })
      .finally(() => {
        if (isMounted) setIsLoadingDates(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isVisible, user?.user_id, year, month]);

  useEffect(() => {
    if (isVisible) lottieRef.current?.play();
  }, [isVisible]);

  const goToPrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const startWeekday = firstOfMonth.getDay(); // 0 = Sunday

    const cells: (number | null)[] = [
      ...Array(startWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [year, month]);

  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose} snapPoints={[0.75]}>
      <View style={styles.streakHeader}>
        {Platform.OS === 'ios' ? (
          <Image
            source={require('@/assets/images/fire2.png')}
            style={styles.fireLottie}
            contentFit='contain'
          />
        ) : (
          <LottieView
            ref={lottieRef}
            source={require('@/assets/animations/fire.json')}
            loop
            autoPlay
            style={styles.fireLottie}
          />
        )}
        <View style={styles.countWrap}>
          <AnimatedStreakCount value={streak} color={orange} />
        </View>
        <Text variant='caption'>day streak</Text>
      </View>

      <View style={[styles.calendarCard, { backgroundColor: card, borderColor: border }]}>
        <View style={styles.monthRow}>
          <Pressable onPress={goToPrevMonth} hitSlop={8} style={styles.monthArrow}>
            <Icon name={ChevronLeft} size={20} color={muted} />
          </Pressable>
          <Text variant='body' style={{ fontWeight: '700' }}>
            {MONTH_LABELS[month - 1]} {year}
          </Text>
          <Pressable onPress={goToNextMonth} hitSlop={8} style={styles.monthArrow}>
            <Icon name={ChevronRight} size={20} color={muted} />
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map((label, i) => (
            <Text key={i} variant='caption' style={styles.weekdayCell}>
              {label}
            </Text>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, di) => {
              if (day === null) return <View key={di} style={styles.dayCell} />;

              if (isLoadingDates) {
                return (
                  <View key={di} style={styles.dayCell}>
                    <Skeleton
                      width={DAY_CIRCLE_SIZE}
                      height={DAY_CIRCLE_SIZE}
                      style={{ borderRadius: DAY_CIRCLE_SIZE / 2 }}
                    />
                  </View>
                );
              }

              const dateKey = `${year}-${pad(month)}-${pad(day)}`;
              const isActive = activeDates.has(dateKey);
              const isToday = dateKey === todayKey;

              return (
                <View key={di} style={styles.dayCell}>
                  <View
                    style={[
                      styles.dayCircle,
                      isActive && { backgroundColor: orange },
                      !isActive && isToday && { borderWidth: 1.5, borderColor: orange },
                    ]}
                  >
                    <Text
                      variant='caption'
                      style={[
                        styles.dayText,
                        isActive && { color: '#fff', fontWeight: '700' },
                        !isActive && isToday && { color: orange, fontWeight: '700' },
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  streakHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  fireLottie: {
    width: 120,
    height: 120,
  },
  countWrap: {
    marginTop: -SPACING.sm,
    alignItems: 'center',
  },
  countText: {
    fontSize: 48,
    fontWeight: '800',
  },
  calendarCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: SPACING.md,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  monthArrow: {
    padding: SPACING.xs,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayCell: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: DAY_CIRCLE_SIZE,
    height: DAY_CIRCLE_SIZE,
    borderRadius: DAY_CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 13,
  },
});
