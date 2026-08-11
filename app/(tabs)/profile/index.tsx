import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import type { LucideProps } from 'lucide-react-native';
import {
  AlertCircle,
  Award,
  Bell,
  Camera,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  HelpCircle,
  LogOut,
  Mic,
  Moon,
  Share2,
  Star,
  User,
  Vibrate,
  Volume2,
  ArrowUpRight
} from 'lucide-react-native';

import { BottomSheet, useBottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GroupedInput } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useModeToggle } from '@/hooks/useModeToggle';
import { ApiError } from '@/lib/api/client';
import { getPaymentStatus, type PaymentStatus } from '@/lib/api/payments';
import { uploadAvatar, type UploadableImage } from '@/lib/api/users';
import { useAuth } from '@/providers/auth-provider';
import { useNotificationPermission } from '@/providers/notification-permission-provider';
import { usePreferences } from '@/providers/preferences-provider';
import { SPACING } from '@/theme/globals';

const APP_STORE_URL = 'https://apps.apple.com/app/6757120304';
const PLAY_STORE_PACKAGE = 'edu.impulse.uz';
const HELP_CENTER_URL = 'https://t.me/javlon_developer';

function MenuRow({
  icon,
  label,
  onPress,
  right,
}: {
  icon: React.ComponentType<LucideProps>;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const muted = useColor('textMuted');
  const border = useColor('border');

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.menuRow}>
      <View style={styles.menuRowLeft}>
        <Icon name={icon} size={20} color={muted} />
        <Text variant='body'>{label}</Text>
      </View>
      {right ?? (onPress && <Icon name={ChevronRight} size={18} color={border} />)}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, signOut, updateUser } = useAuth();
  const { isSoundEnabled, isHapticsEnabled, setSoundEnabled, setHapticsEnabled } =
    usePreferences();
  const { mode, isDark, setMode } = useModeToggle();
  const { status: notificationStatus } = useNotificationPermission();
  const primary = useColor('primary');
  const muted = useColor('textMuted');
  const border = useColor('border');
  const red = useColor('red');
  const green = useColor('green');
  const orange = useColor('orange');
  const background = useColor('background');
  const text = useColor('text');
  const [isUploading, setIsUploading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  // Profile only ever mounts once `user` is resolved, so this reflects
  // whether there's anything to fetch right from the first render — no need
  // to flip it synchronously inside the effect below for the "no id" case.
  const [isLoadingPayment, setIsLoadingPayment] = useState(() => !!user?.user_id);
  const [refreshing, setRefreshing] = useState(false);
  const signOutSheet = useBottomSheet();
  const photoSheet = useBottomSheet();
  const toast = useToast();

  const displayName = user?.first_name || user?.username || 'User';
  const fullName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || displayName;
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const secondaryLine = user?.phone || user?.email || user?.username;

  useEffect(() => {
    const userId = user?.user_id;
    if (!userId) return;

    let isMounted = true;

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

  const onRefresh = async () => {
    if (!user?.user_id) return;
    setRefreshing(true);
    try {
      setPaymentStatus(await getPaymentStatus(user.user_id));
    } catch {
      setPaymentStatus(null);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpload = async (file: UploadableImage) => {
    if (!user) return;

    setIsUploading(true);
    try {
      const { avatar_url } = await uploadAvatar(user.user_id, file);
      await updateUser({ avatar_url });
      toast.success('Profile picture updated');
    } catch (error) {
      if (__DEV__) console.error('Avatar upload failed:', error);
      toast.error(
        'Upload failed',
        error instanceof ApiError || error instanceof Error ? error.message : 'Please try again.'
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
          toast.warning('Permission needed', 'Camera access is required to take a photo.');
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
      toast.error('Something went wrong', 'Please try again.');
    }
  };

  const handleChoosePhoto = () => {
    if (Platform.OS === 'web') {
      pickImageWeb();
      return;
    }

    photoSheet.open();
  };

  const handlePickFromSheet = (source: 'camera' | 'library') => {
    photoSheet.close();
    void pickImage(source);
  };

  const confirmSignOut = async () => {
    signOutSheet.close();
    await signOut();
    router.replace('/sign-in');
  };

  const handleRateApp = async () => {
    try {
      const url = Platform.select({
        ios: APP_STORE_URL,
        android: `market://details?id=${PLAY_STORE_PACKAGE}`,
      });
      if (!url) return;

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        toast.error('Error', 'Unable to open app store');
      }
    } catch {
      toast.error('Error', 'Failed to open app store');
    }
  };

  const handleShareApp = async () => {
    try {
      const appUrl = Platform.select({
        ios: APP_STORE_URL,
        android: `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`,
        web: typeof window !== 'undefined' ? window.location.origin : undefined,
      });

      if (Platform.OS === 'web') {
        const shareText = `Check out this amazing language learning app! Download it now and start your learning journey.\n\n${appUrl}`;

        if (typeof navigator !== 'undefined' && navigator.share) {
          try {
            await navigator.share({ title: 'Learn with Impulse', text: shareText });
          } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
              await navigator.clipboard.writeText(shareText);
              toast.success('Link copied to clipboard!');
            }
          }
        } else if (typeof navigator !== 'undefined') {
          await navigator.clipboard.writeText(shareText);
          toast.success('Link copied to clipboard!');
        }
        return;
      }

      const shareContent = Platform.select({
        ios: {
          message:
            'Check out this amazing language learning app! Download it now and start your learning journey.',
          url: appUrl,
        },
        android: {
          message: `Check out this amazing language learning app! Download it now and start your learning journey.\n\n${appUrl}`,
          title: 'Share App',
        },
      });

      const shareOptions = Platform.select({
        ios: { subject: 'Learn with Impulse' },
        android: { dialogTitle: 'Share App with Friends' },
      });

      if (shareContent) await Share.share(shareContent, shareOptions);
    } catch {
      toast.error('Error', 'Failed to share app');
    }
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

    const nextPaymentLabel = paymentStatus.nextPaymentDate
      ? new Date(paymentStatus.nextPaymentDate).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : null;

    const { icon, color, label, amount, subtitle } = (() => {
      switch (paymentStatus.paymentStatus) {
        case 'upcoming':
          return {
            icon: Check,
            color: green,
            label: 'Paid',
            amount: paymentStatus.totalPaid,
            subtitle: 'Fully paid',
          };
        case 'pending':
          return {
            icon: AlertCircle,
            color: orange,
            label: 'Pending',
            amount: paymentStatus.pendingAmount,
            subtitle: nextPaymentLabel ? `Due ${nextPaymentLabel}` : 'Payment due soon',
          };
        case 'overdue':
          return {
            icon: Clock,
            color: red,
            label: 'Overdue',
            amount: paymentStatus.pendingAmount,
            subtitle: nextPaymentLabel ? `Was due ${nextPaymentLabel}` : 'Payment overdue',
          };
        default:
          return {
            icon: CreditCard,
            color: primary,
            label: paymentStatus.paymentStatus,
            amount: paymentStatus.pendingAmount || paymentStatus.totalPaid,
            subtitle: 'Subscription',
          };
      }
    })();

    return (
      <Pressable onPress={() => router.push('/payments')}>
        <Card style={styles.paymentCard}>
          <View style={styles.paymentRow}>
            <View style={[styles.paymentIconBadge]}>
              <Icon name={icon} size={23} color={color} />
            </View>
            <View style={styles.paymentTextBlock}>
              <Text variant='body' style={styles.paymentTitle} numberOfLines={1}>
                {amount.toLocaleString()} UZS
              </Text>
              <Text variant='caption' style={styles.paymentStatusLabel}>
                {label}
              </Text>
            </View>
            <Icon name={ArrowUpRight} size={22} color={text} />
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior='automatic'
        contentContainerStyle={[
          styles.content,
          { paddingTop: Platform.OS === 'ios' ? SPACING.lg : 24 },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primary} />}
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

        <GroupedInput title='Profile Information' titleStyle={{fontSize: 22}}>
          <MenuRow icon={User} label='Edit Profile' onPress={() => router.push('/edit-profile')} />
          <MenuRow icon={Award} label='Certificates' onPress={() => router.push('/certificates')} />
        </GroupedInput>

        <GroupedInput title='Preferences' titleStyle={{fontSize: 22}}>
          <MenuRow
            icon={Bell}
            label='Notifications'
            onPress={() => Linking.openSettings()}
            right={
              <View style={styles.notificationStatusRight}>
                <Text
                  variant='caption'
                  style={{
                    color:
                      notificationStatus === 'granted'
                        ? green
                        : notificationStatus === 'denied'
                          ? red
                          : muted,
                  }}
                >
                  {notificationStatus === 'granted'
                    ? 'On'
                    : notificationStatus === 'denied'
                      ? 'Off'
                      : 'Not set'}
                </Text>
                <Icon name={ChevronRight} size={18} color={border} />
              </View>
            }
          />
          <MenuRow
            icon={Volume2}
            label='Sounds'
            right={<Switch value={isSoundEnabled} onValueChange={setSoundEnabled} />}
          />
          <MenuRow
            icon={Vibrate}
            label='Vibration'
            right={<Switch value={isHapticsEnabled} onValueChange={setHapticsEnabled} />}
          />
          <MenuRow
            icon={Moon}
            label='Dark Mode'
            right={
              <Switch
                value={mode === 'dark' || (mode === 'system' && isDark)}
                onValueChange={(value) => setMode(value ? 'dark' : 'light')}
              />
            }
          />
        </GroupedInput>

        <GroupedInput title='Help and Support' titleStyle={{fontSize: 22}}>
          <MenuRow icon={HelpCircle} label='Help Center' onPress={() => Linking.openURL(HELP_CENTER_URL)} />
          <MenuRow icon={Star} label='Rate Our App' onPress={handleRateApp} />
          <MenuRow icon={Share2} label='Share App' onPress={handleShareApp} />
        </GroupedInput>

        <Button
          variant='destructive'
          size='lg'
          icon={LogOut}
          onPress={signOutSheet.open}
          style={styles.signOutButton}
        >
          Sign Out
        </Button>
      </ScrollView>

      <BottomSheet isVisible={signOutSheet.isVisible} onClose={signOutSheet.close} snapPoints={[0.45]}>
        <View style={{ gap: SPACING.lg, paddingBottom: SPACING.md }}>
          <View style={{ alignItems: 'center', gap: SPACING.sm }}>
            <Icon name={LogOut} size={48} color={red} />
            <Text variant='title' style={{ textAlign: 'center' }}>
              Sign Out
            </Text>
            <Text variant='caption' style={{ textAlign: 'center' }}>
              Are you sure you want to sign out of your account?
            </Text>
          </View>
          <View style={{ gap: SPACING.sm }}>
            <Button variant='destructive' size='lg' onPress={confirmSignOut} style={{ width: '100%' }}>
              Sign Out
            </Button>
            <Button variant='secondary' size='lg' onPress={signOutSheet.close} style={{ width: '100%' }}>
              Cancel
            </Button>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet isVisible={photoSheet.isVisible} onClose={photoSheet.close} snapPoints={[0.4]}>
        <View style={{ gap: SPACING.lg, paddingBottom: SPACING.md }}>
          <Text variant='title' style={{ textAlign: 'center' }}>
            Update Profile Picture
          </Text>
          <View style={{ gap: SPACING.sm }}>
            <Button
              variant='secondary'
              size='lg'
              icon={Camera}
              onPress={() => handlePickFromSheet('camera')}
              style={{ width: '100%' }}
            >
              Take Photo
            </Button>
            <Button
              variant='secondary'
              size='lg'
              onPress={() => handlePickFromSheet('library')}
              style={{ width: '100%' }}
            >
              Choose from Library
            </Button>
            <Button variant='ghost' size='lg' onPress={photoSheet.close} style={{ width: '100%' }}>
              Cancel
            </Button>
          </View>
        </View>
      </BottomSheet>
    </>
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
    borderRadius: 16,
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
  paymentIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTextBlock: {
    flex: 1,
    gap: 2,
  },
  paymentTitle: {
    fontWeight: '700',
    fontSize: 18
  },
  paymentStatusLabel: {
    fontWeight: '500',
    fontSize: 12
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  notificationStatusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  signOutButton: {
    width: '100%',
  },
});
