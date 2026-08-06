import { apiUpload } from '@/lib/api/client';

/** A native `{ uri, name, type }` part (what `expo-image-picker` gives you) or a web `File`. */
export type UploadableImage = { uri: string; name: string; type: string } | File;

export async function uploadAvatar(
  userId: string,
  file: UploadableImage
): Promise<{ avatar_url: string }> {
  const formData = new FormData();
  // React Native's `FormData.append` accepts a `{ uri, name, type }` part for
  // file uploads, which the DOM `FormData` types don't model — hence the cast.
  formData.append('file', file as unknown as Blob);

  return apiUpload<{ avatar_url: string }>(`/users/${userId}/upload-avatar`, formData);
}
