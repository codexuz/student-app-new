import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';

import { apiUpload } from '@/lib/api/client';

/** A native `{ uri, name, type }` part (what `expo-audio`'s recorder gives you) or a web `File`. */
export type UploadableAudio = { uri: string; name: string; type: string } | File | Blob;

async function toFormDataPart(file: UploadableAudio): Promise<Blob | File | ExpoFile> {
  if (Platform.OS !== 'web') {
    return new ExpoFile((file as { uri: string }).uri);
  }

  // If already a browser File or Blob, return as-is
  if (typeof File !== 'undefined' && file instanceof File) {
    return file;
  }
  if (typeof Blob !== 'undefined' && file instanceof Blob) {
    return file;
  }

  // On web, expo-audio returns a blob: URL (e.g. blob:http://localhost:8081/...).
  // Fetching the blob: URL resolves the actual binary audio data in the browser.
  if (typeof file === 'object' && file !== null && 'uri' in file) {
    const uri = file.uri;
    try {
      const res = await fetch(uri);
      const blob = await res.blob();
      const rawMime = (blob.type || file.type || 'audio/webm').split(';')[0].trim().toLowerCase();
      let name = file.name || 'audio.webm';
      if (rawMime.includes('webm') && name.endsWith('.m4a')) {
        name = name.replace(/\.m4a$/, '.webm');
      } else if ((rawMime.includes('mp4') || rawMime.includes('m4a')) && name.endsWith('.webm')) {
        name = name.replace(/\.webm$/, '.m4a');
      }
      return new File([blob], name, { type: rawMime });
    } catch (e) {
      if (__DEV__) console.warn('Failed to resolve audio blob on web:', e);
    }
  }

  return file as unknown as Blob;
}

/** Uploads a file and returns its hosted URL. */
export async function uploadFile(file: UploadableAudio): Promise<{ url: string }> {
  const part = await toFormDataPart(file);
  const formData = new FormData();
  formData.append('file', part as unknown as Blob);
  return apiUpload<{ url: string }>('/upload', formData);
}

/** Transcribes a recorded audio clip to text. */
export async function transcribeAudio(file: UploadableAudio): Promise<{ success: boolean; text: string }> {
  const part = await toFormDataPart(file);
  const formData = new FormData();
  formData.append('audio', part as unknown as Blob);
  return apiUpload<{ success: boolean; text: string }>('/voice-chat-bot/speech-to-text', formData);
}
