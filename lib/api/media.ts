import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';

import { apiUpload } from '@/lib/api/client';

/** A native `{ uri, name, type }` part (what `expo-audio`'s recorder gives you) or a web `File`. */
export type UploadableAudio = { uri: string; name: string; type: string } | File;

function toFormDataPart(file: UploadableAudio) {
  // See lib/api/users.ts's `uploadAvatar` for why native picks need wrapping
  // in expo-file-system's `File` — Expo's fetch polyfill rejects the classic
  // RN `{ uri, name, type }` shape.
  return Platform.OS === 'web' ? file : new ExpoFile((file as { uri: string }).uri);
}

/** Uploads a file and returns its hosted URL. */
export async function uploadFile(file: UploadableAudio): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', toFormDataPart(file) as unknown as Blob);
  return apiUpload<{ url: string }>('/upload', formData);
}

/** Transcribes a recorded audio clip to text. */
export async function transcribeAudio(file: UploadableAudio): Promise<{ success: boolean; text: string }> {
  const formData = new FormData();
  formData.append('audio', toFormDataPart(file) as unknown as Blob);
  return apiUpload<{ success: boolean; text: string }>('/voice-chat-bot/speech-to-text', formData);
}
