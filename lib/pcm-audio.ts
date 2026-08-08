// Pure PCM helpers for the AI audio call.
//
// The mic (@siteed/audio-studio) can only capture at 16000/44100/48000 Hz,
// but the backend's OpenAI Realtime session uses PCM16 mono @ 24000 Hz both
// ways. So we capture at 16 kHz, upsample 16k -> 24k before sending, and
// downsample the 24k AI reply back to 16k for WAV playback on iOS.
//
// All audio is little-endian signed 16-bit PCM, mono.

export const MIC_SAMPLE_RATE = 16000 as const;
export const REALTIME_SAMPLE_RATE = 24000 as const;

// ---- base64 <-> Int16Array (no Buffer / atob dependency) -------------------

const B64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_LOOKUP: Record<string, number> = {};
for (let i = 0; i < B64_CHARS.length; i++) B64_LOOKUP[B64_CHARS[i]] = i;

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, "");
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  const byteLength = (clean.length * 3) / 4 - padding;
  const bytes = new Uint8Array(byteLength);

  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const e1 = B64_LOOKUP[clean[i]] ?? 0;
    const e2 = B64_LOOKUP[clean[i + 1]] ?? 0;
    const e3 = B64_LOOKUP[clean[i + 2]] ?? 0;
    const e4 = B64_LOOKUP[clean[i + 3]] ?? 0;

    const triplet = (e1 << 18) | (e2 << 12) | (e3 << 6) | e4;
    if (p < byteLength) bytes[p++] = (triplet >> 16) & 0xff;
    if (p < byteLength) bytes[p++] = (triplet >> 8) & 0xff;
    if (p < byteLength) bytes[p++] = triplet & 0xff;
  }
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;

    out += B64_CHARS[b1 >> 2];
    out += B64_CHARS[((b1 & 0x03) << 4) | (b2 >> 4)];
    out +=
      i + 1 < bytes.length ? B64_CHARS[((b2 & 0x0f) << 2) | (b3 >> 6)] : "=";
    out += i + 2 < bytes.length ? B64_CHARS[b3 & 0x3f] : "=";
  }
  return out;
}

export function bytesToInt16(bytes: Uint8Array): Int16Array {
  // Copy into an aligned buffer; the source may have an odd offset.
  const aligned = new Uint8Array(bytes.length - (bytes.length % 2));
  aligned.set(bytes.subarray(0, aligned.length));
  return new Int16Array(aligned.buffer);
}

export function int16ToBytes(samples: Int16Array): Uint8Array {
  return new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
}

/** Convert Float32Array (samples in [-1, 1]) to Int16Array (PCM16). */
export function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

// ---- Linear resampling -----------------------------------------------------

/** Resample mono PCM16 from one rate to another via linear interpolation. */
export function resamplePcm16(
  input: Int16Array,
  fromRate: number,
  toRate: number,
): Int16Array {
  if (fromRate === toRate || input.length === 0) return input;
  const ratio = fromRate / toRate;
  const outLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Int16Array(outLength);

  for (let i = 0; i < outLength; i++) {
    const srcPos = i * ratio;
    const i0 = Math.floor(srcPos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = srcPos - i0;
    output[i] = (input[i0] * (1 - frac) + input[i1] * frac) | 0;
  }
  return output;
}

// ---- WAV container (for expo-audio playback fallback) ----------------------

/** Wrap raw mono PCM16 in a 44-byte WAV header. Returns base64. */
export function pcm16ToWavBase64(
  pcm: Int16Array,
  sampleRate: number,
): string {
  const dataBytes = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // PCM fmt chunk size
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate (mono 16-bit)
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < pcm.length; i++, offset += 2) {
    view.setInt16(offset, pcm[i], true);
  }
  return bytesToBase64(new Uint8Array(buffer));
}

// ---- Amplitude envelope (for avatar lipsync) --------------------------------

/**
 * Reduce PCM16 to an RMS amplitude envelope, one value (0..1) per window, for
 * driving mouth-open animation against the playback clock. `windowMs` should
 * match how often the caller polls playback position (expo-audio's
 * `playbackStatusUpdate` fires a few times a second).
 */
export function pcm16ToAmplitudeEnvelope(
  pcm: Int16Array,
  sampleRate: number,
  windowMs = 50,
): Float32Array {
  const windowSize = Math.max(1, Math.round((sampleRate * windowMs) / 1000));
  const windowCount = Math.max(1, Math.ceil(pcm.length / windowSize));
  const envelope = new Float32Array(windowCount);

  for (let w = 0; w < windowCount; w++) {
    const start = w * windowSize;
    const end = Math.min(start + windowSize, pcm.length);
    let sumSquares = 0;
    for (let i = start; i < end; i++) {
      const s = pcm[i] / 0x8000;
      sumSquares += s * s;
    }
    const rms = Math.sqrt(sumSquares / Math.max(1, end - start));
    envelope[w] = rms;
  }

  // Normalize against the loudest window so quieter replies still open the
  // mouth fully instead of reading as a mumble.
  let peak = 0;
  for (let w = 0; w < envelope.length; w++) peak = Math.max(peak, envelope[w]);
  if (peak > 0.0001) {
    for (let w = 0; w < envelope.length; w++) {
      envelope[w] = Math.min(1, envelope[w] / peak);
    }
  }

  return envelope;
}

/** Sample the envelope at a playback position (seconds) into the reply. */
export function sampleEnvelopeAt(
  envelope: Float32Array,
  windowMs: number,
  positionSeconds: number,
): number {
  if (envelope.length === 0) return 0;
  const idx = Math.floor((positionSeconds * 1000) / windowMs);
  if (idx < 0) return envelope[0];
  if (idx >= envelope.length) return 0;
  return envelope[idx];
}
