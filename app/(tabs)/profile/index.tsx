import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { BookOpen, Camera, CreditCard, GraduationCap, LogOut, Trophy } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ApiError } from '@/lib/api/client';
import { getMyCourses, type Enrollment } from '@/lib/api/courses';
import { getPaymentStatus, type PaymentStatus } from '@/lib/api/payments';
import { uploadAvatar, type UploadableImage } from '@/lib/api/users';
import { useAuth } from '@/providers/auth-provider';
import { SPACING } from '@/theme/globals';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - GRID_GAP) / 2;

export default function ProfileScreen() {
  const { user, signOut, updateUser } = useAuth();
  const isDark = useColorScheme() === 'dark';
  const primary = useColor('primary');
  const muted = useColor('textMuted');
  const text = useColor('text');
  const red = useColor('red');
  const green = useColor('green');
  const background = useColor('background');
  const cardColor = useColor('card');
  const neutralBadge = isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F5';

  const [isUploading, setIsUploading] = useState(false);
  const [courses, setCourses] = useState<Enrollment[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(true);

  const displayName = user?.first_name || user?.username || 'User';
  const fullName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || displayName;
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const secondaryLine = user?.phone || user?.email || user?.username;

  useEffect(() => {
    const userId = user?.user_id;
    if (!userId) {
      // Nothing to fetch without an id, but the spinners must still resolve
      // rather than spin forever.
      setIsLoadingCourses(false);
      setIsLoadingPayment(false);
      return;
    }

    let isMounted = true;

    getMyCourses()
      .then((data) => {
        if (isMounted) setCourses(data);
      })
      .catch(() => {
        if (isMounted) setCourses([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingCourses(false);
      });

    // A 404 (no billing set up yet) or 403 (staff accounts have no student
    // payment record) are both just "nothing to show" — the card hides either way.
    getPaymentStatus(userId)
      .then((status) => {
        if (isMounted) setPaymentStatus(status);
      })
      .catch(() => {
        if (isMounted) setPaymentStatus(null);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPayment(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.user_id]);

  const handleUpload = async (file: UploadableImage) => {
    if (!user) return;

    setIsUploading(true);
    try {
      const { avatar_url } = await uploadAvatar(user.user_id, file);
      await updateUser({ avatar_url });
    } catch (error) {
      Alert.alert(
        'Upload failed',
        error instanceof ApiError ? error.message : 'Please try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const pickImageWeb = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) void handleUpload(file);
    };
    input.click();
  };

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera access is required to take a photo.');
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      const asset = result.assets?.[0];
      if (result.canceled || !asset) return;

      const filename = asset.uri.split('/').pop() ?? 'avatar.jpg';
      const extension = /\.(\w+)$/.exec(filename)?.[1] ?? 'jpg';
      void handleUpload({ uri: asset.uri, name: filename, type: `image/${extension}` });
    } catch {
      Alert.alert('Something went wrong', 'Please try again.');
    }
  };

  const handleChoosePhoto = () => {
    if (Platform.OS === 'web') {
      pickImageWeb();
      return;
    }

    Alert.alert('Update Profile Picture', 'Choose an option', [
      { text: 'Take Photo', onPress: () => pickImage('camera') },
      { text: 'Choose from Library', onPress: () => pickImage('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/sign-in');
        },
      },
    ]);
  };

  const renderPaymentCard = () => {
    if (isLoadingPayment) {
      return (
        <Card style={styles.paymentCard}>
          <View style={styles.paymentLoading}>
            <ActivityIndicator size='small' color={primary} />
            <Text variant='caption'>Loading subscription...</Text>
          </View>
        </Card>
      );
    }

    if (!paymentStatus) return null;

    const isOverdue = paymentStatus.paymentStatus === 'overdue';
    const isUpcoming = !isOverdue && (paymentStatus.daysUntilNextPayment ?? Infinity) < 4;
    // Border reflects overall status (red only turns up when something's
    // actually wrong); the amount text only recolors for that same worst case
    // — "upcoming" still reads in the normal text color, just with different wording.
    const borderAccent = isOverdue ? red : green;
    const amountColor = isOverdue ? red : text;
    const label = isOverdue
      ? `-${paymentStatus.pendingAmount ?? 0} UZS`
      : isUpcoming
        ? 'Payment Upcoming'
        : 'Active & Paid';

    return (
      <Card style={{ ...styles.paymentCard, borderLeftColor: borderAccent, borderLeftWidth: 4 }}>
        <View style={styles.paymentRow}>
          <View style={[styles.paymentIcon, { backgroundColor: neutralBadge }]}>
            <Icon name={CreditCard} size={18} color={primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant='caption' style={styles.paymentLabel}>
              Subscription
            </Text>
            <Text variant='body' style={{ color: amountColor, fontWeight: '700' }}>
              {label}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderCourses = () => {
    if (isLoadingCourses) {
      return (
        <View style={styles.coursesPlaceholder}>
          <ActivityIndicator size='small' color={primary} />
        </View>
      );
    }

    if (courses.length === 0) {
      return (
        <Card style={styles.emptyCourses}>
          <Icon name={GraduationCap} size={28} color={muted} />
          <Text variant='caption' style={{ textAlign: 'center' }}>
            You are not enrolled in any course yet
          </Text>
        </Card>
      );
    }

    return (
      <View style={styles.coursesGrid}>
        {courses.map((course, index) => {
          const percentage = Math.max(0, Math.min(100, Math.round(course.percentage || 0)));
          const isFinished = course.is_completed || percentage >= 100;
          const fillPercentage = isFinished ? 100 : percentage;
          const accent = isFinished ? green : primary;

          return (
            <Card
              key={`${course.course_id}-${index}`}
              style={{ ...styles.courseCard, width: CARD_WIDTH }}
            >
              <View style={styles.courseTopRow}>
                <View style={[styles.courseIconBadge, { backgroundColor: `${accent}1A` }]}>
                  <Icon name={isFinished ? Trophy : BookOpen} size={16} color={accent} />
                </View>
                <Text variant='caption' style={{ color: accent, fontWeight: '700' }}>
                  {fillPercentage}%
                </Text>
              </View>

              <Text variant='body' style={styles.courseName} numberOfLines={2}>
                {course.course_name}
              </Text>

              <View style={[styles.courseTrack, { backgroundColor: `${accent}20` }]}>
                <View
                  style={[
                    styles.courseFill,
                    { width: `${fillPercentage}%`, backgroundColor: accent },
                  ]}
                />
              </View>

              <Text variant='caption' style={styles.courseMeta}>
                {course.total > 0 ? `${course.completed}/${course.total} lessons` : 'Completed'}
              </Text>
            </Card>
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior='automatic'
      contentContainerStyle={[
        styles.content,
        { paddingTop: Platform.OS === 'ios' ? SPACING.lg : 96 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Pressable
            style={[styles.avatar, { backgroundColor: primary }]}
            onPress={handleChoosePhoto}
            disabled={isUploading}
          >
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarLetter}>{avatarLetter}</Text>
            )}
            {isUploading && (
              <View style={[styles.avatarOverlay, { backgroundColor: `${background}CC` }]}>
                <Icon name={Camera} size={20} color={muted} />
              </View>
            )}
          </Pressable>
          <Pressable
            style={[styles.editBadge, { backgroundColor: primary, borderColor: background }]}
            onPress={handleChoosePhoto}
            disabled={isUploading}
          >
            <Icon name={Camera} size={14} color={background} />
          </Pressable>
        </View>

        <Text variant='title' style={styles.fullName}>
          {fullName}
        </Text>
        {!!secondaryLine && <Text variant='caption'>{secondaryLine}</Text>}
      </View>

      {renderPaymentCard()}

      <View style={styles.coursesSection}>
        <Text variant='subtitle' style={styles.sectionTitle}>
          My Courses
        </Text>
        {renderCourses()}
      </View>

      <View style={styles.section}>
        <Card style={styles.rowCard}>
          <View style={styles.row}>
            <Text variant='body'>Appearance</Text>
            <ModeToggle />
          </View>
        </Card>

        <Pressable onPress={handleSignOut}>
          <Card style={{ ...styles.rowCard, backgroundColor: cardColor }}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Icon name={LogOut} size={18} color={red} />
                <Text variant='body' style={{ color: red }}>
                  Sign Out
                </Text>
              </View>
            </View>
          </Card>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.lg,
  },
  header: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLetter: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  fullName: {
    textAlign: 'center',
  },
  paymentCard: {
    paddingVertical: SPACING.sm,
    elevation: 0.4
  },
  paymentLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  paymentLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coursesSection: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    marginBottom: 0,
  },
  coursesPlaceholder: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  emptyCourses: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  coursesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  courseCard: {
    padding: 14,
    elevation: 0.4
  },
  courseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  courseIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseName: {
    minHeight: 38,
    marginBottom: SPACING.sm,
  },
  courseTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  courseFill: {
    height: '100%',
    borderRadius: 3,
  },
  courseMeta: {
    marginTop: SPACING.xs,
  },
  section: {
    gap: SPACING.sm,
  },
  rowCard: {
    paddingVertical: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
});
