import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import Markdown from 'react-native-markdown-display';
import { WebView } from 'react-native-webview';
import { Download, FileSpreadsheet, FileText, Paperclip, Share2, StickyNote } from 'lucide-react-native';
import type { LucideProps } from 'lucide-react-native';

import { AudioHeroPlayer } from '@/components/lesson/audio-hero-player';
import { VideoHeroPlayer } from '@/components/lesson/video-hero-player';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { ApiError } from '@/lib/api/client';
import type { LessonContentBlock, LessonContentItem, LessonContentResource } from '@/lib/api/curriculum-types';
import { getLessonFull } from '@/lib/api/lessons';
import { withOpacity } from '@/theme/colors';
import { SPACING } from '@/theme/globals';

function fileNameFromUrl(url: string): string {
  try {
    const clean = url.split('?')[0].split('#')[0];
    const last = decodeURIComponent(clean.substring(clean.lastIndexOf('/') + 1));
    return last || 'Attachment';
  } catch {
    return 'Attachment';
  }
}

const RESOURCE_META: Record<
  LessonContentResource['type'],
  { color: string; label: string; icon: React.ComponentType<LucideProps>; mimeType: string }
> = {
  pdf: { color: '#DC2626', label: 'PDF', icon: FileText, mimeType: 'application/pdf' },
  doc: { color: '#2563EB', label: 'DOC', icon: FileText, mimeType: 'application/msword' },
  docx: {
    color: '#2563EB',
    label: 'DOCX',
    icon: FileText,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  excel: { color: '#16A34A', label: 'XLS', icon: FileSpreadsheet, mimeType: 'application/vnd.ms-excel' },
};

// Attachments are cached once under the app's own document directory (safe from
// the OS clearing it under storage pressure) so re-opening the same resource
// never re-downloads it — only the first tap hits the network.
const ATTACHMENTS_DIR = new Directory(Paths.document, 'lesson-attachments');

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
  const primary = useColor('primary');
  const secondary = useColor('secondary');

  switch (block.type) {
    case 'text':
      return (
        <Markdown
          style={{
            body: { color: text, fontSize: 15, lineHeight: 38 },
            blockquote: {
              backgroundColor: secondary,
              borderColor: primary,
              borderLeftWidth: 4,
              borderRadius: 0,
              marginLeft: 0,
              paddingHorizontal: SPACING.md,
              paddingVertical: SPACING.xs,
            },
            heading1: {
              color: text,
              fontSize: 28,
              fontWeight: '700',
              marginTop: SPACING.lg,
              marginBottom: SPACING.sm,
            },
            heading2: {
              color: text,
              fontSize: 24,
              fontWeight: '700',
              marginTop: SPACING.lg,
              marginBottom: SPACING.sm,
            },
            heading3: {
              color: text,
              fontSize: 19,
              fontWeight: '600',
              marginTop: SPACING.md,
              marginBottom: SPACING.xs,
            },
            heading4: {
              color: primary,
              fontSize: 16,
              fontWeight: '600',
              marginTop: SPACING.md,
              marginBottom: SPACING.xs,
            },
            heading5: {
              color: primary,
              fontSize: 14,
              fontWeight: '600',
              marginTop: SPACING.sm,
              marginBottom: SPACING.xs,
            },
            heading6: {
              color: primary,
              fontSize: 13,
              fontWeight: '600',
              marginTop: SPACING.sm,
              marginBottom: SPACING.xs,
            },
          }}
        >
          {block.content}
        </Markdown>
      );
    case 'image':
      return <Image source={{ uri: block.content }} style={styles.image} contentFit='contain' />;
    case 'audio':
      return <AudioHeroPlayer url={block.content} />;
    case 'video':
    case 'youtube_embed':
    case 'iframe':
      return <EmbedPlayer block={block} />;
    default:
      return null;
  }
}

