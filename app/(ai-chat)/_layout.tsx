import { Drawer } from 'expo-router/drawer';

import { ChatThreadListSidebar } from '@/components/chat/chat-thread-list';
import { useColor } from '@/hooks/useColor';
import { AiChatProvider } from '@/providers/ai-chat-provider';

/**
 * One AiChatProvider (one assistant-ui runtime instance) wraps the whole
 * drawer — the sidebar and the chat screen both read it, so switching
 * threads from the sidebar is immediately visible in the chat screen.
 *
 * The thread list lives in `drawerContent` instead of being a separate
 * route: on phones there's no room for ChatGPT's persistent side-by-side
 * sidebar, so it slides in over the chat screen instead (drawerType: 'front').
 */
export default function AiChatLayout() {
  const background = useColor('background');

  return (
    <AiChatProvider>
      <Drawer
        screenOptions={{
          headerShown: false,
          drawerType: 'front',
          drawerStyle: { width: '84%', maxWidth: 320, backgroundColor: background },
          overlayColor: 'rgba(0,0,0,0.4)',
        }}
        drawerContent={(props) => <ChatThreadListSidebar {...props} />}
      >
        <Drawer.Screen name='chat' />
      </Drawer>
    </AiChatProvider>
  );
}
