import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Stack } from 'expo-router';

import { useColor } from '@/hooks/useColor';

export default function CourseLayout() {
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
      <Stack.Screen name='roadmap' options={{ title: 'Roadmap' }} />
      <Stack.Screen name='lesson' options={{ title: 'Lesson' }} />
      <Stack.Screen name='theory' options={{ title: 'Theory' }} />
      <Stack.Screen name='exercise-list' options={{ title: 'Exercises' }} />
      <Stack.Screen name='exercise' options={{ title: 'Exercise' }} />
      <Stack.Screen name='writing' options={{ title: 'Writing' }} />
      <Stack.Screen name='speaking-list' options={{ title: 'Speaking' }} />
      <Stack.Screen name='speaking' options={{ title: 'Speaking' }} />
      <Stack.Screen name='pronunciation' options={{ title: 'Pronunciation' }} />
    </Stack>
  );
}
