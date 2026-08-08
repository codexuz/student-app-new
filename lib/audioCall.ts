import { io, Socket } from 'socket.io-client';
import { getSessionSnapshot } from '@/lib/api/session';

// Socket.IO client for the backend AudioCallGateway. The gateway runs on
// the `/call` namespace and authenticates via handshake.auth.token (JWT).
// Host is the API host without the `/api` REST prefix.
const SOCKET_URL = 'https://backend.impulselc.uz/call';

// ---- Server -> client events (see audio-call.gateway.ts) -------------------

export interface ServerToClientEvents {
  'call:error': (p: { call_id?: string; message: string }) => void;
  'call:ended': (p: { call_id: string; reason: string }) => void;

  // AI call (OpenAI Realtime relayed through the gateway)
  'ai-call:started': (p: { call_id: string }) => void;
  'ai-call:audio': (p: { call_id: string; audio: string }) => void;
  'ai-call:ai-transcript': (p: { call_id: string; text: string }) => void;
  'ai-call:user-transcript': (p: { call_id: string; text: string }) => void;
  'ai-call:speech-started': (p: { call_id: string }) => void;
  'ai-call:response-done': (p: { call_id: string }) => void;
}

// ---- Client -> server events ----------------------------------------------

export interface ClientToServerEvents {
  'ai-call:start': (p: { instructions?: string; voice?: string }) => void;
  'ai-call:audio': (p: { call_id: string; audio: string }) => void;
  'ai-call:commit': (p: { call_id: string }) => void;
  'ai-call:mute': (p: { call_id: string; muted: boolean }) => void;
  'ai-call:end': (p: { call_id: string }) => void;
}

export type CallSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: CallSocket | null = null;

function currentAccessToken(): string {
  const session = getSessionSnapshot();
  if (!session || session === 'pending') return '';
  return session.accessToken;
}

/**
 * Get (or lazily create) the shared /call socket. Connects with the current
 * JWT from the session store. Safe to call repeatedly; returns the same
 * instance.
 */
export async function getCallSocket(): Promise<CallSocket> {
  const token = currentAccessToken();

  if (socket) {
    // Always refresh auth in case the signed-in user changed, then make
    // sure the socket is connected (it may have dropped while backgrounded).
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: { token },
    autoConnect: true,
    reconnection: true,
    // Keep retrying indefinitely so the user stays reachable after long
    // network drops / app backgrounding, not just for the first 5 attempts.
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

/** Disconnect and drop the shared socket (e.g. on sign-out). */
export function closeCallSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