function TabSegment({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ComponentType<LucideProps>;
  active: boolean;
  onPress: () => void;
}) {
  const card = useColor('card');
  const primary = useColor('primary');
  const muted = useColor('textMuted');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabSegment,
        active && [styles.tabSegmentActive, { backgroundColor: card }],
        pressed && { opacity: 0.75 },
      ]}
    >
      <Icon name={icon} size={15} color={active ? primary : muted} />
      <Text
        style={[styles.tabSegmentText, { color: active ? primary : muted, fontWeight: active ? '700' : '600' }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TabSegmentedControl({
  tab,
  onChange,
}: {
  tab: 'notes' | 'attachment';
  onChange: (tab: 'notes' | 'attachment') => void;
}) {
  const track = useColor('secondary');

  return (
    <View style={[styles.tabTrack, { backgroundColor: track }]}>
      <TabSegment label='Notes' icon={StickyNote} active={tab === 'notes'} onPress={() => onChange('notes')} />
      <TabSegment
        label='Attachment'
        icon={Paperclip}
        active={tab === 'attachment'}
        onPress={() => onChange('attachment')}
      />
    </View>
  );
}

function AttachmentRow({ resource }: { resource: LessonContentResource }) {
  const card = useColor('card');
  const text = useColor('text');
  const { toast } = useToast();
  const meta = RESOURCE_META[resource.type];
  const name = fileNameFromUrl(resource.url);

  // Namespaced by resource id so two attachments that happen to share a
  // filename (e.g. two lessons' "worksheet.pdf") don't collide on disk.
  const localFile = useMemo(() => new File(ATTACHMENTS_DIR, `${resource.id}-${name}`), [resource.id, name]);
  const [isSaved, setIsSaved] = useState(() => localFile.exists);
  const [isBusy, setIsBusy] = useState(false);

  const handlePress = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      if (!localFile.exists) {
        if (!ATTACHMENTS_DIR.exists) {
          ATTACHMENTS_DIR.create({ intermediates: true });
        }
        await File.downloadFileAsync(resource.url, localFile, { idempotent: true });
        setIsSaved(true);
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localFile.uri, { mimeType: meta.mimeType, dialogTitle: name });
      } else {
        toast({ variant: 'success', title: 'Saved', description: `${name} saved on this device.` });
      }
    } catch {
      toast({ variant: 'error', title: 'Error', description: `Couldn't save ${name}. Try again.` });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isBusy}
      style={({ pressed }) => [styles.attachmentRow, { backgroundColor: card }, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.attachmentIcon, { backgroundColor: withOpacity(meta.color, 0.12) }]}>
        <Icon name={meta.icon} size={20} color={meta.color} />
        <View style={[styles.attachmentBadge, { backgroundColor: meta.color, borderColor: card }]}>
          <Text style={styles.attachmentBadgeText}>{meta.label}</Text>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.attachmentName, { color: text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text variant='caption' style={{ color: meta.color, fontWeight: '600' }}>
          {isSaved ? 'Saved · tap to share' : `${meta.label} document`}
        </Text>
      </View>
      <View style={[styles.attachmentDownload, { backgroundColor: withOpacity(meta.color, 0.12) }]}>
        {isBusy ? (
          <ActivityIndicator size='small' color={meta.color} />
        ) : (
          <Icon name={isSaved ? Share2 : Download} size={16} color={meta.color} />
        )}
      </View>
    </Pressable>
  );
}

function TheorySection({ item }: { item: LessonContentItem }) {
  const heroBlock =
    item.content.find((b) => b.type === 'video') ?? item.content.find((b) => b.type === 'audio');
  const restBlocks = item.content.filter((b) => b !== heroBlock);
  const hasNotes = restBlocks.length > 0;
  const hasAttachments = !!item.resources?.length;
  const showTabs = hasNotes && hasAttachments;

  const [tab, setTab] = useState<'notes' | 'attachment'>(hasNotes ? 'notes' : 'attachment');
  const showNotes = hasNotes && (!showTabs || tab === 'notes');
  const showAttachments = hasAttachments && (!showTabs || tab === 'attachment');

  return (
    <View style={styles.section}>
      {(!heroBlock || heroBlock.type === 'audio') && <Text variant='title'>{item.title}</Text>}

      {heroBlock?.type === 'video' && <VideoHeroPlayer title={item.title} url={heroBlock.content} />}
      {heroBlock?.type === 'audio' && <AudioHeroPlayer url={heroBlock.content} />}

      {showTabs && <TabSegmentedControl tab={tab} onChange={setTab} />}

      {showNotes && (
        <View style={styles.notesBlock}>
          {restBlocks.map((block) => (
            <ContentBlockView key={block.id} block={block} />
          ))}
        </View>
      )}

      {showAttachments && (
        <View style={styles.attachmentBlock}>
          <Text variant='caption' style={styles.attachmentHeading}>
            Attachment File
          </Text>
          {item.resources!.map((resource) => (
            <AttachmentRow key={resource.id} resource={resource} />
          ))}
        </View>
      )}
    </View>
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
    gap: SPACING.xl,
    padding: SPACING.lg,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  section: {
    gap: SPACING.md,
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

  // Tabs — a segmented control: one rounded track, active segment raised on
  // its own card-colored chip with a soft shadow (rather than two loose,
  // independently-outlined pills).
  tabTrack: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabSegmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 0.5,
  },
  tabSegmentText: {
    fontSize: 13.5,
  },

  notesBlock: {
    gap: SPACING.md,
  },

  // Attachment list
  attachmentBlock: {
    gap: SPACING.sm,
  },
  attachmentHeading: {
    fontWeight: '600',
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 0.8,
  },
  attachmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentBadge: {
    position: 'absolute',
    bottom: -4,
    right: -6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  attachmentBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '600',
  },
  attachmentDownload: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
