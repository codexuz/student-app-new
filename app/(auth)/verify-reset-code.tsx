import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AvoidKeyboard } from '@/components/ui/avoid-keyboard';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { InputOTP } from '@/components/ui/input-otp';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { ApiError } from '@/lib/api/client';
import { requestPasswordReset, verifyResetCode } from '@/lib/api/auth';
import { SPACING } from '@/theme/globals';

const CODE_LENGTH = 4;
const RESEND_COOLDOWN = 60;

export default function VerifyResetCodeScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const primary = useColor('primary');
  const text = useColor('text');
  const { toast } = useToast();

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleVerify = async (value: string = code) => {
    if (value.length !== CODE_LENGTH) {
      toast({
        variant: 'error',
        title: 'Validation Error',
        description: 'Enter the complete 4-digit code.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyResetCode(phone, value);
      router.push({ pathname: '/reset-password', params: { phone, code: value } });
    } catch (err) {
      const description =
        err instanceof ApiError ? err.message : 'Invalid verification code. Please try again.';
      toast({ variant: 'error', title: 'Verification Failed', description });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await requestPasswordReset(phone);
      setCode('');
      setCooldown(RESEND_COOLDOWN);
      toast({
        variant: 'success',
        title: 'Code Sent',
        description: 'A new verification code has been sent to your phone.',
      });
    } catch (err) {
      const description =
        err instanceof ApiError ? err.message : 'Failed to resend code. Please try again.';
      toast({ variant: 'error', title: 'Error', description });
    } finally {
      setIsResending(false);
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
          <Text variant='heading'>Enter verification code</Text>
          <Text variant='caption' style={styles.subtitle}>
            We sent a 4-digit code to {phone}.
          </Text>
        </View>

        <InputOTP
          length={CODE_LENGTH}
          value={code}
          onChangeText={setCode}
          onComplete={handleVerify}
          containerStyle={styles.otpContainer}
        />

        <Button
          size='lg'
          style={styles.submitButton}
          loading={isSubmitting}
          onPress={() => handleVerify()}
        >
          Continue
        </Button>

        <Pressable
          onPress={handleResend}
          disabled={cooldown > 0 || isResending}
          style={styles.resendRow}
        >
          <Text variant='caption'>
            Didn't receive a code?{' '}
            <Text
              style={[
                styles.resendLink,
                { color: cooldown > 0 || isResending ? undefined : primary },
              ]}
            >
              {isResending
                ? 'Sending...'
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : 'Resend code'}
            </Text>
          </Text>
        </Pressable>
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
  otpContainer: {
    marginBottom: SPACING.lg,
  },
  submitButton: {
    width: '100%',
  },
  resendRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  resendLink: {
    fontWeight: '700',
  },
});
