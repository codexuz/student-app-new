import { useThreadListNew } from '@assistant-ui/core/react';
import { useAui, useAuiState } from '@assistant-ui/store';
import { ActionBarPrimitive, ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from '@assistant-ui/react-native';
import { ArrowUp, Check, Copy, Menu, MessageSquarePlus, Share2, Sparkles, Square } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Clipboard, Platform, Pressable, Share, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { MarkdownMessage } from '@/components/chat/markdown-message';
import { AvoidKeyboard } from '@/components/ui/avoid-keyboard';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { BORDER_RADIUS, SPACING } from '@/theme/globals';

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

function MessageActionBar() {
  const aui = useAui();
  const muted = useColor('textMuted');

  return (
    <View style={styles.actionBar}>
      <ActionBarPrimitive.Copy
        copyToClipboard={(text) => Clipboard.setString(text)}
        style={styles.actionButton}
        hitSlop={8}
      >
        {({ isCopied }) => <Icon name={isCopied ? Check : Copy} size={14} color={muted} />}
      </ActionBarPrimitive.Copy>

      <Pressable
        onPress={() => {
          const text = aui.message.getCopyText();
          if (text) Share.share({ message: text });
        }}
        style={styles.actionButton}
        hitSlop={8}
      >
        <Icon name={Share2} size={14} color={muted} />
      </Pressable>
    </View>
  );
}

/** One bouncing dot in the typing indicator; `delay` staggers it against its siblings. */
function TypingDot({ delay, color }: { delay: number; color: string }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) })
        ),
        -1
      )
    );
  }, [delay, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.typingDot, { backgroundColor: color }, animatedStyle]} />;
}

/** Shown in place of the bubble's content while the assistant is running but hasn't streamed any text yet. */
function TypingIndicator() {
  const muted = useColor('textMuted');

  return (
    <View style={styles.typingRow}>
      <TypingDot delay={0} color={muted} />
      <TypingDot delay={120} color={muted} />
      <TypingDot delay={240} color={muted} />
    </View>
  );
}

function ChatMessage({ role }: { role: string }) {
  const isUser = role === 'user';
  const primary = useColor('primary');
  const card = useColor('card');
  const foreground = useColor('foreground');
  const primaryForeground = useColor('primaryForeground');
  const isTyping = useAuiState(
    (s) =>
      s.message.role === 'assistant' &&
      s.message.status.type === 'running' &&
      s.message.content.length === 0
  );

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
      <View style={styles.bubbleColumn}>
        <View
          style={[
            styles.bubble,
            isUser
              ? { backgroundColor: primary, borderBottomRightRadius: 4 }
              : { backgroundColor: card, borderBottomLeftRadius: 4 },
          ]}
        >
          {isTyping ? (
            <TypingIndicator />
          ) : (
            <MessagePrimitive.Content
              renderText={({ part, index }) => (
                <MarkdownMessage
                  key={index}
                  content={part.text}
                  textColor={isUser ? primaryForeground : undefined}
                />
              )}
            />
          )}
        </View>

        {!isUser && !isTyping && <MessageActionBar />}
      </View>
    </MessagePrimitive.Root>
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
    </View>
  );
}

/**
 * assistant-ui's ComposerPrimitive.Input is a fully controlled TextInput
 * (value comes from the store and is re-applied on every keystroke). On
 * Android that round-trip causes visible cursor flicker/jumps while typing.
 * This mirrors it but stays uncontrolled locally, only pulling the store's
 * text back in when it changes from outside typing (send, starter prompts).
 */
function AndroidComposerInput(props: {
  placeholder: string;
  placeholderTextColor: string;
  style: object[];
}) {
  const aui = useAui();
  const storeText = useAuiState((s) => s.composer.text);
  const [localText, setLocalText] = useState(storeText);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      return;
    }
    setLocalText(storeText);
  }, [storeText]);

  return (
    <TextInput
      {...props}
      value={localText}
      onChangeText={(value) => {
        isTypingRef.current = true;
        setLocalText(value);
        aui.composer.setText(value);
      }}
      multiline
    />
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
      {Platform.OS === 'android' ? (
        <AndroidComposerInput
          placeholder='Ask anything…'
          placeholderTextColor={muted}
          style={[styles.composerInput, { backgroundColor: card }]}
        />
      ) : (
        <ComposerPrimitive.Input
          placeholder='Ask anything…'
          placeholderTextColor={muted}
          multiline
          style={[styles.composerInput, { backgroundColor: card }]}
        />
      )}
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

      <ChatComposer />

      <AvoidKeyboard />
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
  bubbleColumn: {
    maxWidth: '78%',
  },
  bubble: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS,
  },
  actionBar: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.xs / 2,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actionButton: {
    padding: SPACING.xs,
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
