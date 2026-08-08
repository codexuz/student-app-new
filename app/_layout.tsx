import { ToastProvider } from '@/components/ui/toast';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useInAppUpdates } from '@/hooks/useInAppUpdates';
import { useNotifications } from '@/hooks/useNotifications';
import { hasSeenOnboarding } from '@/lib/onboarding';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import {
  NotificationPermissionProvider,
  useNotificationPermission,
} from '@/providers/notification-permission-provider';
import { PreferencesProvider } from '@/providers/preferences-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { Colors } from '@/theme/colors';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { setBackgroundColorAsync } from 'expo-system-ui';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

SplashScreen.setOptions({
  duration: 200,
  fade: true,
});

// Keeps the native splash up past the first render — see the `isAppReady`
// gate in `RootNavigator`, which calls `hideAsync()` once the stored auth
// session and the onboarding flag have both been read.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* `storage` makes the light/dark choice survive a restart. SecureStore
            has no web implementation, so on web this degrades to no persistence
            rather than erroring — the toggle itself still works there. */}
        <PreferencesProvider>
          <ThemeProvider storage={SecureStore}>
            <ToastProvider>
              <AuthProvider>
                <NotificationPermissionProvider>
                  <RootNavigator />
                </NotificationPermissionProvider>
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </PreferencesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Split out so `useColorScheme()` resolves *inside* `ThemeProvider`. Read above
 * it and this would see the OS scheme rather than the user's choice — which on
 * native the global `Appearance` override happens to paper over, but on web
 * would leave everything below stuck on the system theme instead of the
 * user's toggle.
 */
function RootNavigator() {
  const colorScheme = useColorScheme() || 'light';
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { shouldPrompt: shouldPromptForNotifications, isLoading: isNotificationLoading } =
    useNotificationPermission();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Push notifications and store-update checks only need a mounted tree —
  // both hooks no-op internally until there's a signed-in user (notifications)
  // or a production build (updates), so they're safe to run unconditionally.
  useNotifications();
  useInAppUpdates();

  useEffect(() => {
    hasSeenOnboarding().finally(() => setOnboardingChecked(true));
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      // `setButtonStyleAsync` was removed in expo-navigation-bar 57; `setStyle`
      // is the replacement and is synchronous.
      NavigationBar.setStyle(colorScheme === 'light' ? 'dark' : 'light');
    }
  }, [colorScheme]);

  // Keep the root view background color in sync with the current theme
  useEffect(() => {
    setBackgroundColorAsync(
      colorScheme === 'dark' ? Colors.dark.background : Colors.light.background
    );
  }, [colorScheme]);

  const isAppReady = !isAuthLoading && !isNotificationLoading && onboardingChecked;

  useEffect(() => {
    if (isAppReady) SplashScreen.hideAsync();
  }, [isAppReady]);

  // Nothing renders — and the splash screen stays up, since it was prevented
  // from auto-hiding above — until the stored session, the notification
  // permission status, and the onboarding flag have all been read.
  if (!isAppReady) return null;

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} animated />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={isAuthenticated && !shouldPromptForNotifications}>
          <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
          <Stack.Screen name='(ai-chat)' options={{ headerShown: false }} />
          <Stack.Screen name='my-recording' options={{ headerShown: true, title: 'My Recordings' }} />
          <Stack.Screen name='edit-profile' options={{ headerShown: true, title: 'Edit Profile' }} />
          <Stack.Screen name='certificates' options={{ headerShown: true, title: 'Certificates' }} />
          <Stack.Screen name='payments' options={{ headerShown: true, title: 'Payment History' }} />
          <Stack.Screen name='roadmap' options={{ headerShown: true, title: 'Roadmap' }} />
          <Stack.Screen name='lesson' options={{ headerShown: true, title: 'Lesson' }} />
          <Stack.Screen name='theory' options={{ headerShown: true, title: 'Theory' }} />
          <Stack.Screen name='exercise-list' options={{ headerShown: true, title: 'Exercises' }} />
          <Stack.Screen name='exercise' options={{ headerShown: true, title: 'Exercise' }} />
          <Stack.Screen name='writing' options={{ headerShown: true, title: 'Writing' }} />
          <Stack.Screen name='speaking-list' options={{ headerShown: true, title: 'Speaking' }} />
          <Stack.Screen name='speaking' options={{ headerShown: true, title: 'Speaking' }} />
          <Stack.Screen name='pronunciation' options={{ headerShown: true, title: 'Pronunciation' }} />
        </Stack.Protected>

        <Stack.Protected guard={isAuthenticated && shouldPromptForNotifications}>
          <Stack.Screen name='notifications-permission' options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name='(auth)' options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Screen name='+not-found' />
      </Stack>
    </>
  );
}
