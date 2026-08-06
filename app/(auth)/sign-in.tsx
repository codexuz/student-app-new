import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeOff, Lock, Phone } from 'lucide-react-native';
import { router } from 'expo-router';

import { AvoidKeyboard } from '@/components/ui/avoid-keyboard';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { ApiError } from '@/lib/api/client';
import { digitsOnly, formatNationalNumber, isCompleteNationalNumber, toE164 } from '@/lib/phone';
import { useAuth } from '@/providers/auth-provider';
import { SPACING } from '@/theme/globals';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const red = useColor('red');
  const muted = useColor('textMuted');

  const [digits, setDigits] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = isCompleteNationalNumber(digits) && password.trim().length > 0;

  const handleSignIn = async () => {
    if (!canSubmit) {
      setError('Enter your phone number and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await signIn(toE164(digits), password);
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid phone number or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text variant='heading'>Welcome back</Text>
          <Text variant='caption' style={styles.subtitle}>
            Sign in to continue your English journey.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            icon={Phone}
            placeholder='90 123 45 67'
            keyboardType='phone-pad'
            maxLength={12}
            value={formatNationalNumber(digits)}
            onChangeText={(text) => setDigits(digitsOnly(text))}
          />

          <Input
            icon={Lock}
            placeholder='Password'
            autoCapitalize='none'
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            rightComponent={
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <Icon name={showPassword ? EyeOff : Eye} size={18} color={muted} />
              </Pressable>
            }
          />

          {error && (
            <Text style={[styles.errorText, { color: red }]}>{error}</Text>
          )}

          <Button size='lg' style={styles.submitButton} loading={isSubmitting} onPress={handleSignIn}>
            Sign In
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
  errorText: {
    fontSize: 14,
    marginTop: -SPACING.xs,
  },
  submitButton: {
    width: '100%',
    marginTop: SPACING.sm,
  },
});
