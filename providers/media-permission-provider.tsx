import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Linking } from 'react-native';

export type MediaPermissionKind = 'microphone' | 'camera' | 'mediaLibrary';

type MediaPermissionState = {
  granted: boolean;
  canAskAgain: boolean;
};

type MediaPermissionMap = Record<MediaPermissionKind, MediaPermissionState>;

const UNKNOWN_STATE: MediaPermissionState = { granted: false, canAskAgain: true };

const INITIAL_MAP: MediaPermissionMap = {
  microphone: UNKNOWN_STATE,
  camera: UNKNOWN_STATE,
  mediaLibrary: UNKNOWN_STATE,
};

/** Result handed back from `request()` so callers can branch on the outcome. */
export type RequestResult = {
  granted: boolean;
  /** False once the OS has already recorded a "denied" answer — re-requesting is a silent no-op then. */
  canAskAgain: boolean;
};

type MediaPermissionContextValue = {
  permissions: MediaPermissionMap;
  isLoading: boolean;
  /** Re-reads all three permission statuses without prompting. */
  refresh: () => Promise<void>;
  /** Fires the native OS prompt for the given permission kind. */
  request: (kind: MediaPermissionKind) => Promise<RequestResult>;
  /**
   * Requests the permission and, if it comes back blocked (denied with
   * `canAskAgain: false`), shows a toast-free path to Settings via the
   * returned `blocked` flag — callers render their own copy/toast.
   */
  ensure: (kind: MediaPermissionKind) => Promise<RequestResult>;
  openSettings: () => void;
};

const MediaPermissionContext = createContext<MediaPermissionContextValue | null>(null);

async function readCurrentStatuses(): Promise<MediaPermissionMap> {
  const [mic, camera, library] = await Promise.all([
    getRecordingPermissionsAsync(),
    ImagePicker.getCameraPermissionsAsync(),
    ImagePicker.getMediaLibraryPermissionsAsync(),
  ]);

  return {
    microphone: { granted: mic.granted, canAskAgain: mic.canAskAgain },
    camera: { granted: camera.status === 'granted', canAskAgain: camera.canAskAgain },
    mediaLibrary: { granted: library.status === 'granted', canAskAgain: library.canAskAgain },
  };
}

export function MediaPermissionProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<MediaPermissionMap>(INITIAL_MAP);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await readCurrentStatuses();
    setPermissions(next);
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const request = useCallback(async (kind: MediaPermissionKind): Promise<RequestResult> => {
    let result: RequestResult;

    switch (kind) {
      case 'microphone': {
        const perm = await requestRecordingPermissionsAsync();
        result = { granted: perm.granted, canAskAgain: perm.canAskAgain };
        break;
      }
      case 'camera': {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        result = { granted: perm.status === 'granted', canAskAgain: perm.canAskAgain };
        break;
      }
      case 'mediaLibrary': {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        result = { granted: perm.status === 'granted', canAskAgain: perm.canAskAgain };
        break;
      }
    }

    setPermissions((prev) => ({ ...prev, [kind]: result }));
    return result;
  }, []);

  const ensure = useCallback(
    async (kind: MediaPermissionKind): Promise<RequestResult> => {
      const current = permissions[kind];
      if (current.granted) return current;
      return request(kind);
    },
    [permissions, request]
  );

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  const value = useMemo<MediaPermissionContextValue>(
    () => ({ permissions, isLoading, refresh, request, ensure, openSettings }),
    [permissions, isLoading, refresh, request, ensure, openSettings]
  );

  return (
    <MediaPermissionContext.Provider value={value}>{children}</MediaPermissionContext.Provider>
  );
}

export function useMediaPermission(): MediaPermissionContextValue {
  const context = useContext(MediaPermissionContext);
  if (!context) {
    throw new Error('useMediaPermission must be used within a MediaPermissionProvider');
  }
  return context;
}
