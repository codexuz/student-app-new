import type { ThreadHistoryAdapter } from '@assistant-ui/react-native';
import type { GenericThreadHistoryAdapter, MessageFormatAdapter } from '@assistant-ui/core';

import { getChatThreadMessages, type ChatHistoryMessage } from '@/lib/api/ai-chat';

function toStorageEntry(row: ChatHistoryMessage, parentId: string | null) {
  return {
    id: row.id,
    parent_id: parentId,
    format: 'ai-sdk/v6',
    content: {
      id: row.id,
      role: row.role,
      parts: [{ type: 'text', text: row.content }],
    },
  };
}

/**
 * Loads a thread's persisted messages from the backend when the runtime
 * switches to it. Without this, useAISDKRuntime only ever has whatever
 * messages were sent during the current session in memory — reopening an
 * existing thread (or restarting the app) showed an empty chat even though
 * the backend had already saved everything via createStream().
 *
 * useAISDKRuntime requires `withFormat` specifically (a plain `load`/`append`
 * pair throws "missing the required withFormat method" at runtime). It calls
 * back with its own AI-SDK UIMessage encode/decode/getId adapter; this just
 * needs to hand back UIMessage-shaped objects built from the backend's flat
 * role/content rows, chained by insertion order (this chat has no branching).
 *
 * `append`/`update`/`delete` are no-ops: the backend already persists every
 * message as part of handling the send request itself (see
 * ai-chat-bot.service.ts#createStream), so there's nothing left to save here.
 *
 * `isNewThread` short-circuits before ever calling `getRemoteId` — a thread
 * the user hasn't sent a message in yet has no backend counterpart, and
 * resolving its remote id would call RemoteThreadListAdapter.initialize(),
 * silently creating one just because the runtime mounted and tried to load
 * history for an empty thread.
 */
export function createChatHistoryAdapter(
  isNewThread: () => boolean,
  getRemoteId: () => Promise<string>
): ThreadHistoryAdapter {
  return {
    async load() {
      return { messages: [] };
    },
    async append() {},
    withFormat<TMessage>(
      formatAdapter: MessageFormatAdapter<TMessage, Record<string, unknown>>
    ): GenericThreadHistoryAdapter<TMessage> {
      return {
        async load() {
          if (isNewThread()) return { messages: [] };

          const remoteThreadId = await getRemoteId();
          const rows = await getChatThreadMessages(remoteThreadId);

          let parentId: string | null = null;
          const messages = rows.map((row) => {
            const item = formatAdapter.decode(toStorageEntry(row, parentId));
            parentId = row.id;
            return item;
          });

          return { messages };
        },
        async append() {},
      };
    },
  };
}
