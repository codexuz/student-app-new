import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, ChevronLeft, Eye, EyeOff, Lock, XCircle } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AvoidKeyboard } from '@/components/ui/avoid-keyboard';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { ApiError } from '@/lib/api/client';
import { confirmPasswordReset } from '@/lib/api/auth';
import { SPACING } from '@/theme/globals';

const MIN_PASSWORD_LENGTH = 6;

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { phone, code } = useLocalSearchParams<{ phone: string; code: string }>();
  const green = useColor('green');
  const red = useColor('red');
  const muted = useColor('textMuted');
  const text = useColor('text');
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleReset = async () => {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast({
        variant: 'error',
        title: 'Validation Error',
        description: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: 'error', title: 'Validation Error', description: 'Passwords do not match.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(phone, code, newPassword);
      toast({
        variant: 'success',
        title: 'Success',
        description: 'Your password has been reset. Please sign in.',
      });
      router.replace('/sign-in');
    } catch (err) {
      const description =
        err instanceof ApiError ? err.message : 'Invalid or expired code. Please start over.';
      toast({ variant: 'error', title: 'Reset Failed', description });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
          <Icon name={ChevronLeft} size={24} color={text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text variant='heading'>Reset password</Text>
          <Text variant='caption' style={styles.subtitle}>
            Choose a new password for your account.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            icon={Lock}
            placeholder='New password'
            autoCapitalize='none'
            secureTextEntry={!showPassword}
            value={newPassword}
            onChangeText={setNewPassword}
            rightComponent={
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <Icon name={showPassword ? EyeOff : Eye} size={18} color={muted} />
              </Pressable>
            }
          />

          <Input
            icon={Lock}
            placeholder='Confirm new password'
            autoCapitalize='none'
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            rightComponent={
              <Pressable onPress={() => setShowConfirmPassword((v) => !v)} hitSlop={8}>
                <Icon name={showConfirmPassword ? EyeOff : Eye} size={18} color={muted} />
              </Pressable>
            }
          />

          {confirmPassword.length > 0 && (
            <View style={styles.hintRow}>
              <Icon
                name={passwordsMatch ? CheckCircle2 : XCircle}
                size={15}
                color={passwordsMatch ? green : red}
              />
              <Text style={[styles.hintText, { color: passwordsMatch ? green : red }]}>
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </Text>
            </View>
          )}

          <Button size='lg' style={styles.submitButton} loading={isSubmitting} onPress={handleReset}>
            Reset Password
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
  header: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
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
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: -SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '500',
  },
  submitButton: {
    width: '100%',
    marginTop: SPACING.sm,
  },
});
