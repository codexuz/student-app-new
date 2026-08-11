import { useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Hash,
  Percent,
} from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useHaptics } from '@/hooks/useHaptics';
import { ApiError } from '@/lib/api/client';
import {
  getGroupGradingsTable,
  type GradingCell,
  type GradingStudentRow,
  type GroupGradingsTable,
} from '@/lib/api/gradings';
import { SPACING } from '@/theme/globals';

type Mode = 'percent' | 'grade';

const ROW_HEIGHT = 60;
const HEADER_HEIGHT = 36;
const LEFT_COL_WIDTH = 150;
const DATE_COL_WIDTH = 64;
const CIRCLE_SIZE = 38;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDateOnly(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Parses a `YYYY-MM-DD` string as a local-time Date (avoids the UTC-parsing
 * day-shift that `new Date('YYYY-MM-DD')` causes in negative-UTC timezones). */
function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function formatDateColumnLabel(value: string): string {
  return parseDateOnly(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

function getStudentDisplayName(row: GradingStudentRow): string {
  if (row.first_name) {
    return row.last_name ? `${row.first_name.charAt(0)}. ${row.last_name}` : row.first_name;
  }
  return row.username || 'Student';
}

export default function GradesScreen() {
  const background = useColor('background');
  const border = useColor('border');
  const muted = useColor('textMuted');
  const primary = useColor('primary');

  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [prevMonthDate, setPrevMonthDate] = useState(monthDate);
  const [mode, setMode] = useState<Mode>('percent');
  const [data, setData] = useState<GroupGradingsTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flip the loading flag synchronously during render when the month
  // changes, rather than inside the effect below — React re-renders
  // immediately with the updated state before painting, so this avoids both
  // an extra committed render and the set-state-in-effect lint rule.
  if (monthDate !== prevMonthDate) {
    setPrevMonthDate(monthDate);
    setLoading(true);
  }

  const isCurrentMonth = isSameMonth(monthDate, new Date());

  const goPrevMonth = () => {
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    if (isCurrentMonth) return;
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  useEffect(() => {
    let cancelled = false;
    const start = formatDateOnly(startOfMonth(monthDate));
    const end = formatDateOnly(endOfMonth(monthDate));

    getGroupGradingsTable(start, end)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setData(null);
        setError(err instanceof ApiError ? err.message : 'Failed to load grades.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [monthDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    const start = formatDateOnly(startOfMonth(monthDate));
    const end = formatDateOnly(endOfMonth(monthDate));
    try {
      const result = await getGroupGradingsTable(start, end);
      setData(result);
      setError(null);
    } catch (err) {
      setData(null);
      setError(err instanceof ApiError ? err.message : 'Failed to load grades.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <View style={[styles.filterRow, { borderColor: border }]}>
        <View style={styles.monthSelector}>
          <Pressable onPress={goPrevMonth} hitSlop={10} style={styles.monthArrow}>
            <Icon name={ChevronLeft} size={20} />
          </Pressable>
          <Text variant='subtitle' style={styles.monthLabel} numberOfLines={1}>
            {formatMonthLabel(monthDate)}
          </Text>
          <Pressable
            onPress={goNextMonth}
            disabled={isCurrentMonth}
            hitSlop={10}
            style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}
          >
            <Icon name={ChevronRight} size={20} />
          </Pressable>
        </View>

        <ModeToggle mode={mode} onChange={setMode} />
      </View>

      {(() => {
        const isEmpty = !data || data.dates.length === 0 || data.students.length === 0;
        const showCentered = loading || !!error || isEmpty;

        return (
          <ScrollView
            contentContainerStyle={showCentered ? styles.centerFill : styles.tableScrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primary} />}
          >
            {loading ? (
              <Spinner size='lg' />
            ) : error ? (
              <>
                <Icon name={GraduationCap} size={40} color={muted} />
                <Text variant='subtitle' style={styles.stateTitle}>
                  No grades to show
                </Text>
                <Text variant='caption' style={styles.stateText}>
                  {error}
                </Text>
              </>
            ) : isEmpty ? (
              <>
                <Icon name={GraduationCap} size={40} color={muted} />
                <Text variant='subtitle' style={styles.stateTitle}>
                  No grades yet
                </Text>
                <Text variant='caption' style={styles.stateText}>
                  Nothing was graded for your group in {formatMonthLabel(monthDate)}.
                </Text>
              </>
            ) : (
              <View style={styles.tableRow}>
                <StudentsColumn students={data.students} border={border} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <DatesTable dates={data.dates} students={data.students} mode={mode} border={border} />
                </ScrollView>
              </View>
            )}
          </ScrollView>
        );
      })()}
    </View>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const secondary = useColor('secondary');
  const primary = useColor('primary');
  const primaryForeground = useColor('primaryForeground');
  const muted = useColor('textMuted');
  const feedback = useHaptics(true);

  const select = (next: Mode) => {
    if (next === mode) return;
    feedback('selection');
    onChange(next);
  };

  return (
    <View style={[styles.toggleTrack, { backgroundColor: secondary }]}>
      <Pressable
        onPress={() => select('percent')}
        style={[styles.toggleOption, mode === 'percent' && { backgroundColor: primary }]}
        accessibilityRole='button'
        accessibilityLabel='Show percentage'
        accessibilityState={{ selected: mode === 'percent' }}
      >
        <Icon name={Percent} size={16} color={mode === 'percent' ? primaryForeground : muted} />
      </Pressable>
      <Pressable
        onPress={() => select('grade')}
        style={[styles.toggleOption, mode === 'grade' && { backgroundColor: primary }]}
        accessibilityRole='button'
        accessibilityLabel='Show grade'
        accessibilityState={{ selected: mode === 'grade' }}
      >
        <Icon name={Hash} size={16} color={mode === 'grade' ? primaryForeground : muted} />
      </Pressable>
    </View>
  );
}

function StudentsColumn({
  students,
  border,
}: {
  students: GradingStudentRow[];
  border: string;
}) {
  return (
    <View style={{ width: LEFT_COL_WIDTH }}>
      <View style={[styles.headerCell, styles.studentsHeaderCell, { borderColor: border }]}>
        <Text variant='caption' style={styles.headerText}>
          Students
        </Text>
      </View>
      {students.map((student) => (
        <View
          key={student.student_id}
          style={[styles.studentRow, { borderColor: border }]}
        >
          <StudentAvatar student={student} />
          <Text numberOfLines={1} style={styles.studentName}>
            {getStudentDisplayName(student)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function StudentAvatar({ student }: { student: GradingStudentRow }) {
  const primary = useColor('primary');
  const initial = (student.first_name || student.username || '?').charAt(0).toUpperCase();

  return (
    <View style={[styles.avatar, { backgroundColor: primary }]}>
      {student.avatar_url ? (
        <Image source={{ uri: student.avatar_url }} style={styles.avatarImage} />
      ) : (
        <Text style={styles.avatarLetter}>{initial}</Text>
      )}
    </View>
  );
}

function DateBadge({ date }: { date: string }) {
  const foreground = useColor('foreground');
  const background = useColor('background');

  return (
    <View style={[styles.dateBadge, { backgroundColor: foreground }]}>
      <Text style={[styles.dateBadgeText, { color: background }]}>
        {formatDateColumnLabel(date)}
      </Text>
    </View>
  );
}

function DatesTable({
  dates,
  students,
  mode,
  border,
}: {
  dates: string[];
  students: GradingStudentRow[];
  mode: Mode;
  border: string;
}) {
  return (
    <View>
      <View style={styles.dateHeaderRow}>
        {dates.map((date) => (
          <View key={date} style={[styles.headerCell, styles.dateHeaderCell, { borderColor: border }]}>
            <DateBadge date={date} />
          </View>
        ))}
      </View>
      {students.map((student) => (
        <View key={student.student_id} style={styles.dateRow}>
          {dates.map((date) => (
            <View key={date} style={[styles.dateCell, { borderColor: border }]}>
              <GradeCircle cell={student.grades[date]?.[0]} mode={mode} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function getGradeColor(
  mode: Mode,
  value: number,
  colors: { green: string; orange: string; red: string }
): string {
  if (mode === 'percent') {
    if (value >= 80) return colors.green;
    if (value >= 50) return colors.orange;
    return colors.red;
  }
  if (value >= 8) return colors.green;
  if (value >= 5) return colors.orange;
  return colors.red;
}

function GradeCircle({ cell, mode }: { cell: GradingCell | undefined; mode: Mode }) {
  const green = useColor('green');
  const orange = useColor('orange');
  const red = useColor('red');
  const primary = useColor('primary');
  const primaryForeground = useColor('primaryForeground');

  if (!cell) {
    return (
      <View style={[styles.circle, { backgroundColor: primary, borderColor: primary }]}>
        <Text style={[styles.circleText, { color: primaryForeground }]}>–</Text>
      </View>
    );
  }

  const value = mode === 'percent' ? cell.percent : cell.grade;
  const color = getGradeColor(mode, value, { green, orange, red });

  return (
    <View style={[styles.circle, { backgroundColor: color, borderColor: color }]}>
      <Text style={[styles.circleText, styles.circleTextOnColor]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  monthArrow: {
    padding: 4,
  },
  monthArrowDisabled: {
    opacity: 0.3,
  },
  monthLabel: {
    minWidth: 132,
    textAlign: 'center',
  },
  toggleTrack: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  toggleOption: {
    width: 34,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerFill: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  stateTitle: {
    textAlign: 'center',
  },
  stateText: {
    textAlign: 'center',
  },
  tableScrollContent: {
    padding: SPACING.md,
    flexGrow: 1,
  },
  tableRow: {
    flexDirection: 'row',
  },
  headerCell: {
    alignItems: 'center',
    justifyContent: 'center',
    height: HEADER_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  studentsHeaderCell: {
    alignItems: 'flex-start',
  },
  headerText: {
    fontWeight: '600',
  },
  studentRow: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingRight: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  studentName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLetter: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  dateHeaderRow: {
    flexDirection: 'row',
  },
  dateHeaderCell: {
    width: DATE_COL_WIDTH,
  },
  dateBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
  },
  dateCell: {
    width: DATE_COL_WIDTH,
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  circleTextOnColor: {
    color: '#FFFFFF',
  },
});
