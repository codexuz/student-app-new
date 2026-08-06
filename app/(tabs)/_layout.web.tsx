import React from 'react';
import { Icon } from '@/components/ui/icon';
import { useColor } from '@/hooks/useColor';
import { Tabs } from 'expo-router';
import { GraduationCap, Home, ShoppingBag, TrendingUp, User } from 'lucide-react-native';

export default function WebTabsLayout() {
  const primary = useColor('primary');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: primary,
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Icon name={Home} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name='grades'
        options={{
          title: 'Grades',
          tabBarIcon: ({ color }) => (
            <Icon name={GraduationCap} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name='shop'
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => (
            <Icon name={ShoppingBag} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name='progress'
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => (
            <Icon name={TrendingUp} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name='profile'
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Icon name={User} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
