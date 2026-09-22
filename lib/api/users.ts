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
  let part: Blob | File | ExpoFile;
  if (Platform.OS !== 'web') {
    part = new ExpoFile((file as { uri: string }).uri);
  } else if ((typeof File !== 'undefined' && file instanceof File) || (typeof Blob !== 'undefined' && file instanceof Blob)) {
    part = file;
  } else if (typeof file === 'object' && file !== null && 'uri' in file) {
    try {
      const res = await fetch(file.uri);
      const blob = await res.blob();
      const rawMime = (blob.type || file.type || 'image/jpeg').split(';')[0].trim().toLowerCase();
      part = new File([blob], file.name || 'avatar.jpg', { type: rawMime });
    } catch {
      part = file as unknown as Blob;
    }
  } else {
    part = file as unknown as Blob;
  }
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
