import { AudioRecorder, AudioManager } from 'react-native-audio-api';
import {
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getCallSocket, type CallSocket } from '@/lib/audioCall';
import {
  base64ToBytes,
  bytesToBase64,
  bytesToInt16,
  float32ToInt16,
  int16ToBytes,
  MIC_SAMPLE_RATE,
  pcm16ToAmplitudeEnvelope,
  pcm16ToWavBase64,
  REALTIME_SAMPLE_RATE,
  resamplePcm16,
  sampleEnvelopeAt,
} from '@/lib/pcm-audio';

// User <-> AI audio call. The backend relays an OpenAI Realtime session:
//  - we stream mic PCM16 (24kHz, base64) via `ai-call:audio`
//  - server VAD on the backend auto-commits turns and replies
//  - the AI reply arrives as `ai-call:audio` deltas (PCM16 24kHz), which we
//    buffer per turn and play as a single WAV on `ai-call:response-done`.

export type AiCallPhase =
  | 'idle'
  | 'connecting'
  | 'listening' // mic open, streaming to AI 
  | 'speaking' // AI reply playing back
  | 'ended';

export const AI_CALL_LIMIT_SECONDS = 20 * 60;

// How often the envelope is sampled, matching `pcm16ToAmplitudeEnvelope`'s
// default window — used to look up `mouthOpen` from playback position.
const ENVELOPE_WINDOW_MS = 50;

interface UseAiCallResult {
  phase: AiCallPhase;
  aiTranscript: string;
  userTranscript: string;
  error: string | null;
  /** True when the mic permission is denied AND iOS won't show the system
   * prompt again — the only way forward is the Settings app. */
  permissionBlocked: boolean;
  /** Seconds remaining before the 15-minute limit ends the call. */
  secondsLeft: number;
  /** When true, the mic is muted and no audio is sent to the AI. */
  muted: boolean;
  /** Amplitude (0..1) of the AI reply at the current playback position, for
   * driving avatar lipsync. 0 whenever the AI isn't speaking. */
  mouthOpen: number;
  start: (opts?: { instructions?: string; voice?: string }) => Promise<void>;
  /** Toggle the mic mute state for the active call. */
  toggleMute: () => void;
  end: () => void;
}

// Turn a raw backend `call:ended` reason / `call:error` message into
// something a learner can understand.
function friendlyReason(reason?: string): string | null {
  if (!reason) return null;
  if (reason === 'time_limit') {
    return 'Your 15-minute AI call has ended.';
  }
  return reason;
}

