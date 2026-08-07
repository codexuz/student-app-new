import { useNavigation } from 'expo-router';

import { ChatThreadView } from '@/components/chat/chat-thread-view';

/**
 * Shows whichever thread is currently active on the shared runtime — set by
 * the sidebar (in _layout.tsx's drawerContent) just before closing itself.
 */
export default function AiChatThreadScreen() {
  const navigation = useNavigation();

  return (
    <ChatThreadView
      onOpenSidebar={() => {
        // openDrawer() isn't on expo-router's generic NavigationProp type
        // (it only exists for screens actually mounted inside a Drawer),
        // but this screen always is — see _layout.tsx.
        (navigation as unknown as { openDrawer: () => void }).openDrawer();
      }}
    />
  );
}
