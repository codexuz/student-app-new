import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Phone, Sparkles } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { CircularProgress } from '@/components/ui/circular-progress';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { getMyCourseProgress } from '@/lib/api/courses';
import type { CourseProgressItem } from '@/lib/api/curriculum-types';
import { SPACING } from '@/theme/globals';

export default function HomeScreen() {
  const primary = useColor('primary');
  const accent = useColor('accent');
  const muted = useColor('textMuted');
  const [courses, setCourses] = useState<CourseProgressItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    getMyCourseProgress()
      .then((data) => {
        if (isMounted) setCourses(data);
      })
      .catch(() => {
        if (isMounted) setCourses([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      <Text variant='heading'>Welcome back</Text>

      {courses.map((course) => (
        <Pressable
          key={course.course_id}
          onPress={() =>
            course.group_id &&
            router.push({
              pathname: '/roadmap',
              params: { courseId: course.course_id, groupId: course.group_id },
            })
          }
        >
          <Card>
            <View style={styles.cardRow}>
              <CircularProgress percentage={course.percentage} size={48} strokeWidth={4} />

              <View style={{ flex: 1 }}>
                <Text variant='body' style={{ fontWeight: '600' }}>
                  {course.course_name}
                </Text>
                <Text variant='caption' style={{ marginTop: 2 }}>
                  {course.completed}/{course.total} lessons completed
                </Text>
              </View>

              <Icon name={ChevronRight} size={20} color={muted} />
            </View>
          </Card>
        </Pressable>
      ))}

      <Pressable onPress={() => router.push('/(ai-chat)/chat')}>
        <Card>
          <View style={styles.cardRow}>
            <View style={[styles.iconBadge, { backgroundColor: accent }]}>
              <Icon name={Sparkles} size={22} color={primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text variant='body' style={{ fontWeight: '600' }}>
                AI Chat
              </Text>
              <Text variant='caption' style={{ marginTop: 2 }}>
                Ask your AI tutor about grammar, vocabulary, or IELTS prep
              </Text>
            </View>

            <Icon name={ChevronRight} size={20} color={muted} />
          </View>
        </Card>
      </Pressable>

      <Pressable onPress={() => router.push('/ai-call')}>
        <Card>
          <View style={styles.cardRow}>
            <View style={[styles.iconBadge, { backgroundColor: accent }]}>
              <Icon name={Phone} size={22} color={primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text variant='body' style={{ fontWeight: '600' }}>
                AI Call
              </Text>
              <Text variant='caption' style={{ marginTop: 2 }}>
                Practice speaking with your AI tutor in a live call
              </Text>
            </View>

            <Icon name={ChevronRight} size={20} color={muted} />
          </View>
        </Card>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
