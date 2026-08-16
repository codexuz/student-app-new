import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { AtSign, User } from 'lucide-react-native';

import { AvoidKeyboard } from '@/components/ui/avoid-keyboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useDisableSwipeBackWhileFocused } from '@/hooks/useDisableSwipeBackWhileFocused';
import { ApiError } from '@/lib/api/client';
import { updateProfile } from '@/lib/api/users';
import { useAuth } from '@/providers/auth-provider';
import { SPACING } from '@/theme/globals';

export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const primary = useColor('primary');

  const displayName = user?.first_name || user?.username || 'User';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const [username, setUsername] = useState(user?.username ?? '');
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const swipeBackGuard = useDisableSwipeBackWhileFocused();

  const hasChanges =
    username.trim() !== (user?.username ?? '') ||
    firstName.trim() !== (user?.first_name ?? '') ||
    lastName.trim() !== (user?.last_name ?? '');

  const handleSave = async () => {
    if (!user) return;

    if (!username.trim()) {
      toast({
        variant: 'error',
        title: 'Validation Error',
        description: 'Username is required.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const patch = {
        username: username.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      };
      await updateProfile(user.user_id, patch);
      await updateUser(patch);
      toast({ variant: 'success', title: 'Success', description: 'Profile updated successfully.' });
      router.back();
    } catch (err) {
      const description =
        err instanceof ApiError ? err.message : 'Failed to update profile. Please try again.';
      toast({ variant: 'error', title: 'Update Failed', description });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatar}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} contentFit='cover' />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: primary }]}>
              <Text style={styles.avatarLetter}>{avatarLetter}</Text>
            </View>
          )}
        </View>

        <View style={styles.heading}>
          <Text variant='heading'>Edit Profile</Text>
          <Text variant='caption' style={styles.subtitle}>
            Update your account details.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            icon={AtSign}
            placeholder='Username'
            value={username}
            onChangeText={setUsername}
            autoCapitalize='none'
            onFocus={swipeBackGuard.onFocus}
            onBlur={swipeBackGuard.onBlur}
          />

          <Input
            icon={User}
            placeholder='First name'
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize='words'
            onFocus={swipeBackGuard.onFocus}
            onBlur={swipeBackGuard.onBlur}
          />

          <Input
            icon={User}
            placeholder='Last name'
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize='words'
            onFocus={swipeBackGuard.onFocus}
            onBlur={swipeBackGuard.onBlur}
          />

          <Button
            size='lg'
            style={styles.saveButton}
            loading={isSaving}
            disabled={!hasChanges}
            onPress={handleSave}
          >
            Save Changes
          </Button>
        </View>
      </ScrollView>

      <AvoidKeyboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  avatar: {
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  avatarImage: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  avatarFallback: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heading: {
    marginBottom: SPACING.xl,
  },
  subtitle: {
    marginTop: SPACING.xs,
  },
  form: {
    gap: SPACING.md,
  },
  saveButton: {
    width: '100%',
    marginTop: SPACING.sm,
  },
});
