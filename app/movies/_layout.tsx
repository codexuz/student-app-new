import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Stack } from 'expo-router';

import { Text } from '@/components/ui/text';
import { useColor } from '@/hooks/useColor';

export default function MoviesLayout() {
  const text = useColor('text');
  const background = useColor('background');

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: text,
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: isLiquidGlassAvailable() ? 'transparent' : background,
        },
      }}
    >
      <Stack.Screen
        name='index'
        options={{ title: 'Movies', headerTitle: () => <Text variant='subtitle'>Movies</Text> }}
      />
      <Stack.Screen name='[id]' options={{ headerShown: false }} />
    </Stack>
  );
}
