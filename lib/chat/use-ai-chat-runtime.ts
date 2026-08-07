import { AssistantChatTransport, useAISDKRuntime } from '@assistant-ui/react-ai-sdk';
import { useRemoteThreadListRuntime } from '@assistant-ui/react-native';
import { useAui, useAuiState } from '@assistant-ui/store';
import { useChat } from '@ai-sdk/react';
import { useCallback, useMemo, useRef } from 'react';

import { BASE_URL, refreshAccessToken, resolveAccessToken } from '@/lib/api/client';
import { createChatHistoryAdapter } from '@/lib/chat/history-adapter';
import { createChatThreadsAdapter } from '@/lib/chat/threads-adapter';

/**
 * Per-thread chat wiring: points the AI SDK transport at this backend's
 * `POST /ai-chat-bot/threads/:threadId/messages` (the UI Message Stream SSE
 * endpoint — see ai-chat-bot.service.ts#createStream), attaching a fresh
 * bearer token per request the same way the REST client does.
 */
function useChatThreadRuntime() {
  const aui = useAui();

  // `s.threadListItem.id` is a *local* id assigned by useRemoteThreadListRuntime
  // the moment a thread is created/switched to — it is NOT an id our backend
  // has ever seen. The backend's real thread UUID only comes back from
  // aui.threadListItem.initialize().
  //
  // initialize() must NOT be called eagerly on mount/render: the runtime
  // always starts on an empty local "new thread" placeholder before the user
  // has typed anything, and initialize() on that placeholder is exactly what
  // triggers RemoteThreadListAdapter.initialize() -> createChatThread() on
  // our backend. getRemoteId() below is only invoked lazily — from sending a
  // message, or from loading history for a thread that already has a status
  // other than "new" — never at render time.
  const localId = useAuiState((s) => s.threadListItem.id);
  const isNew = useAuiState((s) => s.threadListItem.status === 'new');
  const isNewRef = useRef(isNew);
  isNewRef.current = isNew;

  const remoteIdCacheRef = useRef<{ localId: string; promise: Promise<string> } | null>(null);
  const getRemoteId = useCallback(() => {
    if (remoteIdCacheRef.current?.localId !== localId) {
      remoteIdCacheRef.current = {
        localId,
        promise: aui.threadListItem.initialize().then(({ remoteId }) => remoteId),
      };
    }
    return remoteIdCacheRef.current.promise;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localId]);

  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: `${BASE_URL}/ai-chat-bot/threads/${localId}/messages`,
        prepareSendMessagesRequest: async (options) => {
          const [threadId, token] = await Promise.all([
            getRemoteId(),
            resolveAccessToken().then((t) => t ?? refreshAccessToken()),
          ]);
          return {
            api: `${BASE_URL}/ai-chat-bot/threads/${threadId}/messages`,
            body: { messages: options.messages },
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          };
        },
      }),
    [localId, getRemoteId]
  );

  const chat = useChat({ id: localId, transport });

  const history = useMemo(
    () => createChatHistoryAdapter(() => isNewRef.current, getRemoteId),
    [getRemoteId]
  );

  return useAISDKRuntime(chat, { adapters: { history } });
}

export function useAiChatRuntime() {
  const adapter = useMemo(() => createChatThreadsAdapter(), []);

  return useRemoteThreadListRuntime({
    runtimeHook: useChatThreadRuntime,
    adapter,
  });
}
