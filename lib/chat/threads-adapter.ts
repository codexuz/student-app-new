import type { RemoteThreadListAdapter } from '@assistant-ui/react-native';
import type { RemoteThreadMetadata } from '@assistant-ui/core';
import { createAssistantStream } from 'assistant-stream';

import {
  archiveChatThread,
  createChatThread,
  deleteChatThread,
  listArchivedChatThreads,
  listChatThreads,
  renameChatThread,
  unarchiveChatThread,
  type ChatThread,
} from '@/lib/api/ai-chat';

function toRemoteThreadMetadata(thread: ChatThread): RemoteThreadMetadata {
  return {
    status: thread.status,
    remoteId: thread.id,
    title: thread.title,
    lastMessageAt: new Date(thread.updated_at),
  };
}

/**
 * Wires assistant-ui's thread list (create/rename/archive/delete/switch) to
 * the ai-chat-bot backend's /ai-chat-bot/threads REST endpoints, in place of
 * assistant-ui's own Assistant Cloud (which this app doesn't use).
 */
async function listAllThreads(): Promise<ChatThread[]> {
  // assistant-ui expects one combined list — it splits regular vs. archived
  // off each item's own `status`, not off which call it came from.
  const [regular, archived] = await Promise.all([listChatThreads(), listArchivedChatThreads()]);
  return [...regular, ...archived];
}

export function createChatThreadsAdapter(): RemoteThreadListAdapter {
  return {
    async list() {
      const threads = await listAllThreads();
      return { threads: threads.map(toRemoteThreadMetadata) };
    },

    async initialize() {
      const thread = await createChatThread();
      return { remoteId: thread.id };
    },

    async rename(remoteId, newTitle) {
      await renameChatThread(remoteId, newTitle);
    },

    async archive(remoteId) {
      await archiveChatThread(remoteId);
    },

    async unarchive(remoteId) {
      await unarchiveChatThread(remoteId);
    },

    async delete(remoteId) {
      await deleteChatThread(remoteId);
    },

    async fetch(remoteId) {
      // No dedicated GET /threads/:id endpoint on the backend — list is the
      // source of truth, and is cheap enough to call again here.
      const threads = await listAllThreads();
      const found = threads.find((t) => t.id === remoteId);
      if (found) return toRemoteThreadMetadata(found);
      return { status: 'regular', remoteId };
    },

    async generateTitle() {
      // The backend auto-titles a thread from the first user message
      // (see ai-chat-bot.service.ts#createStream), so there's nothing to
      // generate here — return an already-finished, empty stream.
      return createAssistantStream(async (controller) => {
        controller.close();
      });
    },
  };
}
