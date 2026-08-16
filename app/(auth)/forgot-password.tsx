import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Phone } from 'lucide-react-native';
import { router } from 'expo-router';

import { AvoidKeyboard } from '@/components/ui/avoid-keyboard';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useDisableSwipeBackWhileFocused } from '@/hooks/useDisableSwipeBackWhileFocused';
import { ApiError } from '@/lib/api/client';
import { requestPasswordReset } from '@/lib/api/auth';
import { digitsOnly, formatNationalNumber, isCompleteNationalNumber, toE164 } from '@/lib/phone';
import { SPACING } from '@/theme/globals';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const text = useColor('text');
  const { toast } = useToast();

  const [digits, setDigits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const swipeBackGuard = useDisableSwipeBackWhileFocused();

  const canSubmit = isCompleteNationalNumber(digits);

  const handleSendCode = async () => {
    if (!canSubmit) {
      toast({ variant: 'error', title: 'Validation Error', description: 'Enter your phone number.' });
      return;
    }

    const phone = toE164(digits);

    setIsSubmitting(true);
    try {
      await requestPasswordReset(phone);
      router.push({ pathname: '/verify-reset-code', params: { phone } });
    } catch (err) {
      const description =
        err instanceof ApiError
          ? err.status === 404
            ? 'Phone number not found.'
            : err.message
          : 'Failed to send verification code. Please try again.';
      toast({ variant: 'error', title: 'Error', description });
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
          <Text variant='heading'>Forgot your password?</Text>
          <Text variant='caption' style={styles.subtitle}>
            Enter your phone number and we'll send you a verification code.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            icon={Phone}
            placeholder='90 123 45 67'
            keyboardType='phone-pad'
            maxLength={12}
            value={formatNationalNumber(digits)}
            onChangeText={(value) => setDigits(digitsOnly(value))}
            onFocus={swipeBackGuard.onFocus}
            onBlur={swipeBackGuard.onBlur}
          />

          <Button size='lg' style={styles.submitButton} loading={isSubmitting} onPress={handleSendCode}>
            Send Code
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
  submitButton: {
    width: '100%',
    marginTop: SPACING.sm,
  },
});
