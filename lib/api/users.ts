import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';

import { apiRequest, apiUpload } from '@/lib/api/client';
import type { AuthUser } from '@/lib/api/types';

/** A native `{ uri, name, type }` part (what `expo-image-picker` gives you) or a web `File`. */
export type UploadableImage = { uri: string; name: string; type: string } | File;

export async function uploadAvatar(
  userId: string,
  file: UploadableImage
): Promise<{ avatar_url: string }> {
  const formData = new FormData();
  // Expo's fetch polyfill only accepts a genuine Blob-like part (something
  // with a `.bytes()` method) for multipart uploads — the classic React
  // Native `{ uri, name, type }` shape throws "Unsupported FormDataPart
  // implementation" under it. `expo-file-system`'s `File` implements that
  // interface, so native picks get wrapped in one; the web `File` from the
  // browser's file input already satisfies it as-is.
  const part = Platform.OS === 'web' ? file : new ExpoFile((file as { uri: string }).uri);
  formData.append('file', part as unknown as Blob);

  return apiUpload<{ avatar_url: string }>(`/users/${userId}/upload-avatar`, formData);
}

export interface UpdateProfileInput {
  username?: string;
  first_name?: string;
  last_name?: string;
}

export async function updateProfile(
  userId: string,
  patch: UpdateProfileInput
): Promise<AuthUser> {
  return apiRequest<AuthUser>(`/users/${userId}`, { method: 'PATCH', body: patch });
}
