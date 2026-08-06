import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';

import { hasSeenOnboarding } from '@/lib/onboarding';

export default function AuthLayout() {
  const [seenOnboarding, setSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    hasSeenOnboarding().then(setSeenOnboarding);
  }, []);

  if (seenOnboarding === null) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!seenOnboarding}>
        <Stack.Screen name='onboarding' />
      </Stack.Protected>

      <Stack.Protected guard={seenOnboarding}>
        <Stack.Screen name='sign-in' />
      </Stack.Protected>
    </Stack>
  );
}
