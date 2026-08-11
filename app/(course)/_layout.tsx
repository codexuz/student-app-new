import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Stack } from 'expo-router';

import { Text } from '@/components/ui/text';
import { useColor } from '@/hooks/useColor';

export default function CourseLayout() {
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
        name='roadmap'
        options={{ title: 'Roadmap', headerTitle: () => <Text variant='subtitle'>Roadmap</Text> }}
      />
      <Stack.Screen
        name='lesson'
        options={{ title: 'Lesson', headerTitle: () => <Text variant='subtitle'>Lesson</Text> }}
      />
      <Stack.Screen
        name='theory'
        options={{ title: 'Theory', headerTitle: () => <Text variant='subtitle'>Theory</Text> }}
      />
      <Stack.Screen
        name='exercise-list'
        options={{ title: 'Exercises', headerTitle: () => <Text variant='subtitle'>Exercises</Text> }}
      />
      <Stack.Screen
        name='exercise'
        options={{ title: 'Exercise', headerTitle: () => <Text variant='subtitle'>Exercise</Text> }}
      />
      <Stack.Screen
        name='writing'
        options={{ title: 'Writing', headerTitle: () => <Text variant='subtitle'>Writing</Text> }}
      />
      <Stack.Screen
        name='speaking-list'
        options={{ title: 'Speaking', headerTitle: () => <Text variant='subtitle'>Speaking</Text> }}
      />
      <Stack.Screen
        name='speaking'
        options={{ title: 'Speaking', headerTitle: () => <Text variant='subtitle'>Speaking</Text> }}
      />
      <Stack.Screen
        name='pronunciation'
        options={{ title: 'Pronunciation', headerTitle: () => <Text variant='subtitle'>Pronunciation</Text> }}
      />
    </Stack>
  );
}
