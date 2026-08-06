import { useEffect, useSyncExternalStore } from 'react';
import { Stack } from 'expo-router';

import { getOnboardingSnapshot, hasSeenOnboarding, subscribeToOnboarding } from '@/lib/onboarding';

export default function AuthLayout() {
  const seenOnboarding = useSyncExternalStore(subscribeToOnboarding, getOnboardingSnapshot);

  useEffect(() => {
    hasSeenOnboarding();
  }, []);

  if (seenOnboarding === null) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!seenOnboarding}>
        <Stack.Screen name='onboarding' />
      </Stack.Protected>

      <Stack.Protected guard={seenOnboarding}>
        <Stack.Screen name='sign-in' />
        <Stack.Screen name='forgot-password' />
        <Stack.Screen name='verify-reset-code' />
        <Stack.Screen name='reset-password' />
      </Stack.Protected>
    </Stack>
  );
}
