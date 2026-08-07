import type { DrawerContentComponentProps } from 'expo-router/drawer';
import {
  useThreadListItemDelete,
  useThreadListItemTrigger,
  useThreadListNew,
} from '@assistant-ui/core/react';
import type { ThreadListItemState } from '@assistant-ui/core/store';
import { ThreadListItemPrimitive } from '@assistant-ui/react-native';
import { AuiProvider, Derived, useAui, useAuiState } from '@assistant-ui/store';
import { isToday, isYesterday } from 'date-fns';
import { MessageSquarePlus, PencilLine, Trash2 } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Pressable, SectionList, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { BORDER_RADIUS, SPACING } from '@/theme/globals';

type ThreadSection = { title: string; data: ThreadListItemState[] };

function groupThreadsByDate(threadItems: readonly ThreadListItemState[]): ThreadSection[] {
  const today: ThreadListItemState[] = [];
  const yesterday: ThreadListItemState[] = [];
  const previous7Days: ThreadListItemState[] = [];
  const older: ThreadListItemState[] = [];

  for (const item of threadItems) {
    // The empty "new chat" placeholder (status "new") has no backend
    // counterpart yet — it's the composer waiting for the first message,
    // not a saved conversation, and the runtime rejects deleting it.
    if (item.status === 'new') continue;

    const date = item.lastMessageAt;
    if (!date || isToday(date)) {
      today.push(item);
    } else if (isYesterday(date)) {
      yesterday.push(item);
    } else if (Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      previous7Days.push(item);
    } else {
      older.push(item);
    }
  }

  return [
    { title: 'Today', data: today },
    { title: 'Yesterday', data: yesterday },
    { title: 'Previous 7 days', data: previous7Days },
    { title: 'Older', data: older },
  ].filter((section) => section.data.length > 0);
}

/**
 * assistant-ui only ships ThreadListItemByIndexProvider, which resolves a
 * thread via `threadIds[index]` / `archivedThreadIds[index]` — positional
 * indices into those two separate id arrays. This sidebar instead reads
 * `s.threads.threadItems` (a combined regular+archived array, ordered by an
 * internal id-keyed map — NOT the same ordering/indices as threadIds) to
 * build date-grouped sections, so passing its array position into
 * ThreadListItemByIndexProvider resolved the wrong thread — or nothing at
 * all, throwing "key \"undefined\" not found". Looking the thread up by its
 * actual id sidesteps the index mismatch entirely.
 */
function ThreadListItemByIdProvider({ id, children }: { id: string; children: ReactNode }) {
  const aui = useAui({
    threadListItem: Derived({
      source: 'threads',
      query: { type: 'id', id },
      get: (client) => client.threads.item({ id }),
    }),
  });
  return <AuiProvider value={aui}>{children}</AuiProvider>;
}

function ThreadRow({ id, onOpen }: { id: string; onOpen: () => void }) {
  const [isPressed, setIsPressed] = useState(false);
  const isActive = useAuiState((s) => s.threads.mainThreadId === id);
  const foreground = useColor('foreground');
  const destructive = useColor('destructive');
  const muted = useColor('textMuted');
  const active = useColor('accent');
  const hover = useColor('muted');

  return (
    <ThreadListItemByIdProvider id={id}>
      <ThreadRowContent
        isActive={isActive}
        isPressed={isPressed}
        setIsPressed={setIsPressed}
        onOpen={onOpen}
        foreground={foreground}
        destructive={destructive}
        muted={muted}
        active={active}
        hover={hover}
      />
    </ThreadListItemByIdProvider>
  );
}

function ThreadRowContent({
  isActive,
  isPressed,
  setIsPressed,
  onOpen,
  foreground,
  destructive,
  muted,
  active,
  hover,
}: {
  isActive: boolean;
  isPressed: boolean;
  setIsPressed: (pressed: boolean) => void;
  onOpen: () => void;
  foreground: string;
  destructive: string;
  muted: string;
  active: string;
  hover: string;
}) {
  const { switchTo } = useThreadListItemTrigger();
  const { delete: deleteThread } = useThreadListItemDelete();

  const confirmDelete = () => {
    Alert.alert('Delete chat?', 'This conversation will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deleteThread },
    ]);
  };

  return (
    <Pressable
      onPress={() => {
        switchTo();
        onOpen();
      }}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[
        styles.row,
        { backgroundColor: isActive ? active : isPressed ? hover : 'transparent' },
      ]}
    >
      <Text variant='body' numberOfLines={1} style={[styles.rowTitle, { color: foreground }]}>
        <ThreadListItemPrimitive.Title fallback='New chat' />
      </Text>

      <Pressable onPress={confirmDelete} style={styles.rowAction} hitSlop={8}>
        <Icon name={Trash2} size={16} color={destructive ?? muted} />
      </Pressable>
    </Pressable>
  );
}

function NewThreadButton({ onOpen }: { onOpen: () => void }) {
  const { switchToNewThread } = useThreadListNew();
  const foreground = useColor('foreground');
  const border = useColor('border');

  return (
    <Pressable
      style={[styles.newButton, { borderColor: border }]}
      onPress={() => {
        switchToNewThread();
        onOpen();
      }}
    >
      <Icon name={MessageSquarePlus} size={18} color={foreground} />
      <Text variant='body' style={{ fontWeight: '600' }}>
        New chat
      </Text>
    </Pressable>
  );
}

/**
 * The drawer's content — a ChatGPT-style thread sidebar: date-grouped
 * sections, a highlighted active row, and a swipe/tap-hidden delete action.
 */
export function ChatThreadListSidebar({ navigation }: DrawerContentComponentProps) {
  const threadItems = useAuiState((s) => s.threads.threadItems);
  const muted = useColor('textMuted');
  const border = useColor('border');

  const sections = useMemo(() => groupThreadsByDate(threadItems), [threadItems]);
  const closeDrawer = () => navigation.closeDrawer();

  return (
    <View style={styles.root}>
      <View style={[styles.header, { borderBottomColor: border }]}>
        <NewThreadButton onOpen={closeDrawer} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <Text variant='caption' style={[styles.sectionHeader, { color: muted }]}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => <ThreadRow id={item.id} onOpen={closeDrawer} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name={PencilLine} size={22} color={muted} />
            <Text variant='caption' style={{ color: muted, textAlign: 'center', marginTop: SPACING.xs }}>
              No conversations yet
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    padding: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    height: 44,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listContent: {
    padding: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  sectionHeader: {
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm + 2,
  },
  rowTitle: {
    flex: 1,
  },
  rowAction: {
    padding: SPACING.xs,
  },
  empty: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
});
