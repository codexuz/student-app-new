import { useThreadListNew } from '@assistant-ui/core/react';
import { useAui } from '@assistant-ui/store';
import { ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from '@assistant-ui/react-native';
import { ArrowUp, Menu, MessageSquarePlus, Sparkles, Square } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { BORDER_RADIUS, SPACING } from '@/theme/globals';

const STARTER_PROMPTS = [
  'Explain the difference between "affect" and "effect"',
  'Give me 5 IELTS speaking part 2 topics',
  'Quiz me on common phrasal verbs',
];

function ChatHeader({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const insets = useSafeAreaInsets();
  const foreground = useColor('foreground');
  const border = useColor('border');
  const { switchToNewThread } = useThreadListNew();

  return (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.xs, borderBottomColor: border }]}>
      <Pressable onPress={onOpenSidebar} hitSlop={8} style={styles.headerButton}>
        <Icon name={Menu} size={22} color={foreground} />
      </Pressable>

      <Text variant='body' style={{ fontWeight: '600' }}>
        AI Chat
      </Text>

      <Pressable onPress={() => switchToNewThread()} hitSlop={8} style={styles.headerButton}>
        <Icon name={MessageSquarePlus} size={22} color={foreground} />
      </Pressable>
    </View>
  );
}

function ChatMessage({ role }: { role: string }) {
  const isUser = role === 'user';
  const primary = useColor('primary');
  const card = useColor('card');
  const foreground = useColor('foreground');
  const primaryForeground = useColor('primaryForeground');

  return (
    <MessagePrimitive.Root
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowAssistant,
      ]}
    >
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: card }]}>
          <Icon name={Sparkles} size={16} color={foreground} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: primary, borderBottomRightRadius: 4 }
            : { backgroundColor: card, borderBottomLeftRadius: 4 },
        ]}
      >
        <MessagePrimitive.Content
          renderText={({ part, index }) => (
            <Text
              key={index}
              variant='body'
              style={isUser ? { color: primaryForeground } : undefined}
            >
              {part.text}
            </Text>
          )}
        />
      </View>
    </MessagePrimitive.Root>
  );
}

function StarterPrompt({ prompt }: { prompt: string }) {
  const aui = useAui();
  const border = useColor('border');
  const card = useColor('card');

  return (
    <Pressable
      style={[styles.starterChip, { borderColor: border, backgroundColor: card }]}
      onPress={() => {
        aui.composer.setText(prompt);
        aui.composer.send();
      }}
    >
      <Text variant='body' numberOfLines={2}>
        {prompt}
      </Text>
    </Pressable>
  );
}

function ChatEmptyState() {
  const primary = useColor('primary');

  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconBadge}>
        <Icon name={Sparkles} size={26} color={primary} />
      </View>
      <Text variant='title' style={{ textAlign: 'center', marginTop: SPACING.md }}>
        Ask your AI tutor
      </Text>
      <Text
        variant='caption'
        style={{ textAlign: 'center', marginTop: SPACING.xs, marginBottom: SPACING.lg }}
      >
        Grammar, vocabulary, IELTS prep — start with a question below.
      </Text>

      <View style={styles.starterList}>
        {STARTER_PROMPTS.map((prompt) => (
          <StarterPrompt key={prompt} prompt={prompt} />
        ))}
      </View>
    </View>
  );
}

function ChatComposer() {
  const border = useColor('border');
  const card = useColor('card');
  const primary = useColor('primary');
  const primaryForeground = useColor('primaryForeground');
  const muted = useColor('textMuted');
  const background = useColor('background');
  const insets = useSafeAreaInsets();

  return (
    <ComposerPrimitive.Root
      style={[
        styles.composer,
        { borderTopColor: border, backgroundColor: background, paddingBottom: insets.bottom + SPACING.sm },
      ]}
    >
      <ComposerPrimitive.Input
        placeholder='Ask anything…'
        placeholderTextColor={muted}
        multiline
        style={[styles.composerInput, { backgroundColor: card }]}
      />
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel style={[styles.sendButton, { backgroundColor: primary }]}>
          <Icon name={Square} size={16} color={primaryForeground} />
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send style={[styles.sendButton, { backgroundColor: primary }]}>
          <Icon name={ArrowUp} size={18} color={primaryForeground} />
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
    </ComposerPrimitive.Root>
  );
}

export function ChatThreadView({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <ThreadPrimitive.Root style={styles.root}>
      <ChatHeader onOpenSidebar={onOpenSidebar} />

      <ThreadPrimitive.Empty>
        <ChatEmptyState />
      </ThreadPrimitive.Empty>

      <ThreadPrimitive.MessagesFlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        autoScroll
        scrollToBottomOnRunStart
        scrollToBottomOnThreadSwitch
      >
        {({ message }) => <ChatMessage role={message.role} />}
      </ThreadPrimitive.MessagesFlatList>

      <ThreadPrimitive.If running>
        <View style={styles.typingRow}>
          <Spinner size='sm' />
          <Text variant='caption'>Thinking…</Text>
        </View>
      </ThreadPrimitive.If>

      <ChatComposer />
    </ThreadPrimitive.Root>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    padding: SPACING.xs,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 85, 248, 0.1)',
  },
  starterList: {
    width: '100%',
    gap: SPACING.sm,
  },
  starterChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BORDER_RADIUS,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerInput: {
    flex: 1,
    maxHeight: 120,
    borderRadius: BORDER_RADIUS,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
