import { AssistantRuntimeProvider } from '@assistant-ui/react-native';

import { useAiChatRuntime } from '@/lib/chat/use-ai-chat-runtime';

/** Wraps the AI chat screens with the assistant-ui runtime (threads + streaming). */
export function AiChatProvider({ children }: { children: React.ReactNode }) {
  const runtime = useAiChatRuntime();

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
