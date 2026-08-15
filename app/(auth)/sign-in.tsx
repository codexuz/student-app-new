import { useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Eye, EyeOff, Lock, Phone } from 'lucide-react-native';
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
import { ApiError } from '@/lib/api/client';
import { digitsOnly, formatNationalNumber, isCompleteNationalNumber, toE164 } from '@/lib/phone';
import { useAuth } from '@/providers/auth-provider';
import { SPACING } from '@/theme/globals';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 200;

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const { toast } = useToast();

  const [digits, setDigits] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = isCompleteNationalNumber(digits) && password.trim().length > 0;

  const handleSignIn = async () => {
    if (!canSubmit) {
      toast({
        variant: 'error',
        title: 'Validation Error',
        description: 'Enter your phone number and password.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(toE164(digits), password);
      router.replace('/');
    } catch (err) {
      const description =
        err instanceof ApiError ? err.message : 'Invalid phone number or password.';
      toast({ variant: 'error', title: 'Sign In Failed', description });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { height: HEADER_HEIGHT + insets.top }]}>
        <Svg
          width={SCREEN_WIDTH}
          height={HEADER_HEIGHT + insets.top}
          viewBox={`0 0 ${SCREEN_WIDTH} ${HEADER_HEIGHT + insets.top}`}
          style={StyleSheet.absoluteFill}
        >
          <Path
            d={`M0,0 H${SCREEN_WIDTH} V${HEADER_HEIGHT + insets.top - 50} ` +
              `C${SCREEN_WIDTH * 0.75},${HEADER_HEIGHT + insets.top + 20} ` +
              `${SCREEN_WIDTH * 0.25},${HEADER_HEIGHT + insets.top - 95} ` +
              `0,${HEADER_HEIGHT + insets.top - 30} Z`}
            fill={primary}
          />
        </Svg>

        <Image
          source={require('@/assets/images/logo/logo_white.png')}
          style={[styles.logo, { marginTop: insets.top }]}
          resizeMode='contain'
        />
      </View>

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

          <Pressable onPress={() => router.push('/forgot-password')} hitSlop={8}>
            <Text variant='link' style={styles.forgotPassword}>
              Forgot password?
            </Text>
          </Pressable>

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
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 220,
    height: 184,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
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
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  submitButton: {
    width: '100%',
    marginTop: SPACING.sm,
  },
});
