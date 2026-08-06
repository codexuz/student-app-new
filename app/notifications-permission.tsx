import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell } from 'lucide-react-native';
import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useNotificationPermission } from '@/providers/notification-permission-provider';
import { SPACING } from '@/theme/globals';

export default function NotificationsPermissionScreen() {
  const insets = useSafeAreaInsets();
  const primary = useColor('primary');
  const { requestPermission, dismiss } = useNotificationPermission();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const handleEnable = async () => {
    setIsRequesting(true);
    try {
      await requestPermission();
    } finally {
      setIsRequesting(false);
      // `Stack.Protected` swaps away as soon as `shouldPrompt` flips, but this
      // forces it rather than waiting on that re-render to land.
      router.replace('/');
    }
  };

  const handleSkip = async () => {
    setIsDismissing(true);
    try {
      await dismiss();
    } finally {
      setIsDismissing(false);
      router.replace('/');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <View style={[styles.iconBadge, { backgroundColor: `${primary}1A` }]}>
          <Icon name={Bell} size={40} color={primary} strokeWidth={1.6} />
        </View>

        <Text variant='heading' style={styles.title}>
          Stay in the loop
        </Text>
        <Text variant='caption' style={styles.description}>
          Turn on notifications to hear about new homework, exam results, and messages from your
          teacher as soon as they happen.
        </Text>
      </View>

      <View style={styles.footer}>
        <Button size='lg' style={styles.button} loading={isRequesting} onPress={handleEnable}>
          Enable Notifications
        </Button>
        <Button
          variant='ghost'
          size='lg'
          style={styles.button}
          loading={isDismissing}
          onPress={handleSkip}
        >
          Not now
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  iconBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  button: {
    width: '100%',
  },
});