export function useAiCall(): UseAiCallResult {
  const [phase, setPhase] = useState<AiCallPhase>('idle');
  const [aiTranscript, setAiTranscript] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AI_CALL_LIMIT_SECONDS);
  const [muted, setMuted] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0);
  // Mirror of `muted` for use inside the audio-stream callback (which closes
  // over stale state otherwise).
  const mutedRef = useRef(false);

  const recorderRef = useRef<AudioRecorder | null>(null);

  const connectingTone = useAudioPlayer(
    require('../assets/sounds/voip_connecting.mp3'),
  );
  const connectedTone = useAudioPlayer(
    require('../assets/sounds/voip_onallowtalk.mp3'),
  );
  const prevPhaseRef = useRef<AiCallPhase>('idle');

  // Loop the connecting tone while waiting for the backend to start the call.
  useEffect(() => {
    // `useAudioPlayer` doesn't expose a `loop` constructor option — mutating
    // the returned player's property is the library's actual API surface.
    // eslint-disable-next-line react-hooks/immutability
    connectingTone.loop = true;
    if (phase === 'connecting') {
      try { connectingTone.seekTo(0); connectingTone.play(); } catch {}
    } else {
      try { connectingTone.pause(); connectingTone.seekTo(0); } catch {}
    }
  }, [phase, connectingTone]);

  // Play the connected chime once when the call leaves "connecting" (i.e. the
  // AI session is ready). The first phase after connecting is now "speaking"
  // since the AI opens the conversation.
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (prev === 'connecting' && (phase === 'speaking' || phase === 'listening')) {
      try { connectedTone.seekTo(0); connectedTone.play(); } catch {}
    }
  }, [phase, connectedTone]);

  // react-native-audio-api's AudioSessionManager defaults to AVAudioSessionCategoryPlayback.
  // When its AVAudioEngine starts for recording it calls ensureActive → configureAudioSession,
  // which resets the shared AVAudioSession back to Playback and strips microphone input.
  // Disabling session management here hands full ownership to expo-audio, which already
  // configures PlayAndRecord via setAudioModeAsync({ allowsRecording: true }).
  useEffect(() => {
    AudioManager.disableSessionManagement();
  }, []);

  const socketRef = useRef<CallSocket | null>(null);
  const callIdRef = useRef<string | null>(null);
  // 1s interval that drives the visible countdown.
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // expo-audio's createAudioPlayer return type isn't exported as a named
  // type; we only call .play/.pause/.remove/.addListener on it.
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  // Accumulated AI reply samples (24kHz) for the current turn.
  const replyChunksRef = useRef<Int16Array[]>([]);
  // Amplitude envelope for the reply currently playing, sampled against
  // playback position to drive `mouthOpen`.
  const envelopeRef = useRef<Float32Array | null>(null);
  const recordingRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const streamingOptsRef = useRef<any>(null);


  const stopMic = useCallback(async () => {
    if (recordingRef.current) {
      recordingRef.current = false;
      try {
        recorderRef.current?.stop();
      } catch {
        // already stopped
      }
    }
  }, []);

  // Resume the mic after an AI reply finishes. On iOS, playback changes the
  // AVAudioSession category and interrupts the recorder; resumeRecording()
  // silently fails in that state. Instead we stop during playback and do a
  // full restart here, with a short delay so iOS can release the playback
  // session before we try to re-acquire it for recording.
  const resumeMic = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      await new Promise<void>((r) => setTimeout(r, 150));
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        // Keep AI playback on the speaker; .playAndRecord routes to the
        // earpiece by default otherwise.
        shouldRouteThroughEarpiece: false,
      });
      try {
        recorderRef.current?.stop();
      } catch {}
      if (streamingOptsRef.current) {
        const { callbackOptions, onAudioReadyCallback } = streamingOptsRef.current;
        const rec = new AudioRecorder();
        rec.onAudioReady(callbackOptions, onAudioReadyCallback);
        recorderRef.current = rec;
        rec.start();
      }
    } catch {
      // session not resumable
    }
  }, []);

  const playReply = useCallback(async () => {
    const chunks = replyChunksRef.current;
    replyChunksRef.current = [];
    if (chunks.length === 0) return;

    const total = chunks.reduce((n, c) => n + c.length, 0);
    const merged = new Int16Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    envelopeRef.current = pcm16ToAmplitudeEnvelope(
      merged,
      REALTIME_SAMPLE_RATE,
      ENVELOPE_WINDOW_MS,
    );

    const wavB64 = pcm16ToWavBase64(merged, REALTIME_SAMPLE_RATE);
    setPhase('speaking');

    // Half-duplex: stop the mic while the reply plays. On iOS, pausing
    // leaves the recorder in a suspended state the session cannot reliably
    // resume from; a clean stop lets resumeMic restart fresh.
    try { recorderRef.current?.stop(); } catch {}

    // Remove old player and null the ref before creating a new one to
    // avoid a stale-handle race on iOS.
    const prev = playerRef.current;
    playerRef.current = null;
    try { prev?.remove(); } catch {}

    // On iOS the AVAudioSession must exit PlayAndRecord mode before a new
    // player can acquire the session. Without this the native session lookup
    // throws "Session lookup failed" immediately on player.play().
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
      });
    } catch {}

    const player = createAudioPlayer({
      uri: `data:audio/wav;base64,${wavB64}`,
    });
    playerRef.current = player;
    (player as any).addListener('playbackStatusUpdate', (status: any) => {
      // Drive the avatar's mouth off the reply's precomputed envelope,
      // sampled at the player's current position — expo-audio doesn't
      // expose a live analyser, so this is the cheapest way to stay in
      // sync without a separate drifting timer.
      const envelope = envelopeRef.current;
      if (envelope && typeof status.currentTime === 'number') {
        setMouthOpen(
          sampleEnvelopeAt(envelope, ENVELOPE_WINDOW_MS, status.currentTime),
        );
      }
      if (status.didJustFinish) {
        envelopeRef.current = null;
        setMouthOpen(0);
        setPhase((p) => (p === 'ended' ? p : 'listening'));
        resumeMic();
      }
    });
    player.play();
  }, [resumeMic]);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const teardown = useCallback(
    (reason?: string) => {
      stopMic();
      stopCountdown();
      const callId = callIdRef.current;
      if (callId) socketRef.current?.emit('ai-call:end', { call_id: callId });
      callIdRef.current = null;
      playerRef.current?.remove();
      playerRef.current = null;
      replyChunksRef.current = [];
      envelopeRef.current = null;
      setMouthOpen(0);
      const friendly = friendlyReason(reason);
      if (friendly) setError(friendly);
      mutedRef.current = false;
      setMuted(false);
      setPhase('ended');
      setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      }).catch(() => {});
    },
    [stopMic, stopCountdown],
  );

  // Start the 15-minute countdown. The backend is the source of truth and
  // will send `call:ended` with reason "time_limit"; this local timer keeps
  // the UI in sync and still ends the call if that signal is missed.
  const startCountdown = useCallback(() => {
    stopCountdown();
    setSecondsLeft(AI_CALL_LIMIT_SECONDS);
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          stopCountdown();
          teardown('time_limit');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [stopCountdown, teardown]);

  // Open the mic and stream upsampled PCM16 chunks to the backend. The opts
  // are saved to streamingOptsRef so resumeMic can restart with the same config.
  // Declared before the socket-listener effect below since its
  // `ai-call:started` handler calls it.
  const beginStreaming = useCallback(async () => {
    recordingRef.current = true;

    const callbackOptions = {
      sampleRate: MIC_SAMPLE_RATE,
      bufferLength: 4096,
      channelCount: 1,
    };

    const onAudioReadyCallback = (event: { buffer: { getChannelData(ch: number): Float32Array } }) => {
      if (!recordingRef.current || mutedRef.current) return;
      const callId = callIdRef.current;
      if (!callId) return;

      const pcm16k = float32ToInt16(event.buffer.getChannelData(0));
      const pcm24k = resamplePcm16(pcm16k, MIC_SAMPLE_RATE, REALTIME_SAMPLE_RATE);
      socketRef.current?.emit('ai-call:audio', {
        call_id: callId,
        audio: bytesToBase64(int16ToBytes(pcm24k)),
      });
    };

    streamingOptsRef.current = { callbackOptions, onAudioReadyCallback };

    const rec = new AudioRecorder();
    rec.onAudioReady(callbackOptions, onAudioReadyCallback);
    recorderRef.current = rec;
    rec.start();
  }, []);

  // Socket listeners for the AI call lifecycle.
  useEffect(() => {
    let mounted = true;

    (async () => {
      const socket = await getCallSocket();
      if (!mounted) return;
      socketRef.current = socket;

      socket.on('ai-call:started', async ({ call_id }) => {
        callIdRef.current = call_id;
        // The AI opens the conversation, so begin in "speaking": the greeting
        // reply will arrive and play, then playReply flips us to "listening".
        setPhase('speaking');
        startCountdown();
        await beginStreaming();
      });

      socket.on('ai-call:audio', ({ audio }) => {
        const bytes = base64ToBytes(audio);
        replyChunksRef.current.push(bytesToInt16(bytes));
      });

      socket.on('ai-call:ai-transcript', ({ text }) => {
        setAiTranscript((prev) => prev + text);
      });

      socket.on('ai-call:user-transcript', ({ text }) => {
        setUserTranscript(text);
      });

      socket.on('ai-call:speech-started', () => {
        // Barge-in: user started talking, drop any half-buffered reply.
        replyChunksRef.current = [];
        envelopeRef.current = null;
        setMouthOpen(0);
        playerRef.current?.pause();
        // If a reply was playing, the mic was paused — bring it back.
        resumeMic();
        setPhase('listening');
        setAiTranscript('');
      });

      socket.on('ai-call:response-done', () => {
        playReply();
      });

      socket.on('call:ended', ({ reason }) => teardown(reason));
      socket.on('call:error', ({ message }) => teardown(message));
    })();

    return () => {
      mounted = false;
      const s = socketRef.current;
      if (s) {
        s.off('ai-call:started');
        s.off('ai-call:audio');
        s.off('ai-call:ai-transcript');
        s.off('ai-call:user-transcript');
        s.off('ai-call:speech-started');
        s.off('ai-call:response-done');
        s.off('call:ended');
        s.off('call:error');
      }
      stopMic();
      stopCountdown();
      playerRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(
    async (opts?: { instructions?: string; voice?: string }) => {
      setError(null);
      setPermissionBlocked(false);
      setAiTranscript('');
      setUserTranscript('');
      mutedRef.current = false;
      setMuted(false);
      setPhase('connecting');

      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        // Once iOS has already recorded a "denied" answer for this permission,
        // requesting it again resolves instantly with no system prompt — the
        // call just silently fails to connect unless we point the user at
        // Settings instead of retrying the same no-op request.
        setPermissionBlocked(!perm.canAskAgain);
        teardown(
          perm.canAskAgain
            ? 'Microphone permission denied'
            : 'Microphone access is off. Enable it in Settings to start the call.'
        );
        return;
      }

      try {
        // On iOS this calls through to `AVAudioSession.setCategory`, which is a
        // real native call that can throw (session conflicts, routing state,
        // etc — see the AVAudioSession-ownership fight with react-native-audio-api
        // noted above). Unlike every other `setAudioModeAsync` call in this file,
        // this one previously wasn't guarded, and `start()` is invoked
        // fire-and-forget by callers — an uncaught rejection here left the call
        // stuck on "connecting" forever with no visible error, iOS-only.
        await setAudioModeAsync({
          playsInSilentMode: true,
          // record + playback in the same session for full-duplex feel
          allowsRecording: true,
          // Force speaker output; .playAndRecord defaults to the earpiece, which
          // makes the AI's voice inaudible.
          shouldRouteThroughEarpiece: false,
        });

        const socket = await getCallSocket();
        socketRef.current = socket;
        socket.emit('ai-call:start', {
          instructions: opts?.instructions,
          voice: opts?.voice,
        });
      } catch {
        teardown('Could not start the call. Please try again.');
      }
    },
    [teardown],
  );

  const end = useCallback(() => teardown(), [teardown]);

  // Toggle the mic mute state. While muted, mic chunks are dropped client-side
  // and the backend is told to discard any buffered input.
  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    const callId = callIdRef.current;
    if (callId) {
      socketRef.current?.emit('ai-call:mute', { call_id: callId, muted: next });
    }
  }, []);

  return {
    phase,
    aiTranscript,
    userTranscript,
    error,
    permissionBlocked,
    secondsLeft,
    muted,
    mouthOpen,
    start,
    toggleMute,
    end,
  };
}
