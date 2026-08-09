import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AiPracticeCarousel, buildDefaultAiCards } from '@/components/ai-practice-card';
import { CourseProgressCard } from '@/components/course-progress-card';
import { HomeHeader } from '@/components/home-header';
import { ScrollView } from '@/components/ui/scroll-view';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useAuth } from '@/providers/auth-provider';
import { getMyCourseProgress } from '@/lib/api/courses';
import type { CourseProgressItem } from '@/lib/api/curriculum-types';
import { getMyStudentProfile, type StudentProfile } from '@/lib/api/student-profile';
import { SPACING } from '@/theme/globals';

export default function HomeScreen() {
  const background = useColor('background');
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseProgressItem[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  useEffect(() => {
    let isMounted = true;

    getMyCourseProgress()
      .then((data) => {
        if (isMounted) setCourses(data);
      })
      .catch(() => {
        if (isMounted) setCourses([]);
      });

    if (user?.user_id) {
      getMyStudentProfile(user.user_id)
        .then((data) => {
          if (isMounted) setProfile(data);
        })
        .catch(() => {
          if (isMounted) setProfile(null);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [user?.user_id]);

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.stickyHeader, { paddingTop: insets.top, backgroundColor: background }]}>
        <HomeHeader
          firstName={user?.first_name || user?.username || 'User'}
          avatarUrl={user?.avatar_url}
          streak={profile?.streaks ?? 0}
          coins={profile?.coins ?? 0}
        />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      {courses.map((course) => (
        <CourseProgressCard
          key={course.course_id}
          stepsCompleted={course.completed}
          totalSteps={course.total}
          courseName={course.course_name}
          percentage={course.percentage}
          onPress={() =>
            course.group_id &&
            router.push({
              pathname: '/roadmap',
              params: { courseId: course.course_id, groupId: course.group_id },
            })
          }
        />
      ))}

      <AiPracticeCarousel
        cards={buildDefaultAiCards({
          onChatPress: () => router.push('/(ai-chat)/chat'),
          onCallPress: () => router.push('/ai-call'),
        })}
      />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  container: {
    flexGrow: 1,
    gap: SPACING.md,
    padding: SPACING.md,
  },
});
