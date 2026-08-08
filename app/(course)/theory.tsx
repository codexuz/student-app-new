import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { WebView } from 'react-native-webview';
import { Download } from 'lucide-react-native';

import { AudioPlayer } from '@/components/ui/audio-player';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { ApiError } from '@/lib/api/client';
import type { LessonContentBlock, LessonContentItem } from '@/lib/api/curriculum-types';
import { getLessonFull } from '@/lib/api/lessons';
import { SPACING } from '@/theme/globals';

function extractYouTubeId(url: string): string | null {
  const match = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/.exec(url);
  return match?.[1] ?? null;
}

function EmbedPlayer({ block }: { block: LessonContentBlock }) {
  const html = (() => {
    if (block.type === 'youtube_embed') {
      const id = extractYouTubeId(block.content) ?? block.content;
      return `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
    }
    if (block.content.includes('<iframe')) return block.content;
    if (block.type === 'iframe') {
      return `<iframe width="100%" height="100%" src="${block.content}" frameborder="0" allowfullscreen></iframe>`;
    }
    return `<video width="100%" height="100%" controls src="${block.content}"></video>`;
  })();

  return (
    <View style={styles.embed}>
      <WebView
        source={{ html: `<html><body style="margin:0">${html}</body></html>` }}
        style={{ backgroundColor: 'transparent' }}
        allowsFullscreenVideo
      />
    </View>
  );
}

function ContentBlockView({ block }: { block: LessonContentBlock }) {
  const text = useColor('text');

  switch (block.type) {
    case 'text':
      return (
        <Markdown style={{ body: { color: text, fontSize: 15, lineHeight: 22 } }}>
          {block.content}
        </Markdown>
      );
    case 'image':
      return <Image source={{ uri: block.content }} style={styles.image} resizeMode='contain' />;
    case 'audio':
      return <AudioPlayer url={block.content} />;
    case 'video':
    case 'youtube_embed':
    case 'iframe':
      return <EmbedPlayer block={block} />;
    default:
      return null;
  }
}

function TheorySection({ item }: { item: LessonContentItem }) {
  const primary = useColor('primary');

  return (
    <Card style={styles.section}>
      <Text variant='title'>{item.title}</Text>
      {item.content.map((block) => (
        <ContentBlockView key={block.id} block={block} />
      ))}

      {!!item.resources?.length && (
        <View style={styles.resources}>
          <Text variant='caption' style={{ fontWeight: '600' }}>
            Resources
          </Text>
          {item.resources.map((resource) => (
            <Pressable
              key={resource.id}
              onPress={() => Linking.openURL(resource.url)}
              style={styles.resourceRow}
            >
              <Icon name={Download} size={16} color={primary} />
              <Text variant='caption' style={{ color: primary }}>
                {resource.type.toUpperCase()} attachment
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Card>
  );
}

export default function TheoryScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const [items, setItems] = useState<LessonContentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) return;
    let isMounted = true;

    getLessonFull(lessonId)
      .then((data) => {
        if (isMounted) setItems(data.theory);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load theory content.');
      });

    return () => {
      isMounted = false;
    };
  }, [lessonId]);

  if (error) {
    return (
      <View style={styles.centerFill}>
        <Text variant='caption' style={{ textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (!items) {
    return (
      <View style={styles.centerFill}>
        <Spinner size='lg' />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      {items.map((item) => (
        <TheorySection key={item.id} item={item} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  section: {
    gap: SPACING.sm,
  },
  embed: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: SPACING.xs,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: SPACING.xs,
  },
  resources: {
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
});
