import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Stack } from 'expo-router';

import { useColor } from '@/hooks/useColor';

export default function MoviesLayout() {
  const text = useColor('text');
  const background = useColor('background');

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: text,
        headerStyle: {
          backgroundColor: isLiquidGlassAvailable() ? 'transparent' : background,
        },
      }}
    >
      <Stack.Screen name='index' options={{ title: 'Movies' }} />
      <Stack.Screen name='[id]' options={{ headerShown: false }} />
    </Stack>
  );
}
