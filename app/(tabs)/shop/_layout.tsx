import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { ArrowLeftRight, ShoppingCart } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useColor } from '@/hooks/useColor';

export default function ShopLayout() {
  const theme = useColorScheme();
  const text = useColor('text');
  const background = useColor('background');

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTintColor: text,
        headerBlurEffect: isLiquidGlassAvailable()
          ? undefined
          : theme === 'dark'
            ? 'systemMaterialDark'
            : 'systemMaterialLight',
        headerStyle: {
          backgroundColor: isLiquidGlassAvailable()
            ? 'transparent'
            : background,
        },
      }}
    >
      <Stack.Screen
        name='index'
        options={{
          title: 'Shop',
          headerTitle: () => <Text variant='subtitle'>Shop</Text>,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable onPress={() => router.push('/(shop)/exchange')} hitSlop={8}>
                <Icon name={ArrowLeftRight} size={20} color={text} />
              </Pressable>
              <Pressable onPress={() => router.push('/(shop)/purchases')} hitSlop={8}>
                <Icon name={ShoppingCart} size={20} color={text} />
              </Pressable>
            </View>
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
});
