import { useThreadListNew } from '@assistant-ui/core/react';
import { useAui, useAuiEvent, useAuiState } from '@assistant-ui/store';
import { ActionBarPrimitive, ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from '@assistant-ui/react-native';
import { ArrowUp, Check, ChevronDown, Copy, Menu, MessageSquarePlus, Share2, Sparkles, Square } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clipboard,
  Keyboard,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  type FlatList,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
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

function ChatMessage({
  id,
  prevId,
  role,
  isLast,
  onMeasured,
}: {
  id: string;
  prevId: string | undefined;
  role: string;
  isLast: boolean;
  onMeasured: (id: string, prevId: string | undefined, height: number) => void;
}) {
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
      onLayout={(e) => onMeasured(id, prevId, e.nativeEvent.layout.height)}
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowAssistant,
        isLast && styles.lastMessageRow,
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
  const text = useColor('text');
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
          style={[styles.composerInput, { backgroundColor: card, color: text }]}
        />
      ) : (
        <ComposerPrimitive.Input
          placeholder='Ask anything…'
          placeholderTextColor={muted}
          multiline
          style={[styles.composerInput, { backgroundColor: card, color: text }]}
        />
      )}
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel style={[styles.sendButton, { backgroundColor: primary }]}>
          <Icon name={Square} size={16} color={primaryForeground} />
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send
          onPressIn={Keyboard.dismiss}
          style={[styles.sendButton, { backgroundColor: primary }]}
        >
          <Icon name={ArrowUp} size={18} color={primaryForeground} />
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
    </ComposerPrimitive.Root>
  );
}

const AT_BOTTOM_THRESHOLD = 24;

/**
 * ChatGPT-style scroll anchoring: when a new message is sent, the reply
 * doesn't get chased to the bottom of the screen as it streams in — instead
 * the user's message is pinned near the top (via `scrollToOffset`, computed
 * from heights each message reports through `onMeasured`) and a footer
 * spacer reserves the rest of the viewport for the reply to fill. If the
 * reply outgrows that reserved space the scroll position holds still (no
 * `autoScroll`) and a floating button appears so the user can jump down.
 */
export function ChatThreadView({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const flatListRef = useRef<FlatList | null>(null);
  const messages = useAuiState((s) => s.thread.messages);
  const heightsRef = useRef(new Map<string, number>());
  const offsetsRef = useRef(new Map<string, number>());
  const viewportHeightRef = useRef(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const foreground = useColor('foreground');
  const card = useColor('card');

  const messageIndexById = useMemo(() => {
    const map = new Map<string, number>();
    messages.forEach((message, index) => map.set(message.id, index));
    return map;
  }, [messages]);

  const handleMessageMeasured = useCallback(
    (id: string, prevId: string | undefined, height: number) => {
      heightsRef.current.set(id, height);
      if (!prevId) {
        offsetsRef.current.set(id, SPACING.md);
        return;
      }
      const prevOffset = offsetsRef.current.get(prevId);
      const prevHeight = heightsRef.current.get(prevId);
      if (prevOffset !== undefined && prevHeight !== undefined) {
        offsetsRef.current.set(id, prevOffset + prevHeight + SPACING.sm);
      }
    },
    []
  );

  useAuiEvent('thread.runStart', () => {
    // The user message that triggered this run was just added — its layout
    // hasn't landed yet, so wait a frame before reading measured heights.
    requestAnimationFrame(() => {
      const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
      const viewportHeight = viewportHeightRef.current;
      if (!lastUserMessage || !viewportHeight) return;

      const offset = offsetsRef.current.get(lastUserMessage.id);
      const height = heightsRef.current.get(lastUserMessage.id);
      if (offset === undefined || height === undefined) return;

      setFooterHeight(Math.max(0, viewportHeight - height));
      flatListRef.current?.scrollToOffset({ offset: Math.max(0, offset - SPACING.xs), animated: true });
    });
  });

  const scrollYRef = useRef(0);

  const handleListLayout = useCallback((e: LayoutChangeEvent) => {
    viewportHeightRef.current = e.nativeEvent.layout.height;
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    scrollYRef.current = contentOffset.y;
    const atBottom = contentSize.height - contentOffset.y - layoutMeasurement.height <= AT_BOTTOM_THRESHOLD;
    setIsAtBottom(atBottom);
  }, []);

  // A streaming reply grows the content without firing a scroll event, so
  // "am I still at the bottom" has to be re-derived here too — otherwise the
  // jump-to-bottom button wouldn't appear until the user next touched the list.
  const handleContentSizeChange = useCallback((_width: number, height: number) => {
    const viewportHeight = viewportHeightRef.current;
    if (!viewportHeight) return;
    const atBottom = height - scrollYRef.current - viewportHeight <= AT_BOTTOM_THRESHOLD;
    setIsAtBottom(atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  return (
    <ThreadPrimitive.Root style={styles.root}>
      <ChatHeader onOpenSidebar={onOpenSidebar} />

      <ThreadPrimitive.Empty>
        <ChatEmptyState />
      </ThreadPrimitive.Empty>

      <ThreadPrimitive.MessagesFlatList
        ref={flatListRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        autoScroll={false}
        scrollToBottomOnRunStart={false}
        scrollToBottomOnInitialize
        scrollToBottomOnThreadSwitch
        onLayout={handleListLayout}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        scrollEventThrottle={16}
        ListFooterComponent={<View style={{ height: footerHeight }} />}
      >
        {({ message }) => {
          const index = messageIndexById.get(message.id) ?? 0;
          const prevId = index > 0 ? messages[index - 1]?.id : undefined;
          return (
            <ChatMessage
              id={message.id}
              prevId={prevId}
              role={message.role}
              isLast={message.isLast}
              onMeasured={handleMessageMeasured}
            />
          );
        }}
      </ThreadPrimitive.MessagesFlatList>

      <View style={styles.composerWrap}>
        {!isAtBottom && (
          <Pressable
            onPress={scrollToBottom}
            style={[styles.scrollToBottomButton, { backgroundColor: card }]}
          >
            <Icon name={ChevronDown} size={20} color={foreground} />
          </Pressable>
        )}

        <ChatComposer />
      </View>

      <AvoidKeyboard fastHide />
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
  lastMessageRow: {
    marginBottom: SPACING.xl,
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
  composerWrap: {
    position: 'relative',
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: '100%',
    alignSelf: 'center',
    marginBottom: SPACING.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 10,
  },
});
