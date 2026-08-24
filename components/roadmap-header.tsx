import { Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoadmapSkillStats } from '@/components/roadmap-skill-stats';
import { CircularProgress } from '@/components/ui/circular-progress';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useAuth } from '@/providers/auth-provider';
import { SPACING } from '@/theme/globals';

interface RoadmapHeaderProps {
  percentage: number;
}

export function RoadmapHeader({ percentage }: RoadmapHeaderProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const avatarLetter = (user?.first_name || user?.username || 'U').charAt(0).toUpperCase();

  return (
    <LinearGradient colors={['#DC2626', '#991B1B']} style={[styles.container, { paddingTop: insets.top + SPACING.sm }]}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.dismissTo('/(tabs)/(home)')} hitSlop={8}>
          <BlurView intensity={40} tint='dark' style={styles.closeButton}>
            <Icon name={X} size={18} color='#fff' />
          </BlurView>
        </Pressable>
        <Text style={styles.title}>Lessons</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.avatarWrap}>
        <CircularProgress percentage={percentage} size={92} strokeWidth={5} color='#fff' trackColor='rgba(255,255,255,0.2)'>
          <View style={styles.avatar}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} contentFit='cover' />
            ) : (
              <Text style={styles.avatarLetter}>{avatarLetter}</Text>
            )}
          </View>
        </CircularProgress>
      </View>

      <View style={styles.statsWrap}>
        <RoadmapSkillStats />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    minHeight: 280,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  avatarWrap: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLetter: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
  },
  statsWrap: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
});
