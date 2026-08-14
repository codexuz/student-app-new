import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Stack } from 'expo-router';

import { Text } from '@/components/ui/text';
import { useColor } from '@/hooks/useColor';

export default function ExamsLayout() {
  const text = useColor('text');
  const background = useColor('background');

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: text,
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: {
          backgroundColor: isLiquidGlassAvailable() ? 'transparent' : background,
        },
      }}
    >
      <Stack.Screen
        name='index'
        options={{ title: 'Exams', headerTitle: () => <Text variant='subtitle'>Exams</Text> }}
      />
      <Stack.Screen
        name='[id]'
        options={{
          title: 'Exam Result',
          headerTitle: () => <Text variant='subtitle'>Exam Result</Text>,
        }}
      />
    </Stack>
  );
}
