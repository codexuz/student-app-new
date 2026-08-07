import { apiRequest } from '@/lib/api/client';

export interface ChatThread {
  id: string;
  userId: string;
  title: string;
  status: 'regular' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ChatHistoryMessage {
  id: string;
  userId: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  updated_at: string;
}

export function listChatThreads(): Promise<ChatThread[]> {
  return apiRequest<ChatThread[]>('/ai-chat-bot/threads');
}

export function listArchivedChatThreads(): Promise<ChatThread[]> {
  return apiRequest<ChatThread[]>('/ai-chat-bot/threads/archived');
}

export function createChatThread(title?: string): Promise<ChatThread> {
  return apiRequest<ChatThread>('/ai-chat-bot/threads', {
    method: 'POST',
    body: title ? { title } : {},
  });
}

export function renameChatThread(threadId: string, title: string): Promise<ChatThread> {
  return apiRequest<ChatThread>(`/ai-chat-bot/threads/${threadId}`, {
    method: 'PATCH',
    body: { title },
  });
}

export function archiveChatThread(threadId: string): Promise<ChatThread> {
  return apiRequest<ChatThread>(`/ai-chat-bot/threads/${threadId}/archive`, {
    method: 'POST',
  });
}

export function unarchiveChatThread(threadId: string): Promise<ChatThread> {
  return apiRequest<ChatThread>(`/ai-chat-bot/threads/${threadId}/unarchive`, {
    method: 'POST',
  });
}

export function deleteChatThread(threadId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/ai-chat-bot/threads/${threadId}`, {
    method: 'DELETE',
  });
}

export function getChatThreadMessages(threadId: string): Promise<ChatHistoryMessage[]> {
  return apiRequest<ChatHistoryMessage[]>(`/ai-chat-bot/threads/${threadId}/messages`);
}
