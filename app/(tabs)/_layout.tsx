import { Icon } from '@/components/ui/icon';
import { useColor } from '@/hooks/useColor';
import { Tabs } from 'expo-router';
import { BookOpenCheck, ChartNoAxesColumn, Home, ShoppingBag, User } from 'lucide-react-native';

// `expo-router/unstable-native-tabs` mounts every tab's screen unconditionally
// at launch and never releases them — `isFocused` there only gates
// `pointerEvents`, not rendering (see NativeTabsView.shared.js's
// `ScreenContent`, which calls `contentRenderer()` for every tab regardless of
// focus). With five content-heavy tabs all resident in memory simultaneously,
// that was ballooning the app to ~4GB and getting it killed by iOS (jetsam
// "highwater") within seconds of launch. The stable `Tabs` below wraps
// `@react-navigation/bottom-tabs`, which is lazy by default — a tab's screen
// only mounts the first time it's actually visited.
export default function TabsLayout() {
  const primary = useColor('primary');
  const foreground = useColor('foreground');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: primary,
        tabBarInactiveTintColor: foreground,
      }}
    >
      <Tabs.Screen
        name='(home)'
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Icon name={Home} size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name='grades'
        options={{
          title: 'Grades',
          tabBarIcon: ({ color }) => <Icon name={BookOpenCheck} size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name='shop'
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => <Icon name={ShoppingBag} size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name='progress'
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color }) => <Icon name={ChartNoAxesColumn} size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name='profile'
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Icon name={User} size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
