import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import * as ExpoInAppUpdates from 'expo-in-app-updates';
import * as Updates from 'expo-updates';

async function checkForOtaUpdate(): Promise<void> {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (!update.isAvailable) return;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch {
    // OTA check is best-effort; ignore errors.
  }
}

async function checkForStoreUpdate(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      // `true` covers the app with the update overlay immediately. See:
      // https://developer.android.com/guide/playcore/in-app-updates#update-flows
      await ExpoInAppUpdates.checkAndStartUpdate(true);
      return;
    }

    const result = await ExpoInAppUpdates.checkForUpdate();
    if (!result.updateAvailable) return;

    Alert.alert(
      'Update available',
      'A new version of the app is available with many improvements and bug fixes. Would you like to update now?',
      [
        {
          text: 'Update',
          isPreferred: true,
          onPress: () => {
            ExpoInAppUpdates.startUpdate().catch(() => {});
          },
        },
        { text: 'Cancel' },
      ]
    );
  } catch {
    // Store availability checks are best-effort; ignore errors.
  }
}

/** Checks for OTA updates on mount, then polls the store for a native update hourly. No-ops in dev and on web. */
export function useInAppUpdates(): void {
  useEffect(() => {
    if (__DEV__ || Platform.OS === 'web') return;

    void checkForOtaUpdate();
    void checkForStoreUpdate();

    const interval = setInterval(checkForStoreUpdate, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
}
